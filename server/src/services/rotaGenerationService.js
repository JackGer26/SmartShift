const Staff = require('../models/Staff');
const TimeOff = require('../models/TimeOff');
const ShiftTemplate = require('../models/ShiftTemplate');
const RotaWeek = require('../models/RotaWeek');
const { getWeekStart, getWeekEnd, getWeekDates, getDayName, calculateShiftDuration } = require('../utils/dateUtils');

/**
 * Rota Generation Service
 * Handles the automatic generation of weekly rotas based on shift templates and staff availability
 */
class RotaGenerationService {
  /**
   * Generate a rota for a specific week
   * @param {Date} weekStartDate - Monday of the week to generate
   * @returns {Promise<Object>} - Generated rota week data
   */
  async generateWeeklyRota(weekStartDate) {
    try {
      // Ensure we start on a Monday
      const mondayDate = getWeekStart(weekStartDate);
      const sundayDate = getWeekEnd(mondayDate);

      // Check if rota already exists for this week
      const existingRota = await RotaWeek.findOne({ weekStartDate: mondayDate });
      if (existingRota) {
        throw new Error('Rota already exists for this week');
      }

      // Get all active shift templates
      const shiftTemplates = await ShiftTemplate.find({ isActive: true }).sort({ priority: -1 });
      
      // Get all active staff
      const allStaff = await Staff.find({ isActive: true });
      
      // Get time off requests for this week
      const timeOffRequests = await TimeOff.find({
        status: 'approved',
        $or: [
          { startDate: { $lte: sundayDate }, endDate: { $gte: mondayDate } }
        ]
      }).populate('staffId');

      // Get week dates
      const weekDates = getWeekDates(mondayDate);
      
      // Generate shifts for each day
      const generatedShifts = [];
      let totalHours = 0;
      let totalCost = 0;

      for (const date of weekDates) {
        const dayName = getDayName(date);
        const dayTemplates = shiftTemplates.filter(template => template.dayOfWeek === dayName);
        
        for (const template of dayTemplates) {
          // Find available staff for this shift
          const availableStaff = this.findAvailableStaff(
            allStaff,
            template,
            date,
            timeOffRequests,
            generatedShifts
          );

          // Assign staff to shifts
          const assignedShifts = this.assignStaffToShift(
            availableStaff,
            template,
            date
          );

          generatedShifts.push(...assignedShifts);

          // Calculate totals
          for (const shift of assignedShifts) {
            const shiftHours = calculateShiftDuration(shift.startTime, shift.endTime);
            const staffMember = allStaff.find(s => s._id.equals(shift.staffId));
            totalHours += shiftHours;
            totalCost += shiftHours * staffMember.hourlyRate;
          }
        }
      }

      // Create and save the rota week
      const rotaWeek = new RotaWeek({
        weekStartDate: mondayDate,
        weekEndDate: sundayDate,
        shifts: generatedShifts,
        totalStaffHours: Math.round(totalHours * 100) / 100, // Round to 2 decimal places
        totalLaborCost: Math.round(totalCost * 100) / 100,
        status: 'draft'
      });

      await rotaWeek.save();
      await rotaWeek.populate('shifts.staffId shifts.shiftTemplateId');

      return rotaWeek;
    } catch (error) {
      throw new Error(`Rota generation failed: ${error.message}`);
    }
  }

  /**
   * Find staff available for a specific shift
   * @param {Array} allStaff - All active staff members
   * @param {Object} shiftTemplate - The shift template
   * @param {Date} date - The date of the shift
   * @param {Array} timeOffRequests - Approved time off requests
   * @param {Array} existingShifts - Already assigned shifts
   * @returns {Array} - Available staff members
   */
  findAvailableStaff(allStaff, shiftTemplate, date, timeOffRequests, existingShifts) {
    const dayName = getDayName(date);
    
    return allStaff.filter(staff => {
      // Check if staff has the required role
      if (staff.role !== shiftTemplate.requiredRole) {
        return false;
      }

      // Check if staff is available on this day
      if (!staff.availableDays.includes(dayName)) {
        return false;
      }

      // Check if staff has time off on this date
      const hasTimeOff = timeOffRequests.some(timeOff => {
        return timeOff.staffId._id.equals(staff._id) &&
               date >= new Date(timeOff.startDate) &&
               date <= new Date(timeOff.endDate);
      });

      if (hasTimeOff) {
        return false;
      }

      // Check if staff already has a shift on this date that conflicts
      const hasConflictingShift = existingShifts.some(shift => {
        if (!shift.staffId.equals(staff._id)) {
          return false;
        }

        const shiftDate = new Date(shift.date);
        if (shiftDate.toDateString() !== date.toDateString()) {
          return false;
        }

        // Check for time overlap
        return this.shiftsOverlap(
          shiftTemplate.startTime,
          shiftTemplate.endTime,
          shift.startTime,
          shift.endTime
        );
      });

      if (hasConflictingShift) {
        return false;
      }

      // Check weekly hour limits
      const weeklyHours = this.calculateWeeklyHours(staff._id, existingShifts);
      const shiftHours = calculateShiftDuration(shiftTemplate.startTime, shiftTemplate.endTime);
      
      if (weeklyHours + shiftHours > staff.maxHoursPerWeek) {
        return false;
      }

      return true;
    });
  }

  /**
   * Assign staff to a shift based on the template requirements
   * @param {Array} availableStaff - Staff available for this shift
   * @param {Object} shiftTemplate - The shift template
   * @param {Date} date - The date of the shift
   * @returns {Array} - Array of shift assignments
   */
  assignStaffToShift(availableStaff, shiftTemplate, date) {
    const assignments = [];
    const requiredCount = Math.min(shiftTemplate.staffCount, availableStaff.length);

    // For now, use a simple assignment strategy (first available)
    // In a more sophisticated system, this could consider:
    // - Staff preferences
    // - Seniority
    // - Performance ratings
    // - Rotation fairness

    for (let i = 0; i < requiredCount; i++) {
      const staff = availableStaff[i];
      
      assignments.push({
        staffId: staff._id,
        shiftTemplateId: shiftTemplate._id,
        date: date,
        startTime: shiftTemplate.startTime,
        endTime: shiftTemplate.endTime,
        status: 'scheduled'
      });
    }

    return assignments;
  }

  /**
   * Check if two shifts have overlapping times
   * @param {string} start1 - Start time of first shift (HH:MM)
   * @param {string} end1 - End time of first shift (HH:MM)
   * @param {string} start2 - Start time of second shift (HH:MM)
   * @param {string} end2 - End time of second shift (HH:MM)
   * @returns {boolean} - True if shifts overlap
   */
  shiftsOverlap(start1, end1, start2, end2) {
    const start1Minutes = this.timeToMinutes(start1);
    const end1Minutes = this.timeToMinutes(end1);
    const start2Minutes = this.timeToMinutes(start2);
    const end2Minutes = this.timeToMinutes(end2);

    return start1Minutes < end2Minutes && start2Minutes < end1Minutes;
  }

  /**
   * Calculate total weekly hours for a staff member
   * @param {string} staffId - Staff member ID
   * @param {Array} existingShifts - Already assigned shifts
   * @returns {number} - Total weekly hours
   */
  calculateWeeklyHours(staffId, existingShifts) {
    return existingShifts
      .filter(shift => shift.staffId.equals(staffId))
      .reduce((total, shift) => {
        return total + calculateShiftDuration(shift.startTime, shift.endTime);
      }, 0);
  }

  /**
   * Convert time string to minutes since midnight
   * @param {string} timeStr - Time in HH:MM format
   * @returns {number} - Minutes since midnight
   */
  timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }
}

module.exports = new RotaGenerationService();