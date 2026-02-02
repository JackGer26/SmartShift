const Staff = require('../models/Staff');
const TimeOff = require('../models/TimeOff');
const ShiftTemplate = require('../models/ShiftTemplate');
const RotaWeek = require('../models/RotaWeek');
const { getWeekStart, getWeekEnd, getWeekDates, getDayName, calculateShiftDuration } = require('../utils/dateUtils');

/**
 * Advanced Rota Generation Service
 * 
 * Implements a comprehensive scheduling algorithm that handles:
 * - Hard constraints (availability, time off, role requirements)
 * - Soft preferences (fair distribution, seniority, preferences)
 * - Hour tracking and limit enforcement
 * - Conflict detection and resolution
 */
class RotaGenerationService {
  constructor() {
    this.debug = false; // Set to true for detailed logging
  }

  /**
   * Generate a comprehensive rota for a specific week
   * @param {Date} weekStartDate - Monday of the week to generate
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - Generated rota with analysis
   */
  async generateWeeklyRota(weekStartDate, options = {}) {
    const startTime = Date.now();
    this.log('🚀 Starting rota generation...');

    try {
      // 1. Initialize week and validation
      const mondayDate = getWeekStart(weekStartDate);
      const sundayDate = getWeekEnd(mondayDate);
      
      await this.validateWeekGeneration(mondayDate);

      // 2. Gather all required data
      const context = await this.gatherSchedulingContext(mondayDate, sundayDate);
      this.log(`📊 Context: ${context.shiftTemplates.length} templates, ${context.staff.length} staff, ${context.timeOffRequests.length} time-off requests`);

      // 3. Expand shift templates into weekly shift instances
      const shiftInstances = this.expandShiftTemplates(context.shiftTemplates, context.weekDates);
      this.log(`🔄 Created ${shiftInstances.length} shift instances`);

      // 4. Create role slots per shift requirement
      const roleSlots = this.createRoleSlots(shiftInstances);
      this.log(`🎯 Created ${roleSlots.length} role slots to fill`);

      // 5. Initialize tracking systems
      const staffHourTracker = this.initializeStaffHourTracker(context.staff);
      const assignmentResults = {
        assigned: [],
        unfilled: [],
        conflicts: [],
        hourLimitIssues: []
      };

      // 6. Assign staff to slots using sophisticated algorithm
      for (const slot of roleSlots) {
        const assignment = await this.assignStaffToSlot(
          slot,
          context,
          staffHourTracker,
          assignmentResults.assigned
        );

        if (assignment.success) {
          assignmentResults.assigned.push(assignment.shift);
          this.updateStaffHourTracker(staffHourTracker, assignment.shift);
        } else {
          assignmentResults.unfilled.push({
            slot,
            reason: assignment.reason,
            availableStaff: assignment.availableStaff?.length || 0
          });
        }
      }

      // 7. Detect and report issues
      this.detectHourLimitIssues(staffHourTracker, assignmentResults);
      this.detectStaffingConflicts(assignmentResults.assigned, assignmentResults);

      // 8. Generate comprehensive rota analysis
      const rotaAnalysis = this.generateRotaAnalysis(assignmentResults, staffHourTracker, context);

      // 9. Save generated rota as draft
      const rotaWeek = await this.saveRotaAsDraft(
        mondayDate,
        sundayDate,
        assignmentResults.assigned,
        rotaAnalysis
      );

      const endTime = Date.now();
      this.log(`✅ Rota generation completed in ${endTime - startTime}ms`);

      return {
        rota: rotaWeek,
        analysis: rotaAnalysis,
        performance: {
          totalSlots: roleSlots.length,
          filledSlots: assignmentResults.assigned.length,
          unfilledSlots: assignmentResults.unfilled.length,
          fillRate: ((assignmentResults.assigned.length / roleSlots.length) * 100).toFixed(1),
          generationTime: endTime - startTime
        }
      };

    } catch (error) {
      this.log(`❌ Rota generation failed: ${error.message}`);
      throw new Error(`Rota generation failed: ${error.message}`);
    }
  }

  /**
   * Step 1: Validate week generation constraints
   */
  async validateWeekGeneration(mondayDate) {
    const existing = await RotaWeek.findOne({ weekStartDate: mondayDate });
    if (existing) {
      throw new Error(`Rota already exists for week starting ${mondayDate.toISOString().split('T')[0]}`);
    }

    // Ensure it's actually a Monday
    if (mondayDate.getDay() !== 1) {
      throw new Error('Week start date must be a Monday');
    }
  }

  /**
   * Step 2: Gather all scheduling context
   */
  async gatherSchedulingContext(mondayDate, sundayDate) {
    const [shiftTemplates, staff, timeOffRequests] = await Promise.all([
      ShiftTemplate.find({ isActive: true }).sort({ priority: -1, startTime: 1 }),
      Staff.find({ isActive: true }).sort({ name: 1 }),
      TimeOff.find({
        status: 'approved',
        $or: [
          { startDate: { $lte: sundayDate }, endDate: { $gte: mondayDate } }
        ]
      }).populate('staffId')
    ]);

    return {
      mondayDate,
      sundayDate,
      weekDates: getWeekDates(mondayDate),
      shiftTemplates,
      staff,
      timeOffRequests
    };
  }

  /**
   * Step 3: Expand shift templates into weekly shift instances
   */
  expandShiftTemplates(shiftTemplates, weekDates) {
    const shiftInstances = [];

    for (const date of weekDates) {
      const dayName = getDayName(date);
      const dayTemplates = shiftTemplates.filter(template => 
        template.dayOfWeek === dayName.toLowerCase()
      );

      for (const template of dayTemplates) {
        shiftInstances.push({
          id: `${template._id}_${date.toISOString().split('T')[0]}`,
          templateId: template._id,
          template: template,
          date: date,
          dayName: dayName.toLowerCase(),
          startTime: template.startTime,
          endTime: template.endTime,
          requiredRole: template.requiredRole,
          minStaff: template.minStaff || 1,
          maxStaff: template.maxStaff || template.staffCount || 1,
          priority: template.priority || 1,
          shiftDuration: calculateShiftDuration(template.startTime, template.endTime)
        });
      }
    }

    // Sort by priority (high to low) then by start time
    return shiftInstances.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime);
    });
  }

  /**
   * Step 4: Create role slots per shift requirement
   */
  createRoleSlots(shiftInstances) {
    const roleSlots = [];

    for (const shift of shiftInstances) {
      const slotsNeeded = shift.maxStaff || 1;

      for (let slotIndex = 0; slotIndex < slotsNeeded; slotIndex++) {
        roleSlots.push({
          id: `${shift.id}_slot_${slotIndex}`,
          shiftId: shift.id,
          shift: shift,
          slotIndex: slotIndex,
          requiredRole: shift.requiredRole,
          priority: shift.priority + (slotIndex === 0 ? 0.1 : 0), // Primary slot slightly higher priority
          isPrimary: slotIndex === 0
        });
      }
    }

    return roleSlots.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Step 5: Initialize staff hour tracking
   */
  initializeStaffHourTracker(staff) {
    const tracker = {};
    
    for (const member of staff) {
      tracker[member._id.toString()] = {
        staff: member,
        scheduledHours: 0,
        shiftCount: 0,
        maxHours: member.maxHoursPerWeek || 40,
        contractedHours: member.contractedHours || 0,
        shifts: []
      };
    }

    return tracker;
  }

  /**
   * Step 6: Assign staff to a slot using comprehensive scoring
   */
  async assignStaffToSlot(slot, context, staffHourTracker, existingAssignments) {
    // Filter eligible staff (hard constraints)
    const eligibleStaff = this.filterEligibleStaff(
      slot,
      context,
      staffHourTracker,
      existingAssignments
    );

    if (eligibleStaff.length === 0) {
      return {
        success: false,
        reason: 'No eligible staff available',
        availableStaff: []
      };
    }

    // Score staff (soft preferences)
    const scoredStaff = this.scoreStaffForSlot(slot, eligibleStaff, staffHourTracker, context);

    // Select best candidate
    const selectedStaff = scoredStaff[0]; // Highest scored

    // Create shift assignment
    const shift = {
      staffId: selectedStaff.staff._id,
      shiftTemplateId: slot.shift.templateId,
      date: slot.shift.date,
      startTime: slot.shift.startTime,
      endTime: slot.shift.endTime,
      status: 'scheduled',
      role: slot.requiredRole,
      shiftDuration: slot.shift.shiftDuration,
      slotInfo: {
        slotId: slot.id,
        isPrimary: slot.isPrimary,
        priority: slot.priority
      }
    };

    this.log(`👤 Assigned ${selectedStaff.staff.name} to ${slot.requiredRole} shift on ${slot.shift.date.toDateString()} (score: ${selectedStaff.totalScore.toFixed(2)})`);

    return {
      success: true,
      shift: shift,
      selectedStaff: selectedStaff,
      alternativeStaff: scoredStaff.slice(1, 3) // Top alternatives
    };
  }

  /**
   * Filter eligible staff based on hard constraints
   */
  filterEligibleStaff(slot, context, staffHourTracker, existingAssignments) {
    return context.staff.filter(staff => {
      const staffId = staff._id.toString();
      const tracker = staffHourTracker[staffId];

      // Role requirement
      if (staff.role !== slot.requiredRole) {
        return false;
      }

      // Day availability
      if (!staff.availableDays || !staff.availableDays.includes(slot.shift.dayName)) {
        return false;
      }

      // Time off conflicts
      const hasTimeOff = context.timeOffRequests.some(timeOff => {
        return timeOff.staffId._id.equals(staff._id) &&
               slot.shift.date >= new Date(timeOff.startDate) &&
               slot.shift.date <= new Date(timeOff.endDate);
      });
      if (hasTimeOff) return false;

      // Hour limit constraints
      if (tracker.scheduledHours + slot.shift.shiftDuration > tracker.maxHours) {
        return false;
      }

      // Shift conflict check
      const hasShiftConflict = existingAssignments.some(assignment => {
        return assignment.staffId.equals(staff._id) &&
               assignment.date.toDateString() === slot.shift.date.toDateString() &&
               this.shiftsOverlap(
                 assignment.startTime, assignment.endTime,
                 slot.shift.startTime, slot.shift.endTime
               );
      });
      if (hasShiftConflict) return false;

      return true;
    });
  }

  /**
   * Score staff for slot assignment (soft preferences)
   */
  scoreStaffForSlot(slot, eligibleStaff, staffHourTracker, context) {
    const scoredStaff = eligibleStaff.map(staff => {
      const staffId = staff._id.toString();
      const tracker = staffHourTracker[staffId];
      
      let scores = {
        availability: 0,
        hourBalance: 0,
        fairness: 0,
        seniority: 0,
        preference: 0
      };

      // Availability score (0-25 points)
      // Higher score for staff with more available hours
      const remainingCapacity = tracker.maxHours - tracker.scheduledHours;
      const capacityRatio = remainingCapacity / tracker.maxHours;
      scores.availability = capacityRatio * 25;

      // Hour balance score (0-25 points)
      // Prefer staff closer to their contracted hours
      if (tracker.contractedHours > 0) {
        const hoursNeeded = Math.max(0, tracker.contractedHours - tracker.scheduledHours);
        const hoursRatio = Math.min(1, hoursNeeded / tracker.contractedHours);
        scores.hourBalance = hoursRatio * 25;
      } else {
        scores.hourBalance = 15; // Default score for non-contracted staff
      }

      // Fairness score (0-25 points)
      // Prefer staff with fewer assigned shifts for fairness
      const avgShifts = Object.values(staffHourTracker)
        .reduce((sum, t) => sum + t.shiftCount, 0) / Object.keys(staffHourTracker).length;
      const fairnessRatio = Math.max(0, 1 - (tracker.shiftCount / (avgShifts + 1)));
      scores.fairness = fairnessRatio * 25;

      // Seniority/experience score (0-15 points)
      // This could be based on staff level, experience, etc.
      // For now, using role hierarchy as proxy
      const roleHierarchy = { manager: 15, chef: 12, waiter: 8, bartender: 10, cleaner: 5 };
      scores.seniority = roleHierarchy[staff.role] || 5;

      // Preference score (0-10 points)
      // This could be based on staff preferences for specific days/times
      // For now, give bonus for working preferred days
      scores.preference = 5; // Default neutral score

      const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);

      return {
        staff,
        scores,
        totalScore,
        debugInfo: {
          remainingCapacity: remainingCapacity.toFixed(1),
          scheduledHours: tracker.scheduledHours.toFixed(1),
          shiftCount: tracker.shiftCount
        }
      };
    });

    // Sort by total score (highest first)
    return scoredStaff.sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * Update staff hour tracker after assignment
   */
  updateStaffHourTracker(tracker, shift) {
    const staffId = shift.staffId.toString();
    if (tracker[staffId]) {
      tracker[staffId].scheduledHours += shift.shiftDuration;
      tracker[staffId].shiftCount += 1;
      tracker[staffId].shifts.push({
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        duration: shift.shiftDuration
      });
    }
  }

  /**
   * Step 7: Detect hour limit issues
   */
  detectHourLimitIssues(staffHourTracker, assignmentResults) {
    for (const [staffId, tracker] of Object.entries(staffHourTracker)) {
      // Under-scheduled staff
      if (tracker.contractedHours > 0 && 
          tracker.scheduledHours < tracker.contractedHours * 0.8) {
        assignmentResults.hourLimitIssues.push({
          type: 'under_scheduled',
          staffId: staffId,
          staffName: tracker.staff.name,
          contracted: tracker.contractedHours,
          scheduled: tracker.scheduledHours,
          deficit: tracker.contractedHours - tracker.scheduledHours
        });
      }

      // Over-scheduled staff (near limit)
      if (tracker.scheduledHours > tracker.maxHours * 0.9) {
        assignmentResults.hourLimitIssues.push({
          type: 'near_overtime',
          staffId: staffId,
          staffName: tracker.staff.name,
          maxHours: tracker.maxHours,
          scheduled: tracker.scheduledHours,
          excess: tracker.scheduledHours - tracker.maxHours
        });
      }
    }
  }

  /**
   * Step 8: Detect staffing conflicts
   */
  detectStaffingConflicts(assignments, assignmentResults) {
    // Check for any remaining conflicts (shouldn't happen with proper filtering)
    const conflictsByStaffAndDate = {};

    for (const shift of assignments) {
      const key = `${shift.staffId}_${shift.date.toDateString()}`;
      if (!conflictsByStaffAndDate[key]) {
        conflictsByStaffAndDate[key] = [];
      }
      conflictsByStaffAndDate[key].push(shift);
    }

    for (const [key, shifts] of Object.entries(conflictsByStaffAndDate)) {
      if (shifts.length > 1) {
        // Check for time overlaps
        for (let i = 0; i < shifts.length - 1; i++) {
          for (let j = i + 1; j < shifts.length; j++) {
            if (this.shiftsOverlap(
              shifts[i].startTime, shifts[i].endTime,
              shifts[j].startTime, shifts[j].endTime
            )) {
              assignmentResults.conflicts.push({
                type: 'time_overlap',
                staffId: shifts[i].staffId,
                date: shifts[i].date,
                shift1: shifts[i],
                shift2: shifts[j]
              });
            }
          }
        }
      }
    }
  }

  /**
   * Step 9: Generate comprehensive rota analysis
   */
  generateRotaAnalysis(assignmentResults, staffHourTracker, context) {
    const totalSlots = assignmentResults.assigned.length + assignmentResults.unfilled.length;
    const fillRate = (assignmentResults.assigned.length / totalSlots) * 100;

    const staffUtilization = Object.values(staffHourTracker).map(tracker => ({
      staffId: tracker.staff._id,
      name: tracker.staff.name,
      role: tracker.staff.role,
      scheduledHours: tracker.scheduledHours,
      maxHours: tracker.maxHours,
      contractedHours: tracker.contractedHours,
      utilizationRate: (tracker.scheduledHours / tracker.maxHours) * 100,
      shiftCount: tracker.shiftCount
    }));

    const totalScheduledHours = assignmentResults.assigned.reduce(
      (sum, shift) => sum + shift.shiftDuration, 0
    );

    const totalLaborCost = assignmentResults.assigned.reduce((sum, shift) => {
      const staff = context.staff.find(s => s._id.equals(shift.staffId));
      return sum + (shift.shiftDuration * (staff?.hourlyRate || 0));
    }, 0);

    return {
      summary: {
        totalSlots,
        filledSlots: assignmentResults.assigned.length,
        unfilledSlots: assignmentResults.unfilled.length,
        fillRate: parseFloat(fillRate.toFixed(1)),
        totalScheduledHours: parseFloat(totalScheduledHours.toFixed(1)),
        totalLaborCost: parseFloat(totalLaborCost.toFixed(2)),
        averageHourlyRate: totalScheduledHours > 0 ? parseFloat((totalLaborCost / totalScheduledHours).toFixed(2)) : 0
      },
      staffUtilization,
      issues: {
        unfilledSlots: assignmentResults.unfilled,
        hourLimitIssues: assignmentResults.hourLimitIssues,
        conflicts: assignmentResults.conflicts
      },
      recommendations: this.generateRecommendations(assignmentResults, staffUtilization, context)
    };
  }

  /**
   * Generate recommendations for improving the rota
   */
  generateRecommendations(assignmentResults, staffUtilization, context) {
    const recommendations = [];

    // Unfilled slots recommendations
    if (assignmentResults.unfilled.length > 0) {
      const roleShortages = {};
      assignmentResults.unfilled.forEach(unfilled => {
        const role = unfilled.slot.requiredRole;
        roleShortages[role] = (roleShortages[role] || 0) + 1;
      });

      for (const [role, count] of Object.entries(roleShortages)) {
        recommendations.push({
          type: 'staffing',
          priority: 'high',
          message: `Consider hiring ${count} more ${role}${count > 1 ? 's' : ''} to fill unfilled slots`
        });
      }
    }

    // Under-utilized staff
    const underUtilized = staffUtilization.filter(s => s.utilizationRate < 50 && s.contractedHours > 0);
    if (underUtilized.length > 0) {
      recommendations.push({
        type: 'optimization',
        priority: 'medium',
        message: `${underUtilized.length} staff members are under-utilized. Consider adjusting schedules or reducing contracted hours.`,
        affectedStaff: underUtilized.map(s => s.name)
      });
    }

    // Over-utilized staff
    const overUtilized = staffUtilization.filter(s => s.utilizationRate > 90);
    if (overUtilized.length > 0) {
      recommendations.push({
        type: 'workload',
        priority: 'high',
        message: `${overUtilized.length} staff members are near their hour limits. Consider distributing workload more evenly.`,
        affectedStaff: overUtilized.map(s => s.name)
      });
    }

    return recommendations;
  }

  /**
   * Step 10: Save generated rota as draft
   */
  async saveRotaAsDraft(mondayDate, sundayDate, shifts, analysis) {
    const rotaWeek = new RotaWeek({
      weekStartDate: mondayDate,
      weekEndDate: sundayDate,
      shifts: shifts,
      totalStaffHours: analysis.summary.totalScheduledHours,
      totalLaborCost: analysis.summary.totalLaborCost,
      status: 'draft',
      generationMetadata: {
        algorithm: 'comprehensive_v2',
        generatedAt: new Date(),
        fillRate: analysis.summary.fillRate,
        issueCount: analysis.issues.unfilledSlots.length + 
                   analysis.issues.hourLimitIssues.length + 
                   analysis.issues.conflicts.length
      }
    });

    await rotaWeek.save();
    await rotaWeek.populate('shifts.staffId shifts.shiftTemplateId');

    return rotaWeek;
  }

  // Utility methods
  shiftsOverlap(start1, end1, start2, end2) {
    const start1Minutes = this.timeToMinutes(start1);
    const end1Minutes = this.timeToMinutes(end1);
    const start2Minutes = this.timeToMinutes(start2);
    const end2Minutes = this.timeToMinutes(end2);

    // Handle overnight shifts
    let end1Adj = end1Minutes;
    let end2Adj = end2Minutes;
    
    if (end1Minutes <= start1Minutes) end1Adj += 24 * 60;
    if (end2Minutes <= start2Minutes) end2Adj += 24 * 60;

    return start1Minutes < end2Adj && start2Minutes < end1Adj;
  }

  timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  log(message) {
    if (this.debug) {
      console.log(`[RotaGen] ${new Date().toISOString()} - ${message}`);
    }
  }
}

module.exports = new RotaGenerationService();