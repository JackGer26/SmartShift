const { ValidationError } = require('../utils/errors');
const Staff = require('../models/Staff');
const TimeOff = require('../models/TimeOff');
const { CONSTRAINTS } = require('../models/constants');
const { calculateShiftDuration, getDayName } = require('../utils/dateUtils');

/**
 * Hard Constraint Validation System
 * 
 * Enforces business rules that cannot be violated when assigning staff to shifts.
 * These are mandatory constraints that will prevent assignment if violated.
 * 
 * Hard Constraints:
 * 1. ✅ Approved time off blocks scheduling
 * 2. ✅ Role qualification enforced  
 * 3. ✅ Availability window enforced
 * 4. ✅ Max hours/week enforced or flagged
 * 5. ✅ Basic age-based restriction (MVP+)
 */
class HardConstraintValidator {
  
  /**
   * Validate all hard constraints for a staff assignment
   * @param {Object} assignment - { staffId, shiftId, shiftDate, startTime, endTime, requiredRole }
   * @param {Object} context - { existingAssignments, staffHourTracker }
   * @returns {Promise<Object>} - { isValid, violations, warnings }
   */
  static async validateStaffAssignment(assignment, context = {}) {
    const violations = [];
    const warnings = [];
    
    try {
      // Get staff member details
      const staff = await Staff.findById(assignment.staffId).lean();
      if (!staff) {
        violations.push({
          type: 'STAFF_NOT_FOUND',
          message: 'Staff member not found',
          severity: 'error'
        });
        return { isValid: false, violations, warnings };
      }

      // Check if staff is active
      if (!staff.isActive) {
        violations.push({
          type: 'STAFF_INACTIVE',
          message: `${staff.name} is currently inactive and cannot be assigned shifts`,
          severity: 'error'
        });
      }

      // 1. Check approved time off blocks
      const timeOffViolation = await this.validateTimeOffConstraint(staff, assignment);
      if (timeOffViolation) violations.push(timeOffViolation);

      // 2. Check role qualification
      const roleViolation = this.validateRoleQualification(staff, assignment);
      if (roleViolation) violations.push(roleViolation);

      // 3. Check availability window
      const availabilityViolation = this.validateAvailabilityWindow(staff, assignment);
      if (availabilityViolation) violations.push(availabilityViolation);

      // 4. Check max hours per week
      const hourViolation = this.validateMaxHoursConstraint(staff, assignment, context.staffHourTracker);
      if (hourViolation) {
        if (hourViolation.severity === 'error') {
          violations.push(hourViolation);
        } else {
          warnings.push(hourViolation);
        }
      }

      // 5. Check age-based restrictions (MVP+)
      const ageViolation = await this.validateAgeRestrictions(staff, assignment);
      if (ageViolation) violations.push(ageViolation);

      // 6. Check shift conflicts
      const conflictViolation = this.validateShiftConflicts(staff, assignment, context.existingAssignments);
      if (conflictViolation) violations.push(conflictViolation);

      // 7. Check shift duration limits
      const durationViolation = this.validateShiftDuration(assignment);
      if (durationViolation) violations.push(durationViolation);

      return {
        isValid: violations.length === 0,
        violations,
        warnings,
        staffName: staff.name
      };

    } catch (error) {
      violations.push({
        type: 'VALIDATION_ERROR',
        message: `Validation failed: ${error.message}`,
        severity: 'error'
      });
      
      return { isValid: false, violations, warnings };
    }
  }

  /**
   * 1. APPROVED TIME OFF BLOCKS SCHEDULING
   * Ensures staff cannot be assigned to shifts during approved time off
   */
  static async validateTimeOffConstraint(staff, assignment) {
    try {
      const timeOffRequests = await TimeOff.find({
        staffId: staff._id,
        status: 'approved',
        $or: [
          {
            // Single day time off that includes the shift date
            startDate: { $lte: assignment.shiftDate },
            endDate: { $gte: assignment.shiftDate }
          },
          {
            // Multi-day time off that spans the shift date
            startDate: { $lte: assignment.shiftDate },
            endDate: { $gte: assignment.shiftDate }
          }
        ]
      });

      if (timeOffRequests.length > 0) {
        const timeOff = timeOffRequests[0];
        const startDate = new Date(timeOff.startDate).toLocaleDateString();
        const endDate = new Date(timeOff.endDate).toLocaleDateString();
        
        return {
          type: 'TIME_OFF_CONFLICT',
          message: `${staff.name} has approved time off from ${startDate} to ${endDate} (${timeOff.reason})`,
          severity: 'error',
          details: {
            timeOffId: timeOff._id,
            startDate: timeOff.startDate,
            endDate: timeOff.endDate,
            reason: timeOff.reason
          }
        };
      }

      return null;
    } catch (error) {
      return {
        type: 'TIME_OFF_CHECK_ERROR',
        message: `Unable to verify time off status: ${error.message}`,
        severity: 'error'
      };
    }
  }

  /**
   * 2. ROLE QUALIFICATION ENFORCED
   * Ensures only qualified staff are assigned to role-specific shifts
   */
  static validateRoleQualification(staff, assignment) {
    if (staff.role !== assignment.requiredRole) {
      return {
        type: 'ROLE_QUALIFICATION_MISMATCH',
        message: `${staff.name} is a ${staff.role}, but this shift requires a ${assignment.requiredRole}`,
        severity: 'error',
        details: {
          staffRole: staff.role,
          requiredRole: assignment.requiredRole
        }
      };
    }
    return null;
  }

  /**
   * 3. AVAILABILITY WINDOW ENFORCED
   * Ensures staff are only assigned shifts on their available days
   */
  static validateAvailabilityWindow(staff, assignment) {
    const shiftDay = getDayName(assignment.shiftDate).toLowerCase();
    
    if (!staff.availableDays || !staff.availableDays.includes(shiftDay)) {
      const availableDaysText = staff.availableDays?.join(', ') || 'none specified';
      
      return {
        type: 'AVAILABILITY_WINDOW_VIOLATION',
        message: `${staff.name} is not available on ${shiftDay}s. Available days: ${availableDaysText}`,
        severity: 'error',
        details: {
          shiftDay,
          staffAvailableDays: staff.availableDays
        }
      };
    }
    return null;
  }

  /**
   * 4. MAX HOURS/WEEK ENFORCED OR FLAGGED
   * Prevents overallocation or flags potential overtime
   */
  static validateMaxHoursConstraint(staff, assignment, staffHourTracker) {
    const shiftDuration = calculateShiftDuration(assignment.startTime, assignment.endTime);
    const currentHours = staffHourTracker?.[staff._id.toString()]?.scheduledHours || 0;
    const projectedHours = currentHours + shiftDuration;
    const maxHours = staff.maxHoursPerWeek || CONSTRAINTS.DEFAULT_HOURS_PER_WEEK;

    // Hard limit: Enforce legal maximum (60 hours in UK)
    if (projectedHours > CONSTRAINTS.MAX_HOURS_PER_WEEK) {
      return {
        type: 'LEGAL_HOUR_LIMIT_EXCEEDED',
        message: `${staff.name} would work ${projectedHours.toFixed(1)} hours, exceeding legal limit of ${CONSTRAINTS.MAX_HOURS_PER_WEEK} hours`,
        severity: 'error',
        details: {
          currentHours,
          shiftDuration,
          projectedHours,
          legalLimit: CONSTRAINTS.MAX_HOURS_PER_WEEK
        }
      };
    }

    // Soft warning: Flag potential overtime
    if (projectedHours > maxHours) {
      const overtimeHours = projectedHours - maxHours;
      return {
        type: 'OVERTIME_WARNING',
        message: `${staff.name} would work ${projectedHours.toFixed(1)} hours (${overtimeHours.toFixed(1)}h overtime). Contracted: ${maxHours}h`,
        severity: 'warning',
        details: {
          currentHours,
          shiftDuration,
          projectedHours,
          contractedHours: maxHours,
          overtimeHours
        }
      };
    }

    return null;
  }

  /**
   * 5. BASIC AGE-BASED RESTRICTION (MVP+)
   * Enforces age-related working restrictions (e.g., minors, late shifts)
   */
  static async validateAgeRestrictions(staff, assignment) {
    // Calculate age if date of birth is available
    if (!staff.dateOfBirth) {
      // No age restriction if DOB not provided (MVP approach)
      return null;
    }

    const age = Math.floor((new Date() - new Date(staff.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
    const shiftStartHour = parseInt(assignment.startTime.split(':')[0]);
    const shiftEndHour = parseInt(assignment.endTime.split(':')[0]);

    // Under 18 restrictions (UK employment law)
    if (age < 18) {
      // No work before 6 AM or after 10 PM for under 18s
      if (shiftStartHour < 6 || shiftEndHour > 22) {
        return {
          type: 'AGE_RESTRICTION_VIOLATION',
          message: `${staff.name} (age ${age}) cannot work shifts starting before 6:00 AM or ending after 10:00 PM`,
          severity: 'error',
          details: {
            age,
            shiftStart: assignment.startTime,
            shiftEnd: assignment.endTime,
            restriction: 'Under 18 - limited hours'
          }
        };
      }

      // Maximum 8 hours per day for under 18s
      const shiftDuration = calculateShiftDuration(assignment.startTime, assignment.endTime);
      if (shiftDuration > 8) {
        return {
          type: 'AGE_SHIFT_DURATION_VIOLATION',
          message: `${staff.name} (age ${age}) cannot work shifts longer than 8 hours. This shift is ${shiftDuration.toFixed(1)} hours`,
          severity: 'error',
          details: {
            age,
            shiftDuration,
            maxDuration: 8,
            restriction: 'Under 18 - maximum 8 hour shifts'
          }
        };
      }
    }

    return null;
  }

  /**
   * 6. SHIFT CONFLICTS
   * Prevents double-booking staff for overlapping shifts
   */
  static validateShiftConflicts(staff, assignment, existingAssignments = []) {
    const shiftDate = assignment.shiftDate.toDateString();
    
    const conflictingShifts = existingAssignments.filter(existing => {
      // Handle both populated (object with _id) and non-populated (ObjectId) staffId
      const existingStaffId = existing.staffId._id ? existing.staffId._id.toString() : existing.staffId.toString();
      return existingStaffId === staff._id.toString() &&
             existing.date.toDateString() === shiftDate &&
             this.shiftsOverlap(
               existing.startTime, existing.endTime,
               assignment.startTime, assignment.endTime
             );
    });

    if (conflictingShifts.length > 0) {
      const conflict = conflictingShifts[0];
      return {
        type: 'SHIFT_CONFLICT',
        message: `${staff.name} already has a shift from ${conflict.startTime} to ${conflict.endTime} on ${shiftDate}`,
        severity: 'error',
        details: {
          existingShift: {
            startTime: conflict.startTime,
            endTime: conflict.endTime,
            date: conflict.date
          },
          newShift: {
            startTime: assignment.startTime,
            endTime: assignment.endTime,
            date: assignment.shiftDate
          }
        }
      };
    }

    return null;
  }

  /**
   * 7. SHIFT DURATION LIMITS
   * Enforces reasonable shift duration limits
   */
  static validateShiftDuration(assignment) {
    const duration = calculateShiftDuration(assignment.startTime, assignment.endTime);
    
    // Minimum shift duration (e.g., 2 hours)
    if (duration < 2) {
      return {
        type: 'SHIFT_TOO_SHORT',
        message: `Shift duration of ${duration.toFixed(1)} hours is below minimum of 2 hours`,
        severity: 'error',
        details: { duration, minimum: 2 }
      };
    }

    // Maximum shift duration (e.g., 12 hours)
    if (duration > 12) {
      return {
        type: 'SHIFT_TOO_LONG',
        message: `Shift duration of ${duration.toFixed(1)} hours exceeds maximum of 12 hours`,
        severity: 'error',
        details: { duration, maximum: 12 }
      };
    }

    return null;
  }

  /**
   * Batch validate multiple assignments
   */
  static async validateMultipleAssignments(assignments, context = {}) {
    const results = [];
    
    for (const assignment of assignments) {
      const result = await this.validateStaffAssignment(assignment, context);
      results.push({
        assignment,
        validation: result
      });
    }

    const summary = {
      total: results.length,
      valid: results.filter(r => r.validation.isValid).length,
      violations: results.filter(r => !r.validation.isValid).length,
      warnings: results.reduce((sum, r) => sum + r.validation.warnings.length, 0),
      results
    };

    return summary;
  }

  /**
   * Utility: Check if two time ranges overlap
   */
  static shiftsOverlap(start1, end1, start2, end2) {
    const timeToMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const start1Minutes = timeToMinutes(start1);
    const end1Minutes = timeToMinutes(end1);
    const start2Minutes = timeToMinutes(start2);
    const end2Minutes = timeToMinutes(end2);

    return start1Minutes < end2Minutes && start2Minutes < end1Minutes;
  }

  /**
   * Get constraint configuration
   */
  static getConstraintConfig() {
    return {
      timeOffEnforcement: true,
      roleQualificationEnforcement: true,
      availabilityEnforcement: true,
      maxHoursEnforcement: true,
      ageRestrictionsEnabled: false, // MVP+ feature
      minimumShiftDuration: 2,
      maximumShiftDuration: 12,
      legalMaxWeeklyHours: CONSTRAINTS.MAX_HOURS_PER_WEEK,
      under18WorkingHours: { earliest: '06:00', latest: '22:00', maxDailyHours: 8 }
    };
  }

  /**
   * Validate rota-wide constraints
   */
  static async validateRotaConstraints(rotaId, shifts) {
    const violations = [];
    const warnings = [];

    // Group shifts by staff
    const staffShifts = {};
    shifts.forEach(shift => {
      if (!shift.staffId) return;
      // Handle both populated (object with _id) and non-populated (ObjectId) staffId
      const staffId = shift.staffId._id ? shift.staffId._id.toString() : shift.staffId.toString();
      if (!staffShifts[staffId]) staffShifts[staffId] = [];
      staffShifts[staffId].push(shift);
    });

    // Check weekly hour limits for each staff member
    for (const [staffId, staffShiftList] of Object.entries(staffShifts)) {
      const staff = await Staff.findById(staffId);
      if (!staff) continue;

      const totalHours = staffShiftList.reduce((sum, shift) => {
        return sum + calculateShiftDuration(shift.startTime, shift.endTime);
      }, 0);

      if (totalHours > CONSTRAINTS.MAX_HOURS_PER_WEEK) {
        violations.push({
          type: 'WEEKLY_HOUR_LIMIT_EXCEEDED',
          staffId,
          staffName: staff.name,
          totalHours: totalHours.toFixed(1),
          limit: CONSTRAINTS.MAX_HOURS_PER_WEEK,
          message: `${staff.name} scheduled for ${totalHours.toFixed(1)} hours, exceeding legal limit`
        });
      } else if (totalHours > (staff.maxHoursPerWeek || CONSTRAINTS.DEFAULT_HOURS_PER_WEEK)) {
        warnings.push({
          type: 'CONTRACTED_HOUR_EXCEEDED',
          staffId,
          staffName: staff.name,
          totalHours: totalHours.toFixed(1),
          contractedHours: staff.maxHoursPerWeek || CONSTRAINTS.DEFAULT_HOURS_PER_WEEK,
          message: `${staff.name} scheduled for overtime: ${totalHours.toFixed(1)}h vs ${staff.maxHoursPerWeek || CONSTRAINTS.DEFAULT_HOURS_PER_WEEK}h contracted`
        });
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
      warnings,
      summary: {
        staffChecked: Object.keys(staffShifts).length,
        shiftsValidated: shifts.length,
        violationsFound: violations.length,
        warningsFound: warnings.length
      }
    };
  }
}

module.exports = HardConstraintValidator;