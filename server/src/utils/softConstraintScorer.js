const { CONSTRAINTS } = require('../models/constants');
const { getDayName, calculateShiftDuration } = require('../utils/dateUtils');

/**
 * Soft Constraint Scoring System
 * 
 * Implements sophisticated scoring algorithms for optimal staff assignment.
 * These constraints don't block assignments but influence selection priority.
 * 
 * Soft Constraints:
 * 1. ✅ Preferred availability scoring
 * 2. ✅ Contract hours target scoring  
 * 3. ✅ Fairness heuristic (least hours so far)
 */
class SoftConstraintScorer {
  
  /**
   * Score staff for optimal shift assignment
   * @param {Object} staff - Staff member details
   * @param {Object} slot - Shift slot to fill
   * @param {Object} context - Scheduling context
   * @param {Object} staffHourTracker - Current hour tracking
   * @returns {Object} - Comprehensive scoring breakdown
   */
  static scoreStaffForSlot(staff, slot, context, staffHourTracker) {
    const staffId = staff._id.toString();
    const tracker = staffHourTracker[staffId];
    
    const scores = {
      // Core scoring categories (0-100 points each)
      preferredAvailability: 0,
      contractHoursTarget: 0,
      fairnessHeuristic: 0,
      
      // Additional scoring factors
      roleExperience: 0,
      dayPreference: 0,
      timePreference: 0,
      workPattern: 0
    };

    // 1. PREFERRED AVAILABILITY SCORING (0-100 points)
    scores.preferredAvailability = this.calculatePreferredAvailabilityScore(
      staff, slot, tracker, context
    );

    // 2. CONTRACT HOURS TARGET SCORING (0-100 points)
    scores.contractHoursTarget = this.calculateContractHoursTargetScore(
      staff, slot, tracker, context
    );

    // 3. FAIRNESS HEURISTIC (0-100 points)
    scores.fairnessHeuristic = this.calculateFairnessScore(
      staff, slot, tracker, staffHourTracker, context
    );

    // 4. ROLE EXPERIENCE SCORING (0-50 points)
    scores.roleExperience = this.calculateRoleExperienceScore(staff, slot);

    // 5. DAY PREFERENCE SCORING (0-30 points)
    scores.dayPreference = this.calculateDayPreferenceScore(staff, slot);

    // 6. TIME PREFERENCE SCORING (0-30 points)
    scores.timePreference = this.calculateTimePreferenceScore(staff, slot);

    // 7. WORK PATTERN SCORING (0-20 points)
    scores.workPattern = this.calculateWorkPatternScore(staff, slot, tracker, context);

    // Calculate weighted total
    const weights = this.getScoringWeights();
    const totalScore = Object.keys(scores).reduce((total, category) => {
      const weight = weights[category] || 1;
      return total + (scores[category] * weight);
    }, 0);

    return {
      staff,
      scores,
      totalScore,
      maxPossibleScore: this.getMaxPossibleScore(weights),
      debugInfo: this.generateDebugInfo(staff, slot, tracker, scores)
    };
  }

  /**
   * 1. PREFERRED AVAILABILITY SCORING
   * Scores based on how well the shift matches staff availability and capacity
   */
  static calculatePreferredAvailabilityScore(staff, slot, tracker, context) {
    let score = 0;
    
    // Base availability check (0-40 points)
    const remainingCapacity = tracker.maxHours - tracker.scheduledHours;
    const shiftDuration = slot.shift.shiftDuration;
    
    if (remainingCapacity <= 0) {
      return 0; // No capacity
    }
    
    // Score based on remaining capacity ratio
    const capacityRatio = Math.min(1, remainingCapacity / tracker.maxHours);
    score += capacityRatio * 40;
    
    // Preferred availability window (0-30 points)
    if (staff.preferredDays && staff.preferredDays.includes(slot.shift.dayName)) {
      score += 20;
    }
    
    // Preferred time slots (0-30 points)
    if (staff.preferredTimeSlots) {
      const shiftStartHour = parseInt(slot.shift.startTime.split(':')[0]);
      const matchingSlot = staff.preferredTimeSlots.find(pref => {
        const prefStart = parseInt(pref.startTime.split(':')[0]);
        const prefEnd = parseInt(pref.endTime.split(':')[0]);
        return shiftStartHour >= prefStart && shiftStartHour < prefEnd;
      });
      
      if (matchingSlot) {
        score += 30;
      }
    } else {
      // Default preference scoring based on role
      score += this.getDefaultTimePreference(staff.role, slot.shift.startTime);
    }
    
    return Math.min(100, score);
  }

  /**
   * 2. CONTRACT HOURS TARGET SCORING
   * Prioritizes staff who need hours to meet their contracted targets
   */
  static calculateContractHoursTargetScore(staff, slot, tracker, context) {
    const contractedHours = staff.maxHoursPerWeek || CONSTRAINTS.DEFAULT_HOURS_PER_WEEK;
    const currentHours = tracker.scheduledHours;
    const shiftDuration = slot.shift.shiftDuration;
    const projectedHours = currentHours + shiftDuration;
    
    // Calculate how close we are to contracted hours target
    const hoursNeeded = contractedHours - currentHours;
    
    if (hoursNeeded <= 0) {
      // Already at or above target - lower priority
      const overage = Math.abs(hoursNeeded);
      return Math.max(0, 30 - (overage * 5)); // Decreasing score for overage
    }
    
    // Score based on how well this shift helps meet target
    if (shiftDuration <= hoursNeeded) {
      // Perfect fit or helps without exceeding
      const targetRatio = shiftDuration / hoursNeeded;
      return 70 + (targetRatio * 30); // 70-100 points
    } else {
      // Would exceed target but still needed
      const excessHours = shiftDuration - hoursNeeded;
      return Math.max(40, 70 - (excessHours * 10)); // 40-70 points
    }
  }

  /**
   * 3. FAIRNESS HEURISTIC (LEAST HOURS SO FAR)
   * Ensures fair distribution of work across all staff
   */
  static calculateFairnessScore(staff, slot, tracker, allStaffTrackers, context) {
    const staffId = staff._id.toString();
    const currentStaffHours = tracker.scheduledHours;
    
    // Calculate average hours across all eligible staff for this role
    const eligibleStaff = Object.values(allStaffTrackers)
      .filter(t => t.staff.role === staff.role && t.staff.isActive);
    
    if (eligibleStaff.length === 0) return 100;
    
    const totalHours = eligibleStaff.reduce((sum, t) => sum + t.scheduledHours, 0);
    const averageHours = totalHours / eligibleStaff.length;
    
    // Calculate fairness score
    const hoursDifference = currentStaffHours - averageHours;
    
    if (hoursDifference <= 0) {
      // Below average - high fairness score
      const underUtilizationBonus = Math.abs(hoursDifference);
      return Math.min(100, 80 + (underUtilizationBonus * 4));
    } else {
      // Above average - lower fairness score
      return Math.max(0, 80 - (hoursDifference * 6));
    }
  }

  /**
   * 4. ROLE EXPERIENCE SCORING
   * Scores based on experience and competency in the required role
   */
  static calculateRoleExperienceScore(staff, slot) {
    // Base role hierarchy score
    const roleHierarchy = {
      manager: 50,
      chef: 45,
      bartender: 40,
      waiter: 35,
      cleaner: 30
    };
    
    let score = roleHierarchy[staff.role] || 20;
    
    // Experience bonus (if available)
    if (staff.experienceYears) {
      const experienceBonus = Math.min(20, staff.experienceYears * 2);
      score += experienceBonus;
    }
    
    // Performance rating bonus (if available)
    if (staff.performanceRating) {
      const performanceBonus = (staff.performanceRating - 3) * 5; // Scale 1-5 to -10 to +10
      score += performanceBonus;
    }
    
    return Math.max(0, Math.min(50, score));
  }

  /**
   * 5. DAY PREFERENCE SCORING
   * Scores based on day-specific preferences and patterns
   */
  static calculateDayPreferenceScore(staff, slot) {
    const dayName = slot.shift.dayName.toLowerCase();
    let score = 15; // Base score
    
    // Preferred days boost
    if (staff.preferredDays && staff.preferredDays.includes(dayName)) {
      score += 15;
    }
    
    // Avoid days penalty
    if (staff.avoidDays && staff.avoidDays.includes(dayName)) {
      score -= 10;
    }
    
    // Weekend preference handling
    if (['saturday', 'sunday'].includes(dayName)) {
      if (staff.weekendPreference === 'prefer') {
        score += 10;
      } else if (staff.weekendPreference === 'avoid') {
        score -= 5;
      }
    }
    
    return Math.max(0, Math.min(30, score));
  }

  /**
   * 6. TIME PREFERENCE SCORING
   * Scores based on preferred shift times
   */
  static calculateTimePreferenceScore(staff, slot) {
    const startHour = parseInt(slot.shift.startTime.split(':')[0]);
    let score = 15; // Base score
    
    // Time preference categories
    if (staff.timePreference) {
      switch (staff.timePreference) {
        case 'early': // 6 AM - 2 PM
          score += startHour >= 6 && startHour <= 14 ? 15 : -5;
          break;
        case 'late': // 2 PM - 10 PM  
          score += startHour >= 14 && startHour <= 22 ? 15 : -5;
          break;
        case 'night': // 6 PM onwards
          score += startHour >= 18 ? 15 : -5;
          break;
        case 'flexible': // No strong preference
          score += 5;
          break;
      }
    } else {
      // Default time preference by role
      score += this.getDefaultTimePreference(staff.role, slot.shift.startTime);
    }
    
    return Math.max(0, Math.min(30, score));
  }

  /**
   * 7. WORK PATTERN SCORING
   * Encourages healthy work patterns and rest periods
   */
  static calculateWorkPatternScore(staff, slot, tracker, context) {
    let score = 10; // Base score
    
    // Rest day consideration
    const lastShift = this.getLastShift(tracker.shifts, slot.shift.date);
    if (lastShift) {
      const daysSinceLastShift = this.getDaysBetween(lastShift.date, slot.shift.date);
      
      if (daysSinceLastShift === 1) {
        // Consecutive day - slight penalty for work-life balance
        score -= 2;
      } else if (daysSinceLastShift >= 2) {
        // Good rest period - bonus
        score += Math.min(5, daysSinceLastShift);
      }
    }
    
    // Shift distribution throughout the week
    if (tracker.shifts.length > 0) {
      const daySpread = this.calculateDaySpread(tracker.shifts);
      score += daySpread * 2; // Bonus for good distribution
    }
    
    return Math.max(0, Math.min(20, score));
  }

  /**
   * Get default time preference by role
   */
  static getDefaultTimePreference(role, startTime) {
    const hour = parseInt(startTime.split(':')[0]);
    
    const roleTimePrefs = {
      manager: { preferred: [8, 16], bonus: 10 },
      chef: { preferred: [10, 18], bonus: 8 },
      waiter: { preferred: [11, 18], bonus: 6 },
      bartender: { preferred: [16, 22], bonus: 8 },
      cleaner: { preferred: [6, 14], bonus: 5 }
    };
    
    const pref = roleTimePrefs[role] || { preferred: [8, 18], bonus: 5 };
    const [start, end] = pref.preferred;
    
    return hour >= start && hour <= end ? pref.bonus : 0;
  }

  /**
   * Helper methods
   */
  static getLastShift(shifts, currentDate) {
    return shifts
      .filter(shift => shift.date < currentDate)
      .sort((a, b) => b.date - a.date)[0];
  }

  static getDaysBetween(date1, date2) {
    const diffTime = Math.abs(date2 - date1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  static calculateDaySpread(shifts) {
    const days = new Set(shifts.map(shift => shift.date.getDay()));
    return days.size / 7; // 0-1 score for day distribution
  }

  /**
   * Configuration
   */
  static getScoringWeights() {
    return {
      preferredAvailability: 1.0,  // High importance
      contractHoursTarget: 0.9,    // High importance  
      fairnessHeuristic: 0.8,      // High importance
      roleExperience: 0.6,         // Medium importance
      dayPreference: 0.4,          // Medium importance
      timePreference: 0.4,         // Medium importance
      workPattern: 0.3             // Lower importance
    };
  }

  static getMaxPossibleScore(weights) {
    const maxScores = {
      preferredAvailability: 100,
      contractHoursTarget: 100,
      fairnessHeuristic: 100,
      roleExperience: 50,
      dayPreference: 30,
      timePreference: 30,
      workPattern: 20
    };

    return Object.keys(maxScores).reduce((total, category) => {
      const weight = weights[category] || 1;
      return total + (maxScores[category] * weight);
    }, 0);
  }

  static generateDebugInfo(staff, slot, tracker, scores) {
    return {
      staffName: staff.name,
      role: staff.role,
      shiftDay: slot.shift.dayName,
      shiftTime: `${slot.shift.startTime}-${slot.shift.endTime}`,
      currentHours: tracker.scheduledHours.toFixed(1),
      maxHours: tracker.maxHours,
      contractedHours: staff.maxHoursPerWeek || 'N/A',
      shiftCount: tracker.shiftCount,
      scoreBreakdown: Object.entries(scores).map(([category, score]) => 
        `${category}: ${score.toFixed(1)}`
      ).join(', ')
    };
  }

  /**
   * Batch score multiple staff for a slot
   */
  static scoreMultipleStaff(staffList, slot, context, staffHourTracker) {
    const scoredStaff = staffList.map(staff => 
      this.scoreStaffForSlot(staff, slot, context, staffHourTracker)
    );

    // Sort by total score (highest first)
    return scoredStaff.sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * Get scoring configuration summary
   */
  static getScoringConfig() {
    return {
      categories: {
        preferredAvailability: {
          maxScore: 100,
          weight: 1.0,
          description: 'Staff capacity and preferred time slots'
        },
        contractHoursTarget: {
          maxScore: 100,
          weight: 0.9,
          description: 'Progress toward contracted hours'
        },
        fairnessHeuristic: {
          maxScore: 100,
          weight: 0.8,
          description: 'Equal distribution of hours across staff'
        },
        roleExperience: {
          maxScore: 50,
          weight: 0.6,
          description: 'Experience and competency in role'
        },
        dayPreference: {
          maxScore: 30,
          weight: 0.4,
          description: 'Preferred working days'
        },
        timePreference: {
          maxScore: 30,
          weight: 0.4,
          description: 'Preferred shift times'
        },
        workPattern: {
          maxScore: 20,
          weight: 0.3,
          description: 'Healthy work distribution patterns'
        }
      },
      weights: this.getScoringWeights(),
      maxTotalScore: this.getMaxPossibleScore(this.getScoringWeights())
    };
  }
}

module.exports = SoftConstraintScorer;