const Staff = require('../models/Staff');
const TimeOff = require('../models/TimeOff');
const ShiftTemplate = require('../models/ShiftTemplate');
const RotaWeek = require('../models/RotaWeek');
const SoftConstraintScorer = require('../utils/softConstraintScorer');
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
   * @param {Array} options.templateIds - Optional array of template IDs to use (null = all)
   * @param {Array} options.days - Optional array of day names to generate (null = all days)
   * @param {Boolean} options.autoAssignStaff - Whether to auto-assign staff (default: true)
   * @param {Boolean} options.useTemplates - Whether to use templates (default: true)
   * @returns {Promise<Object>} - Generated rota with analysis
   */
  async generateWeeklyRota(weekStartDate, options = {}) {
    const startTime = Date.now();
    this.log('🚀 Starting rota generation...');

    const { 
      templateIds = null, 
      days = null, 
      autoAssignStaff = true,
      useTemplates = true 
    } = options;

    try {
      // 1. Initialize week and validation
      const mondayDate = getWeekStart(weekStartDate);
      const sundayDate = getWeekEnd(mondayDate);
      
      await this.validateWeekGeneration(mondayDate);

      // 2. Gather all required data
      const context = await this.gatherSchedulingContext(mondayDate, sundayDate, { templateIds, days });
      this.log(`📊 Context: ${context.shiftTemplates.length} templates, ${context.staff.length} staff, ${context.timeOffRequests.length} time-off requests`);

      // 3. Expand shift templates into weekly shift instances
      const shiftInstances = this.expandShiftTemplates(context.shiftTemplates, context.weekDates, { days });
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

      // 6. Assign staff to slots using sophisticated algorithm (if enabled)
      if (autoAssignStaff) {
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
      } else {
        // Create empty shifts without staff assignment
        for (const slot of roleSlots) {
          assignmentResults.assigned.push({
            shiftTemplateId: slot.templateId,
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            requiredRole: slot.requiredRole,
            staffId: null,
            duration: slot.shiftDuration,
            status: 'unfilled'
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
  async gatherSchedulingContext(mondayDate, sundayDate, filters = {}) {
    const { templateIds = null, days = null } = filters;
    
    // Build template query
    const templateQuery = { isActive: true };
    if (templateIds && templateIds.length > 0) {
      templateQuery._id = { $in: templateIds };
    }
    if (days && days.length > 0) {
      templateQuery.dayOfWeek = { $in: days.map(d => d.toLowerCase()) };
    }
    
    const [shiftTemplates, staff, timeOffRequests] = await Promise.all([
      ShiftTemplate.find(templateQuery).sort({ priority: -1, startTime: 1 }),
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
   * Now properly handles roleRequirements array instead of deprecated requiredRole
   */
  expandShiftTemplates(shiftTemplates, weekDates, filters = {}) {
    const { days = null } = filters;
    const shiftInstances = [];

    for (const date of weekDates) {
      const dayName = getDayName(date);
      
      // Skip this day if not in the filter
      if (days && days.length > 0 && !days.includes(dayName.toLowerCase())) {
        continue;
      }
      
      const dayTemplates = shiftTemplates.filter(template => 
        template.dayOfWeek === dayName.toLowerCase()
      );

      for (const template of dayTemplates) {
        // Expand roleRequirements into shift instances
        const roleRequirements = template.roleRequirements || [];
        
        if (roleRequirements.length === 0) {
          this.log(`⚠️ Template "${template.name}" has no role requirements, skipping`);
          continue;
        }

        // Create a shift instance for each role requirement
        for (const roleReq of roleRequirements) {
          shiftInstances.push({
            id: `${template._id}_${date.toISOString().split('T')[0]}_${roleReq.role}`,
            templateId: template._id,
            template: template,
            date: date,
            dayName: dayName.toLowerCase(),
            startTime: template.startTime,
            endTime: template.endTime,
            requiredRole: roleReq.role,
            staffCount: roleReq.count || 1,
            priority: template.priority || 1,
            shiftDuration: calculateShiftDuration(template.startTime, template.endTime)
          });
        }
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
   * Creates individual slots based on staffCount from roleRequirements
   */
  createRoleSlots(shiftInstances) {
    const roleSlots = [];

    for (const shift of shiftInstances) {
      const slotsNeeded = shift.staffCount || 1;

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
   * Score staff for slot assignment using enhanced soft constraints
   */
  scoreStaffForSlot(slot, eligibleStaff, staffHourTracker, context) {
    return SoftConstraintScorer.scoreMultipleStaff(
      eligibleStaff,
      slot,
      context,
      staffHourTracker
    );
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