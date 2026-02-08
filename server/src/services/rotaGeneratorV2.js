/**
 * Rota Generator V2 - Production-Grade Weekly Rota Generation
 * 
 * Creates smart, human-sensible weekly rotas from staff data, availability,
 * contract limits, and shift templates.
 * 
 * KEY DESIGN DECISIONS:
 * - One staff member = one continuous work block per day (no fragmented shifts)
 * - Prefers longer, consolidated shifts over many short ones
 * - Availability is soft (can override with warnings)
 * - Early/late preferences influence scoring, not hard blocking
 */

const { getWeekStart, getWeekDates, getDayName, calculateShiftDuration } = require('../utils/dateUtils');

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

const CONFIG = {
  // Minimum shift length worth assigning (hours)
  MIN_SHIFT_HOURS: 4,
  
  // Maximum shift length for a single block (hours)
  MAX_SHIFT_HOURS: 8.5,
  
  // Ideal shift length for scoring (hours)
  IDEAL_SHIFT_HOURS: 8,
  
  // Hour at which "early" vs "late" is divided (24h format)
  EARLY_LATE_BOUNDARY: 14,
  
  // Scoring weights
  WEIGHTS: {
    CONTRACT_FULFILLMENT: 100,  // Prioritize staff who need hours
    SHIFT_CONSOLIDATION: 50,    // Prefer fewer, longer blocks
    TIME_PREFERENCE: 5,         // Early/late alignment (minor tie-breaker only)
    AVAILABILITY_MATCH: 40,     // Penalty for working outside availability
    ROLE_PRIORITY: 20           // Higher priority roles first
  }
};

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Generate a weekly rota from templates and staff data
 * 
 * @param {Object} params - Generation parameters
 * @param {Date} params.weekStartDate - Monday of the week to generate
 * @param {Array} params.shiftTemplates - Shift templates defining operating hours
 * @param {Array} params.staff - Staff members with roles, availability, contracts
 * @param {Array} params.timeOffRequests - Approved time-off requests
 * @returns {Object} - Generated rota with assignments and warnings
 */
function generateWeeklyRota({ weekStartDate, shiftTemplates, staff, timeOffRequests = [] }) {
  try {
    console.log(`🔄 V2 Generator: Starting rota generation for ${weekStartDate}`);
    console.log(`📋 Templates: ${shiftTemplates.length}, Staff: ${staff.length}, Time-off requests: ${timeOffRequests.length}`);
    
    // Normalize week start to Monday
    const mondayDate = getWeekStart(weekStartDate);
    const weekDates = getWeekDates(mondayDate);
    
    // Phase 1: Expand templates into daily operating windows
    console.log('📊 Phase 1: Expanding templates to daily windows...');
    const dailyOperatingWindows = expandTemplatesToDailyWindows(shiftTemplates, weekDates);
    console.log(`✅ Phase 1 complete: ${dailyOperatingWindows.filter(w => w.hasOperations).length} operating days`);
    
    // Initialize tracking structures
    const staffTracker = initializeStaffTracker(staff);
    const globalWarnings = [];
    
    // Phase 2-6: Process each day
    console.log('👥 Phase 2-6: Assigning staff to shifts...');
    const days = weekDates.map((date, dayIndex) => {
      const dayName = getDayName(date);
      const operatingWindow = dailyOperatingWindows[dayIndex];
      
      // Skip days with no operating hours
      if (!operatingWindow.hasOperations) {
        return createEmptyDay(date, dayName);
      }
      
      console.log(`  Processing ${dayName}: ${operatingWindow.shifts?.length || 0} shifts`);
      
      // Generate assignments for this day
      const { assignments, warnings } = assignDayShifts({
        date,
        dayName,
        operatingWindow,
        staff,
        staffTracker,
        timeOffRequests
      });
      
      console.log(`  ✅ ${dayName}: ${assignments.length} assignments`);
      
      // Check for understaffing
      const coverageWarnings = checkCoverageGaps(operatingWindow, assignments, dayName);
      
      return {
        date: formatDateISO(date),
        dayName,
        operatingStart: operatingWindow.start,
        operatingEnd: operatingWindow.end,
        shifts: operatingWindow.shifts || [],  // Individual shifts for this day
        assignments,
        warnings: [...warnings, ...coverageWarnings]
      };
    });
    
    // Phase 7: Generate global warnings (contract fulfillment, etc.)
    console.log('⚠️  Phase 7: Generating contract warnings...');
    const contractWarnings = generateContractWarnings(staffTracker, staff);
    globalWarnings.push(...contractWarnings);
    
    console.log('✅ V2 Generator: Rota generation complete!');
    
    return {
      weekStart: formatDateISO(mondayDate),
      weekEnd: formatDateISO(weekDates[6]),
      days,
      globalWarnings,
      summary: generateRotaSummary(days, staffTracker, staff)
    };
  } catch (error) {
    console.error('❌ V2 Generator Error:', error.message);
    console.error('Stack trace:', error.stack);
    throw error; // Re-throw to let the controller handle it
  }
}

// ============================================================================
// PHASE 1: TEMPLATE EXPANSION
// ============================================================================

/**
 * Expand shift templates into daily operating windows
 * 
 * CORRECTED APPROACH: Templates define the WHOLE DAY operation
 * - A template like "Monday 6:30am-10pm" defines the full operating hours
 * - We aggregate role requirements across all templates for the day
 * - We apply time-based staffing (skeleton crew early, full peak, closing crew late)
 * 
 * @param {Array} templates - Shift templates
 * @param {Array} weekDates - Array of 7 dates (Mon-Sun)
 * @returns {Array} - Array of daily operating windows with aggregated requirements
 */
function expandTemplatesToDailyWindows(templates, weekDates) {
  return weekDates.map(date => {
    const dayName = getDayName(date).toLowerCase();
    
    // Find all templates for this day
    const dayTemplates = templates.filter(t => 
      t.dayOfWeek.toLowerCase() === dayName && t.isActive
    );
    
    if (dayTemplates.length === 0) {
      return { hasOperations: false, start: null, end: null, roleRequirements: [] };
    }
    
    // Find earliest start and latest end (restaurant operating window)
    const allTimes = dayTemplates.map(t => ({
      start: timeToMinutes(t.startTime),
      end: timeToMinutes(t.endTime)
    }));
    
    const earliestStart = Math.min(...allTimes.map(t => t.start));
    const latestEnd = Math.max(...allTimes.map(t => {
      // Handle overnight: if end < start, treat as next day
      return t.end <= t.start ? t.end + 1440 : t.end;
    }));
    
    // Aggregate role requirements from all templates
    const aggregatedRoles = aggregateRoleRequirements(dayTemplates);
    
    return {
      hasOperations: true,
      start: minutesToTime(earliestStart),
      end: minutesToTime(latestEnd % 1440), // Normalize overnight
      startMinutes: earliestStart,
      endMinutes: latestEnd,
      roleRequirements: aggregatedRoles,  // Aggregated requirements for the whole day
      templates: dayTemplates
    };
  });
}

/**
 * Apply hospitality staffing rules to a template based on shift type
 * 
 * HOSPITALITY STAFFING PATTERN:
 * - Opening (morning): 1-3 staff, MUST include manager/assistant_manager
 * - Peak (busy period 10am-4pm): Full template requirements
 * - Closing (evening after 4pm): 3-4 staff, MUST include manager/assistant_manager
 * 
 * @param {Object} template - Shift template
 * @returns {Object} - Shift with adjusted role requirements and manager flag
 */
function applyHospitalityStaffing(template) {
  const shiftType = template.shiftType || 'peak';
  const MANAGER_ROLES = ['manager', 'assistant_manager'];
  
  // Defensive check for roleRequirements
  const roleRequirements = template.roleRequirements || [];
  if (roleRequirements.length === 0) {
    console.warn(`Template "${template.name}" has no role requirements`);
    return {
      templateId: template._id,
      name: template.name,
      shiftType,
      startTime: template.startTime,
      endTime: template.endTime,
      startMinutes: timeToMinutes(template.startTime),
      endMinutes: timeToMinutes(template.endTime),
      roleRequirements: [],
      requiresManager: false,
      minStaff: 0,
      maxStaff: 0
    };
  }
  
  let effectiveRequirements = [...roleRequirements];
  let requiresManager = false;
  let minStaff = 1;
  let maxStaff = 100;
  
  if (shiftType === 'opening') {
    // Opening: 1-2 staff with mandatory manager
    requiresManager = true;
    minStaff = 1;
    maxStaff = 2;
    // Reduce to skeleton crew: prioritize manager + essential role
    effectiveRequirements = reduceToSkeletonCrew(template.roleRequirements, maxStaff, true);
    
  } else if (shiftType === 'closing') {
    // Closing: 3-4 staff with mandatory manager
    requiresManager = true;
    minStaff = 3;
    maxStaff = 4;
    // Reduce to closing crew: manager + essential staff
    effectiveRequirements = reduceToClosingCrew(template.roleRequirements, maxStaff, true);
    
  } else {
    // Peak: use full template requirements
    effectiveRequirements = template.roleRequirements;
  }
  
  return {
    templateId: template._id,
    name: template.name,
    shiftType,
    startTime: template.startTime,
    endTime: template.endTime,
    startMinutes: timeToMinutes(template.startTime),
    endMinutes: timeToMinutes(template.endTime),
    roleRequirements: effectiveRequirements,
    requiresManager,
    minStaff,
    maxStaff
  };
}

/**
 * Reduce role requirements to skeleton crew (1-3 staff)
 * For opening shifts - absolute minimum to open the restaurant
 */
function reduceToSkeletonCrew(roleRequirements, maxStaff = 3, ensureManager = true) {
  const MANAGER_ROLES = ['manager', 'assistant_manager'];
  const reduced = [];
  
  // Defensive check
  if (!roleRequirements || roleRequirements.length === 0) {
    return [];
  }
  
  // Always include one manager if required
  if (ensureManager) {
    const managerReq = roleRequirements.find(r => MANAGER_ROLES.includes(r.role.toLowerCase()));
    if (managerReq) {
      reduced.push({ role: managerReq.role, count: 1 });
    } else {
      // Force a manager role if template doesn't have one
      reduced.push({ role: 'manager', count: 1 });
    }
  }
  
  // Add up to (maxStaff - 1) more essential staff
  const remainingSlots = maxStaff - reduced.length;
  const nonManagerRoles = roleRequirements.filter(r => !MANAGER_ROLES.includes(r.role.toLowerCase()));
  
  for (let i = 0; i < Math.min(remainingSlots, nonManagerRoles.length); i++) {
    reduced.push({ role: nonManagerRoles[i].role, count: 1 });
  }
  
  return reduced;
}

/**
 * Reduce role requirements to closing crew (3-4 staff total)
 * For closing shifts - enough to close safely with manager supervision
 * 
 * MUST HAVE:
 * - 1 manager or assistant manager
 * - 2-3 additional staff (total 3-4 staff)
 */
function reduceToClosingCrew(roleRequirements, maxStaff = 4, ensureManager = true) {
  const MANAGER_ROLES = ['manager', 'assistant_manager'];
  const reduced = [];
  
  // Defensive check
  if (!roleRequirements || roleRequirements.length === 0) {
    return [];
  }
  
  // Always include one manager if required
  if (ensureManager) {
    const managerReq = roleRequirements.find(r => MANAGER_ROLES.includes(r.role.toLowerCase()));
    if (managerReq) {
      reduced.push({ role: managerReq.role, count: 1 });
    } else {
      // Force a manager role if template doesn't have one
      reduced.push({ role: 'manager', count: 1 });
    }
  }
  
  // Add 2-3 more essential staff for closing (minimum 2, maximum 3)
  const minAdditionalStaff = 2;
  const maxAdditionalStaff = maxStaff - reduced.length; // Usually 3
  const nonManagerRoles = roleRequirements.filter(r => !MANAGER_ROLES.includes(r.role.toLowerCase()));
  
  // Ensure we get at least minAdditionalStaff
  const targetStaff = Math.max(minAdditionalStaff, Math.min(maxAdditionalStaff, nonManagerRoles.length));
  
  // Add roles, potentially with count > 1 if we don't have enough role variety
  let staffAdded = 0;
  let roleIndex = 0;
  
  while (staffAdded < targetStaff && nonManagerRoles.length > 0) {
    const role = nonManagerRoles[roleIndex % nonManagerRoles.length];
    const existingRole = reduced.find(r => r.role === role.role);
    
    if (existingRole) {
      // Increase count for this role
      existingRole.count++;
    } else {
      // Add new role
      reduced.push({ role: role.role, count: 1 });
    }
    
    staffAdded++;
    roleIndex++;
  }
  
  return reduced;
}

/**
 * Aggregate role requirements from multiple templates
 * 
 * If Monday has:
 *   - "Morning Shift" needing 2 waiters, 1 chef
 *   - "Evening Shift" needing 2 waiters, 1 chef
 * 
 * We aggregate to: waiters need coverage across both periods,
 * but a single waiter can cover both if their hours allow.
 * 
 * For simplicity in V2, we take the maximum concurrent need per role.
 */
function aggregateRoleRequirements(templates) {
  const roleMap = {};
  
  for (const template of templates) {
    for (const req of template.roleRequirements || []) {
      const role = req.role.toLowerCase();
      const count = req.count || 1;
      
      // Track the maximum staff needed for this role
      // (simplified: assumes non-overlapping templates need additive staff)
      if (!roleMap[role]) {
        roleMap[role] = { role, count: 0, templates: [] };
      }
      roleMap[role].count += count;
      roleMap[role].templates.push({
        templateId: template._id,
        name: template.name,
        start: template.startTime,
        end: template.endTime,
        count
      });
    }
  }
  
  return Object.values(roleMap);
}

// ============================================================================
// PHASE 2-5: DAILY ASSIGNMENT LOGIC
// ============================================================================

/**
 * Assign staff to work blocks for a single day
 * 
 * CORRECTED APPROACH: Templates define whole day, we assign by role across time
 * - Calculate staffing needs by time of day (reduced opening/closing, full peak)
 * - Assign staff to overlapping work blocks throughout the day
 * - Ensure coverage from opening to closing without over-staffing
 */
function assignDayShifts({ date, dayName, operatingWindow, staff, staffTracker, timeOffRequests }) {
  const assignments = [];
  const warnings = [];
  const MANAGER_ROLES = ['manager', 'assistant_manager'];
  
  // Determine time-based staffing needs
  const staffingNeeds = calculateDailyStaffingNeeds(operatingWindow);
  
  console.log(`    📋 Operating window: ${operatingWindow.start} - ${operatingWindow.end}`);
  console.log(`    📊 Staffing strategy: ${staffingNeeds.opening}staff opening → ${staffingNeeds.peak}staff peak → ${staffingNeeds.closing}staff closing`);
  
  // Assign each role across the day
  for (const roleReq of operatingWindow.roleRequirements) {
    const roleAssignments = assignRoleForDay({
      date,
      dayName,
      role: roleReq.role,
      requiredCount: roleReq.count,
      operatingWindow,
      staffingNeeds,
      staff,
      staffTracker,
      timeOffRequests,
      existingAssignments: assignments
    });
    
    console.log(`    ✓ ${roleReq.role}: ${roleAssignments.assignments.length}/${roleReq.count} assigned`);
    
    assignments.push(...roleAssignments.assignments);
    warnings.push(...roleAssignments.warnings);
  }
  
  // Check for manager coverage
  const hasManagerOpening = assignments.some(a => 
    MANAGER_ROLES.includes(a.role.toLowerCase()) && 
    timeToMinutes(a.start) <= operatingWindow.startMinutes + 60 // Within first hour
  );
  
  const hasManagerClosing = assignments.some(a =>
    MANAGER_ROLES.includes(a.role.toLowerCase()) &&
    timeToMinutes(a.end) >= operatingWindow.endMinutes - 60 // Within last hour
  );
  
  if (!hasManagerOpening) {
    warnings.push({
      type: 'missing_opening_manager',
      severity: 'high',
      message: `No manager scheduled for opening on ${dayName}`,
      dayName
    });
  }
  
  if (!hasManagerClosing) {
    warnings.push({
      type: 'missing_closing_manager', 
      severity: 'high',
      message: `No manager scheduled for closing on ${dayName}`,
      dayName
    });
  }
  
  console.log(`  ✅ ${dayName}: ${assignments.length} total assignments`);
  
  return { assignments, warnings };
}

/**
 * Calculate staffing needs based on time of day
 * 
 * Returns multipliers for different times:
 * - Opening hours (first 2-3 hours): Skeleton crew (0.3-0.4x)
 * - Peak hours (10am-4pm): Full staffing (1.0x)
 * - Closing hours (last 2-3 hours): Closing crew (0.4-0.5x)
 */
function calculateDailyStaffingNeeds(operatingWindow) {
  const OPENING_DURATION = 120; // 2 hours in minutes
  const CLOSING_DURATION = 150; // 2.5 hours in minutes
  const PEAK_START = 10 * 60; // 10am
  const PEAK_END = 16 * 60; // 4pm
  
  return {
    openingEnd: operatingWindow.startMinutes + OPENING_DURATION,
    closingStart: operatingWindow.endMinutes - CLOSING_DURATION,
    peakStart: PEAK_START,
    peakEnd: PEAK_END,
    opening: 0.35, // 35% of full staff for opening
    peak: 1.0,     // 100% of full staff for peak
    closing: 0.45  // 45% of full staff for closing
  };
}

/**
 * Assign staff for a specific role across the full day
 * 
 * Creates staggered, overlapping shifts that provide:
 * - Minimal staff during opening hours
 * - Full staff during peak hours
 * - Adequate staff until closing
 */
function assignRoleForDay({
  date,
  dayName,
  role,
  requiredCount,
  operatingWindow,
  staffingNeeds,
  staff,
  staffTracker,
  timeOffRequests,
  existingAssignments
}) {
  const assignments = [];
  const warnings = [];
  const MANAGER_ROLES = ['manager', 'assistant_manager'];
  const isManagerRole = MANAGER_ROLES.includes(role.toLowerCase());
  
  // Get eligible candidates
  const eligibleStaff = getEligibleStaffForDay({
    date,
    dayName,
    role,
    staff,
    staffTracker,
    timeOffRequests,
    existingAssignments,
    shift: null // No specific shift constraint
  });
  
  if (eligibleStaff.length === 0) {
    warnings.push({
      type: 'NO_ELIGIBLE_STAFF',
      severity: 'high',
      message: `No eligible ${role} staff available for ${dayName}`,
      role
    });
    return { assignments, warnings };
  }
  
  // Score candidates
  const scoredStaff = scoreStaffForDay({
    eligibleStaff,
    dayName,
    role,
    operatingWindow,
    staffTracker
  });
  
  // Assign staff with staggered start times
  // For managers: ensure coverage at opening and closing
  // For other roles: distribute throughout the day
  let assignedCount = 0;
  
  for (const candidate of scoredStaff) {
    if (assignedCount >= requiredCount) break;
    
    const assignment = createDayWorkBlock({
      staff: candidate.staff,
      date,
      dayName,
      role,
      operatingWindow,
      staffingNeeds,
      assignmentIndex: assignedCount,
      totalAssignments: requiredCount,
      isManagerRole,
      staffTracker
    });
    
    if (assignment) {
      assignments.push(assignment);
      assignedCount++;
    }
  }
  
  return { assignments, warnings };
}

/**
 * Create a work block for staff across the day
 * 
 * Intelligently determines:
 * - Shift length (4-10 hours based on remaining hours)
 * - Start time (staggered based on role and assignment index)
 * - End time (ensure coverage until closing for late assignments)
 */
function createDayWorkBlock({
  staff,
  date,
  dayName,
  role,
  operatingWindow,
  staffingNeeds,
  assignmentIndex,
  totalAssignments,
  isManagerRole,
  staffTracker
}) {
  const tracker = staffTracker[staff._id.toString()];
  const MANAGER_ROLES = ['manager', 'assistant_manager'];
  
  // Calculate available hours
  const remainingHours = tracker.maxHours - tracker.weeklyHours;
  if (remainingHours < CONFIG.MIN_SHIFT_HOURS) {
    return null;
  }
  
  // Determine shift length
  const operatingHours = (operatingWindow.endMinutes - operatingWindow.startMinutes) / 60;
  const shiftHours = Math.min(
    remainingHours,
    operatingHours,
    CONFIG.MAX_SHIFT_HOURS
  );
  
  if (shiftHours < CONFIG.MIN_SHIFT_HOURS) {
    return null;
  }
  
  // Calculate start/end times based on assignment strategy
  const { startTime, endTime } = calculateStaggeredShiftTimes({
    operatingWindow,
    staffingNeeds,
    shiftHours,
    assignmentIndex,
    totalAssignments,
    isManagerRole,
    timePreference: staff.timePreference || 'flexible'
  });
  
  // Calculate actual hours
  const actualHours = calculateShiftDuration(startTime, endTime);
  
  // Update tracker
  tracker.weeklyHours += actualHours;
  tracker.daysWorked.add(dayName.toLowerCase());
  tracker.shifts.push({
    start: startTime,
    end: endTime,
    hours: actualHours,
    date: formatDateISO(date)
  });
  
  // Check availability
  const dayLower = dayName.toLowerCase();
  const isAvailable = staff.availableDays?.includes(dayLower) ?? true;
  
  return {
    staffId: staff._id,
    staffName: staff.name,
    role: staff.role,
    start: startTime,
    end: endTime,
    hours: actualHours,
    metadata: {
      isAvailabilityOverride: !isAvailable,
      timePreference: staff.timePreference || 'flexible'
    }
  };
}

/**
 * Calculate staggered shift times to prevent over-staffing early
 * 
 * Strategy:
 * - First staff start at opening
 * - Subsequent staff staggered throughout the day
 * - Last 1-2 staff must work until closing
 * - Managers prioritized for opening and closing coverage
 */
function calculateStaggeredShiftTimes({
  operatingWindow,
  staffingNeeds,
  shiftHours,
  assignmentIndex,
  totalAssignments,
  isManagerRole,
  timePreference
}) {
  const shiftMinutes = shiftHours * 60;
  const operatingMinutes = operatingWindow.endMinutes - operatingWindow.startMinutes;
  
  let startMinutes, endMinutes;
  
  // Managers: First manager at opening, last manager at closing
  if (isManagerRole) {
    if (assignmentIndex === 0) {
      // First manager: open the restaurant
      startMinutes = operatingWindow.startMinutes;
      endMinutes = startMinutes + shiftMinutes;
    } else {
      // Subsequent managers: work until closing
      endMinutes = operatingWindow.endMinutes;
      startMinutes = endMinutes - shiftMinutes;
    }
  }
  // Last 1-2 staff of any role: must close
  else if (assignmentIndex >= totalAssignments  - Math.min(2, totalAssignments)) {
    endMinutes = operatingWindow.endMinutes;
    startMinutes = endMinutes - shiftMinutes;
  }
  // Everyone else: stagger throughout peak period
  else {
    // Distribute start times across the operating window
    // Avoid bunching everyone at opening
    const staggerWindow = operatingMinutes - shiftMinutes;
    const staggerStep = staggerWindow / Math.max(1, totalAssignments - 1);
    const staggerOffset = Math.floor(assignmentIndex * staggerStep);
    
    startMinutes = operatingWindow.startMinutes + staggerOffset;
    endMinutes = startMinutes + shiftMinutes;
  }
  
  // Ensure bounds
  if (startMinutes < operatingWindow.startMinutes) {
    startMinutes = operatingWindow.startMinutes;
  }
  if (endMinutes > operatingWindow.endMinutes) {
    endMinutes = operatingWindow.endMinutes;
  }
  
  // Round to 30-minute intervals
  startMinutes = roundToNearestHalfHour(startMinutes);
  endMinutes = roundToNearestHalfHour(endMinutes);
  
  return {
    startTime: minutesToTime(startMinutes),
    endTime: minutesToTime(endMinutes)
  };
}

// ============================================================================
// PHASE 3: ELIGIBILITY FILTERING
// ============================================================================

/**
 * Get staff eligible to work on a specific day
 * 
 * HARD CONSTRAINTS enforced here:
 * - Must have the required role
 * - Must not have approved time off
 * - Must not exceed weekly max hours
 * - Must not already be working this day (one shift per day)
 */
function getEligibleStaffForDay({
  date,
  dayName,
  role,
  staff,
  staffTracker,
  timeOffRequests,
  existingAssignments,
  shift = null  // No longer used, kept for compatibility
}) {
  const dayLower = dayName.toLowerCase();
  const dateStr = formatDateISO(date);
  
  return staff.filter(member => {
    const tracker = staffTracker[member._id.toString()];
    
    // Hard constraint: Must have required role
    if (member.role.toLowerCase() !== role.toLowerCase()) {
      return false;
    }
    
    // Hard constraint: Must be active
    if (!member.isActive) {
      return false;
    }
    
    // Hard constraint: Already working this day (one shift per day)
    if (tracker.daysWorked.has(dayLower)) {
      return false;
    }
    
    // Hard constraint: Would exceed max weekly hours
    const remainingHours = tracker.maxHours - tracker.weeklyHours;
    if (remainingHours < CONFIG.MIN_SHIFT_HOURS) {
      return false;
    }
    
    // Hard constraint: Has approved time off
    if (hasTimeOff(member._id, date, timeOffRequests)) {
      return false;
    }
    
    return true;
  });
}

/**
 * Check if staff member has approved time off on a date
 */
function hasTimeOff(staffId, date, timeOffRequests) {
  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);
  
  const dateEnd = new Date(date);
  dateEnd.setHours(23, 59, 59, 999);
  
  return timeOffRequests.some(request => {
    if (request.status !== 'approved') return false;
    
    const staffMatch = request.staffId._id 
      ? request.staffId._id.toString() === staffId.toString()
      : request.staffId.toString() === staffId.toString();
    
    if (!staffMatch) return false;
    
    const requestStart = new Date(request.startDate);
    const requestEnd = new Date(request.endDate);
    
    return dateStart <= requestEnd && dateEnd >= requestStart;
  });
}

// ============================================================================
// PHASE 4: CANDIDATE SCORING
// ============================================================================

/**
 * Score eligible staff for day assignment
 * 
 * Higher score = more preferred candidate
 * 
 * Scoring factors:
 * 1. Contract fulfillment: Staff who need more hours score higher
 * 2. Shift consolidation: Prefer staff who can work longer blocks
 * 3. Time preference alignment: Match early/late preferences
 * 4. Availability match: Penalize if outside declared availability
 */
function scoreStaffForDay({
  eligibleStaff,
  dayName,
  role,
  operatingWindow,
  staffTracker,
  templateInfo
}) {
  const dayLower = dayName.toLowerCase();
  
  const scored = eligibleStaff.map(member => {
    const tracker = staffTracker[member._id.toString()];
    const scores = {};
    
    // 1. Contract Fulfillment Score
    // Higher score for staff who are further from their contracted hours
    scores.contractFulfillment = calculateContractScore(member, tracker);
    
    // 2. Shift Consolidation Score
    // Prefer staff who can work meaningful shift lengths
    scores.consolidation = calculateConsolidationScore(member, tracker, operatingWindow);
    
    // 3. Time Preference Score
    // Match early/late preference with shift timing
    // If opening period, penalize late-pref staff; if closing, boost late-pref staff
    let timePrefScore = calculateTimePreferenceScore(member, operatingWindow, templateInfo);
    const openingBoundary = operatingWindow.startMinutes + 120; // Opening = first 2 hours
    const closingBoundary = operatingWindow.endMinutes - 150;   // Closing = last 2.5 hours
    const isOpening = openingBoundary > operatingWindow.startMinutes && openingBoundary <= operatingWindow.endMinutes;
    const isClosing = closingBoundary < operatingWindow.endMinutes && closingBoundary >= operatingWindow.startMinutes;
    const pref = (member.timePreference || 'flexible').toLowerCase();
    if (isOpening && pref === 'late') timePrefScore -= 2; // Penalize late-pref for opening
    if (isClosing && pref === 'late') timePrefScore += 2; // Boost late-pref for closing
    scores.timePreference = timePrefScore;
    
    // 4. Availability Match Score
    // Penalize working outside declared availability
    scores.availabilityMatch = calculateAvailabilityScore(member, dayLower);
    
    // Calculate weighted total
    const totalScore = 
      scores.contractFulfillment * CONFIG.WEIGHTS.CONTRACT_FULFILLMENT +
      scores.consolidation * CONFIG.WEIGHTS.SHIFT_CONSOLIDATION +
      scores.timePreference * CONFIG.WEIGHTS.TIME_PREFERENCE +
      scores.availabilityMatch * CONFIG.WEIGHTS.AVAILABILITY_MATCH;
    
    return {
      staff: member,
      scores,
      totalScore,
      isAvailable: member.availableDays?.includes(dayLower) ?? true,
      remainingHours: tracker.maxHours - tracker.weeklyHours
    };
  });
  
  // Sort by total score (highest first)
  return scored.sort((a, b) => b.totalScore - a.totalScore);
}

/**
 * Contract fulfillment scoring
 * 
 * Staff who have worked fewer hours relative to their target get higher scores.
 * This ensures fair distribution and helps meet contracted hours.
 */
function calculateContractScore(member, tracker) {
  const targetHours = member.contractedHours || member.maxHoursPerWeek || 40;
  const hoursWorked = tracker.weeklyHours;
  
  // Percentage of target still needed
  const percentRemaining = Math.max(0, (targetHours - hoursWorked) / targetHours);
  
  // Score 0-1, higher means more hours needed
  return percentRemaining;
}

/**
 * Shift consolidation scoring
 * 
 * Prefer assigning staff who can work longer, more meaningful shifts.
 * Penalize if we'd have to give them a very short shift.
 */
function calculateConsolidationScore(member, tracker, operatingWindow) {
  const remainingHours = tracker.maxHours - tracker.weeklyHours;
  const operatingHours = (operatingWindow.endMinutes - operatingWindow.startMinutes) / 60;
  
  // How long of a shift can we assign?
  const possibleShiftHours = Math.min(
    remainingHours,
    operatingHours,
    CONFIG.MAX_SHIFT_HOURS
  );
  
  // Score based on proximity to ideal shift length
  if (possibleShiftHours >= CONFIG.IDEAL_SHIFT_HOURS) {
    return 1.0; // Can work ideal length
  } else if (possibleShiftHours >= CONFIG.MIN_SHIFT_HOURS) {
    return possibleShiftHours / CONFIG.IDEAL_SHIFT_HOURS;
  } else {
    return 0.2; // Too short, low priority
  }
}

/**
 * Time preference scoring
 * 
 * Staff with "early" preference score higher for morning shifts.
 * Staff with "late" preference score higher for evening shifts.
 * Staff with "flexible" preference score neutral.
 * 
 * Preference values from Staff model: 'early', 'late', 'flexible'
 */
function calculateTimePreferenceScore(member, operatingWindow, templateInfo) {
  const preference = (member.timePreference || 'flexible').toLowerCase();
  
  // Flexible staff are neutral - they work anywhere
  if (preference === 'flexible' || preference === 'any') {
    return 0.5;
  }
  
  // Determine if the primary work block is early or late
  const midpointMinutes = (operatingWindow.startMinutes + operatingWindow.endMinutes) / 2;
  const boundaryMinutes = CONFIG.EARLY_LATE_BOUNDARY * 60;
  
  const isEarlyShift = midpointMinutes < boundaryMinutes;
  
  if (preference === 'early' && isEarlyShift) {
    return 1.0; // Perfect match
  } else if (preference === 'late' && !isEarlyShift) {
    return 1.0; // Perfect match
  } else {
    return 0.3; // Mismatch, but allowed
  }
}

/**
 * Availability match scoring
 * 
 * Full score if working on an available day.
 * Reduced score (but not zero) if outside availability.
 * This is a SOFT constraint - we allow it with penalty.
 */
function calculateAvailabilityScore(member, dayLower) {
  // If no availability specified, assume flexible
  if (!member.availableDays || member.availableDays.length === 0) {
    return 0.7;
  }
  
  const isAvailable = member.availableDays.includes(dayLower);
  return isAvailable ? 1.0 : 0.2; // Penalty but not blocking
}

// ============================================================================
// PHASE 5: WORK BLOCK ASSIGNMENT
// ============================================================================

/**
 * Create a work block assignment for a staff member
 * 
 * Determines the best start/end times based on:
 * - Operating window
 * - Staff's remaining hours
 * - Shift consolidation preferences
 * - Template coverage needs
 */
function createWorkBlockAssignment({
  staff,
  date,
  dayName,
  role,
  operatingWindow,
  templateInfo,
  staffTracker
}) {
  const tracker = staffTracker[staff._id.toString()];
  const warnings = [];
  
  // Calculate how many hours this person can work
  const remainingHours = tracker.maxHours - tracker.weeklyHours;
  const operatingHours = (operatingWindow.endMinutes - operatingWindow.startMinutes) / 60;
  
  // Determine shift length (prefer longer, consolidated blocks)
  let shiftHours = calculateOptimalShiftLength(remainingHours, operatingHours, staff);
  
  if (shiftHours < CONFIG.MIN_SHIFT_HOURS) {
    // Cannot assign a meaningful shift
    return null;
  }
  
  // Determine start/end times based on preference and coverage
  const { start, end } = calculateShiftTimes({
    staff,
    shiftHours,
    operatingWindow,
    templateInfo
  });
  
  // Check if working outside availability
  const dayLower = dayName.toLowerCase();
  const isAvailable = staff.availableDays?.includes(dayLower) ?? true;
  
  if (!isAvailable) {
    warnings.push({
      type: 'AVAILABILITY_OVERRIDE',
      severity: 'medium',
      message: `${staff.name} assigned on ${dayName} despite not being marked as available. Consider adjusting if problematic.`,
      staffId: staff._id,
      staffName: staff.name,
      dayName
    });
  }
  
  return {
    staffId: staff._id,
    staffName: staff.name,
    role,
    start,
    end,
    hours: calculateShiftDuration(start, end),
    warnings,
    metadata: {
      isAvailabilityOverride: !isAvailable,
      timePreference: staff.timePreference || 'flexible'
    }
  };
}

/**
 * Calculate optimal shift length
 * 
 * Prefer longer shifts when possible, but respect limits.
 */
function calculateOptimalShiftLength(remainingHours, operatingHours, staff) {
  // Maximum we could assign
  const maxPossible = Math.min(remainingHours, operatingHours, CONFIG.MAX_SHIFT_HOURS);
  
  // Aim for ideal length if possible
  if (maxPossible >= CONFIG.IDEAL_SHIFT_HOURS) {
    return CONFIG.IDEAL_SHIFT_HOURS;
  }
  
  // Otherwise, take what we can get
  return Math.max(0, maxPossible);
}

/**
 * Score staff for a specific shift (not whole day)
 * 
 * Similar to scoreStaffForDay but for individual shift windows
 * 
 * CLOSING SHIFT PRIORITY:
 * - Prefer staff who haven't worked yet today (fresh for closing)
 * - Boost score significantly for closing shifts to ensure proper staffing
 */
function scoreStaffForShift({
  eligibleStaff,
  dayName,
  role,
  shift,
  staffTracker
}) {
  const dayLower = dayName.toLowerCase();
  
  const scored = eligibleStaff.map(member => {
    const tracker = staffTracker[member._id.toString()];
    const scores = {};
    
    // 1. Contract Fulfillment Score
    scores.contractFulfillment = calculateContractScore(member, tracker);
    
    // 2. Time Preference Score for this specific shift
    scores.timePreference = calculateShiftTimePreferenceScore(member, shift);
    
    // 3. Availability Match Score
    scores.availabilityMatch = calculateAvailabilityScore(member, dayLower);
    
    // 4. Shift Type Priority Score (NEW)
    // Boost staff who haven't worked today for closing shifts
    scores.shiftTypePriority = 1.0;
    const hasWorkedToday = tracker.daysWorked.has(dayLower);
    
    if (shift.shiftType === 'closing') {
      // Closing: prefer fresh staff who haven't worked today
      scores.shiftTypePriority = hasWorkedToday ? 0.7 : 1.5; // Significant boost for fresh staff
    } else if (shift.shiftType === 'opening') {
      // Opening: prefer fresh staff
      scores.shiftTypePriority = hasWorkedToday ? 0.5 : 1.2;
    } else {
      // Peak: prefer staff who've already worked (can extend their shifts)
      scores.shiftTypePriority = hasWorkedToday ? 1.3 : 1.0;
    }
    
    // Calculate weighted total
    const totalScore = 
      scores.contractFulfillment * CONFIG.WEIGHTS.CONTRACT_FULFILLMENT +
      scores.timePreference * CONFIG.WEIGHTS.TIME_PREFERENCE +
      scores.availabilityMatch * CONFIG.WEIGHTS.AVAILABILITY_MATCH +
      scores.shiftTypePriority * 50; // High weight for shift type priority
    
    return {
      staff: member,
      scores,
      totalScore,
      isAvailable: member.availableDays?.includes(dayLower) ?? true,
      remainingHours: tracker.maxHours - tracker.weeklyHours,
      hasWorkedToday
    };
  });
  
  // Sort by total score (highest first)
  const sorted = scored.sort((a, b) => b.totalScore - a.totalScore);
  
  // Log top candidates for debugging closing shifts
  if (sorted.length > 0 && shift.shiftType === 'closing') {
    console.log(`         🎯 Top closing candidates for ${role}:`);
    sorted.slice(0, 3).forEach((candidate, idx) => {
      console.log(`            ${idx + 1}. ${candidate.staff.name} (score: ${candidate.totalScore.toFixed(1)}, worked today: ${candidate.hasWorkedToday}, hours left: ${candidate.remainingHours.toFixed(1)})`);
    });
  }
  
  return sorted;
}

/**
 * Calculate time preference score for a specific shift
 * 
 * NOTE: This is a MINOR tie-breaker only (weight=5).
 * Time preferences should not prevent proper shift coverage.
 */
function calculateShiftTimePreferenceScore(member, shift) {
  const preference = (member.timePreference || 'flexible').toLowerCase();
  
  // Convert shift start time to minutes
  const shiftStartMinutes = shift.startMinutes;
  const boundaryMinutes = CONFIG.EARLY_LATE_BOUNDARY * 60; // 14:00 = 840 minutes
  
  if (preference === 'flexible') {
    return 1.0; // No preference, always good
  }
  
  if (preference === 'early' && shiftStartMinutes < boundaryMinutes) {
    return 1.0; // Perfect match
  }
  
  if (preference === 'late' && shiftStartMinutes >= boundaryMinutes) {
    return 1.0; // Perfect match
  }
  
  // Mismatch - still acceptable (0.8 means minimal penalty)
  // We want staff to work where needed, not just where they prefer
  return 0.8;
}

/**
 * Create assignment for a specific shift
 * 
 * Calculates optimal start/end times within the shift window based on:
 * - Staff time preference (early/late/flexible)
 * - Maximum shift hours (8h ideal, 10h max)
 * - Remaining weekly hours
 * - Assignment index for staggering (creates realistic overlaps)
 */
function createShiftAssignment({
  staff,
  date,
  dayName,
  shift,
  staffTracker,
  assignmentIndex = 0,
  totalAssignments = 1
}) {
  const tracker = staffTracker[staff._id.toString()];
  
  // Calculate shift duration
  const shiftDurationHours = (shift.endMinutes - shift.startMinutes) / 60;
  
  // Check if staff has enough remaining hours
  const remainingHours = tracker.maxHours - tracker.weeklyHours;
  
  if (remainingHours < CONFIG.MIN_SHIFT_HOURS) {
    // Staff maxed out for the week
    return null;
  }
  
  // Calculate how many hours this person should work
  // (less than or equal to shift duration and remaining hours)
  const maxPossibleHours = Math.min(
    shiftDurationHours,
    remainingHours,
    CONFIG.MAX_SHIFT_HOURS
  );
  
  // Aim for ideal shift length if possible
  const assignedHours = maxPossibleHours >= CONFIG.IDEAL_SHIFT_HOURS 
    ? CONFIG.IDEAL_SHIFT_HOURS 
    : maxPossibleHours;
  
  if (assignedHours < CONFIG.MIN_SHIFT_HOURS) {
    // Not worth assigning such a short shift
    return null;
  }
  
  // Calculate start/end times based on preference and stagger for realistic overlaps
  const { startTime, endTime } = calculateWorkBlockTimes({
    shiftStartMinutes: shift.startMinutes,
    shiftEndMinutes: shift.endMinutes,
    hoursToAssign: assignedHours,
    timePreference: staff.timePreference || 'flexible',
    assignmentIndex,
    totalAssignments,
    shiftType: shift.shiftType  // Pass shift type for closing shift logic
  });
  
  // Recalculate actual hours based on rounded times (to 0.5 hour precision)
  const actualHours = calculateShiftDuration(startTime, endTime);
  
  // Update tracker
  tracker.weeklyHours += actualHours;
  tracker.daysWorked.add(dayName.toLowerCase());
  tracker.shifts.push({
    start: startTime,
    end: endTime,
    hours: actualHours,
    date: formatDateISO(date)
  });
  
  // Check availability
  const dayLower = dayName.toLowerCase();
  const isAvailable = staff.availableDays?.includes(dayLower) ?? true;
  
  return {
    staffId: staff._id,
    staffName: staff.name,
    role: staff.role,
    start: startTime,
    end: endTime,
    hours: actualHours,
    shiftType: shift.shiftType,
    shiftName: shift.name,
    metadata: {
      isAvailabilityOverride: !isAvailable,
      timePreference: staff.timePreference || 'flexible'
    }
  };
}

/**
 * Round minutes to nearest 30-minute interval
 * 
 * Examples:
 * - 370 minutes (6:10) -> 360 (6:00)
 * - 385 minutes (6:25) -> 390 (6:30)
 * - 395 minutes (6:35) -> 390 (6:30)
 */
function roundToNearestHalfHour(minutes) {
  return Math.round(minutes / 30) * 30;
}

/**
 * Calculate start/end times for a work block within a shift window
 * 
 * Creates realistic overlapping shifts by staggering start times:
 * - Early preference: Start at beginning or slightly after
 * - Late preference: Start mid-way or later, end at closing  
 * - Flexible: Start anywhere that creates natural overlap
 * 
 * Special handling for CLOSING shifts:
 * - Last 1-2 staff assigned MUST work until shift end (closing time)
 * - Earlier staff can have staggered times
 * 
 * All times are rounded to 30-minute intervals (e.g., 6:00, 6:30, 7:00)
 * 
 * OVERLAP STRATEGY:
 * For a 12-hour operating window (8am-8pm) with 8-hour shifts:
 * - Early: 8am-4pm
 * - Mid-Early: 10am-6pm (overlaps 2hrs with early, 2hrs with late)
 * - Mid-Late: 12pm-8pm (overlaps 4hrs with mid-early)
 * - Late: 2pm-10pm (if needed)
 */
function calculateWorkBlockTimes({ 
  shiftStartMinutes, 
  shiftEndMinutes, 
  hoursToAssign, 
  timePreference, 
  assignmentIndex = 0, 
  totalAssignments = 1,
  shiftType = null
}) {
  const assignMinutes = hoursToAssign * 60;
  const windowMinutes = shiftEndMinutes - shiftStartMinutes;
  
  let startMinutes, endMinutes;
  
  // If shift is short enough to cover fully, just work the whole window
  if (assignMinutes >= windowMinutes) {
    return {
      startTime: minutesToTime(roundToNearestHalfHour(shiftStartMinutes)),
      endTime: minutesToTime(roundToNearestHalfHour(shiftEndMinutes))
    };
  }
  
  // CLOSING SHIFT SPECIAL HANDLING
  // Last 1-2 staff MUST work until closing time
  if (shiftType === 'closing' && totalAssignments >= 2) {
    const isLastStaff = assignmentIndex >= totalAssignments - 2;
    
    if (isLastStaff) {
      // These staff work until the end
      endMinutes = shiftEndMinutes;
      startMinutes = endMinutes - assignMinutes;
      
      // Make sure start isn't before shift begins
      if (startMinutes < shiftStartMinutes) {
        startMinutes = shiftStartMinutes;
        endMinutes = startMinutes + assignMinutes;
      }
      
      // Round to 30-minute intervals
      startMinutes = roundToNearestHalfHour(startMinutes);
      endMinutes = roundToNearestHalfHour(endMinutes);
      
      // Ensure end time reaches shift end for closing
      if (endMinutes < roundToNearestHalfHour(shiftEndMinutes)) {
        endMinutes = roundToNearestHalfHour(shiftEndMinutes);
      }
      
      return {
        startTime: minutesToTime(startMinutes),
        endTime: minutesToTime(endMinutes)
      };
    }
  }
  
  // Calculate stagger offset to create overlaps
  // More staff = more staggering needed
  const maxStaggerWindow = windowMinutes - assignMinutes;
  
  if (timePreference === 'early') {
    // Early preference: start at beginning or slightly staggered
    // Use first 40% of possible start times
    const maxEarlyOffset = Math.floor(maxStaggerWindow * 0.4);
    const staggerOffset = Math.floor((assignmentIndex / Math.max(1, totalAssignments)) * maxEarlyOffset);
    
    startMinutes = shiftStartMinutes + staggerOffset;
    endMinutes = startMinutes + assignMinutes;
  } else if (timePreference === 'late') {
    // Late preference: end at closing or work the later part
    // Use last 40% of possible start times
    const minLateOffset = Math.floor(maxStaggerWindow * 0.6);
    const staggerOffset = minLateOffset + Math.floor((assignmentIndex / Math.max(1, totalAssignments)) * (maxStaggerWindow - minLateOffset));
    
    startMinutes = shiftStartMinutes + staggerOffset;
    endMinutes = startMinutes + assignMinutes;
  } else {
    // Flexible: stagger across the full window to maximize coverage
    // Distribute evenly across all possible start times
    const staggerOffset = Math.floor((assignmentIndex / Math.max(1, totalAssignments)) * maxStaggerWindow);
    
    startMinutes = shiftStartMinutes + staggerOffset;
    endMinutes = startMinutes + assignMinutes;
  }
  
  // Round to 30-minute intervals
  startMinutes = roundToNearestHalfHour(startMinutes);
  endMinutes = roundToNearestHalfHour(endMinutes);
  
  // Ensure we don't exceed boundaries after rounding
  if (endMinutes > shiftEndMinutes) {
    endMinutes = roundToNearestHalfHour(shiftEndMinutes);
    startMinutes = endMinutes - assignMinutes;
    startMinutes = roundToNearestHalfHour(startMinutes);
  }
  if (startMinutes < shiftStartMinutes) {
    startMinutes = roundToNearestHalfHour(shiftStartMinutes);
    endMinutes = startMinutes + assignMinutes;
    endMinutes = roundToNearestHalfHour(endMinutes);
  }
  
  return {
    startTime: minutesToTime(startMinutes),
    endTime: minutesToTime(endMinutes)
  };
}

/**
 * Calculate specific start/end times for a shift
 * 
 * Takes into account:
 * - Staff's early/late/flexible preference
 * - Operating window constraints
 * - Template coverage requirements
 * 
 * All times are rounded to 30-minute intervals
 */
function calculateShiftTimes({ staff, shiftHours, operatingWindow, templateInfo }) {
  const preference = (staff.timePreference || 'flexible').toLowerCase();
  const shiftMinutes = shiftHours * 60;
  
  let startMinutes;
  
  if (preference === 'early') {
    // Start as early as possible
    startMinutes = operatingWindow.startMinutes;
  } else if (preference === 'late') {
    // Start as late as possible while still fitting the shift
    startMinutes = Math.max(
      operatingWindow.startMinutes,
      operatingWindow.endMinutes - shiftMinutes
    );
  } else {
    // "flexible" preference: try to cover the busiest period
    // Default to starting from the beginning for simplicity
    // A more sophisticated version could analyze template distribution
    startMinutes = operatingWindow.startMinutes;
  }
  
  // Round to 30-minute intervals
  startMinutes = roundToNearestHalfHour(startMinutes);
  const endMinutes = startMinutes + shiftMinutes;
  
  return {
    start: minutesToTime(startMinutes),
    end: minutesToTime(roundToNearestHalfHour(endMinutes % 1440))
  };
}

// ============================================================================
// PHASE 6: TRACKING
// ============================================================================

/**
 * Initialize tracking structure for each staff member
 */
function initializeStaffTracker(staff) {
  const tracker = {};
  
  for (const member of staff) {
    tracker[member._id.toString()] = {
      staffId: member._id,
      name: member.name,
      role: member.role,
      maxHours: member.maxHoursPerWeek || 40,
      contractedHours: member.contractedHours || member.maxHoursPerWeek || 40,
      weeklyHours: 0,
      daysWorked: new Set(),
      shifts: []
    };
  }
  
  return tracker;
}

/**
 * Update tracker after an assignment
 */
function updateStaffTracker(tracker, staffId, assignment) {
  const staffTracker = tracker[staffId.toString()];
  if (!staffTracker) return;
  
  staffTracker.weeklyHours += assignment.hours;
  staffTracker.daysWorked.add(assignment.dayName?.toLowerCase() || getDayFromAssignment(assignment));
  staffTracker.shifts.push({
    start: assignment.start,
    end: assignment.end,
    hours: assignment.hours,
    role: assignment.role
  });
}

/**
 * Extract day name from assignment if not directly available
 */
function getDayFromAssignment(assignment) {
  // This would parse from the date field if needed
  return 'unknown';
}

// ============================================================================
// PHASE 7: WARNING GENERATION
// ============================================================================

/**
 * Generate warnings about contract fulfillment
 */
function generateContractWarnings(staffTracker, staff) {
  const warnings = [];
  
  for (const member of staff) {
    if (!member.isActive) continue;
    
    const tracker = staffTracker[member._id.toString()];
    if (!tracker) continue;
    
    const target = tracker.contractedHours;
    const worked = tracker.weeklyHours;
    const percentFulfilled = target > 0 ? (worked / target) * 100 : 100;
    
    // Warn if significantly under target
    if (percentFulfilled < 80 && target > 0) {
      warnings.push({
        type: 'UNDER_CONTRACT',
        severity: 'medium',
        message: `${member.name} scheduled for ${worked.toFixed(1)}h but contracted for ${target}h (${percentFulfilled.toFixed(0)}%)`,
        staffId: member._id,
        staffName: member.name,
        hoursScheduled: worked,
        hoursContracted: target,
        percentFulfilled: percentFulfilled.toFixed(1)
      });
    }
    
    // Warn if at max hours
    if (worked >= tracker.maxHours * 0.95) {
      warnings.push({
        type: 'NEAR_MAX_HOURS',
        severity: 'low',
        message: `${member.name} is at ${worked.toFixed(1)}h/${tracker.maxHours}h maximum`,
        staffId: member._id,
        staffName: member.name,
        hoursScheduled: worked,
        maxHours: tracker.maxHours
      });
    }
  }
  
  return warnings;
}

/**
 * Check for coverage gaps in the day's schedule
 */
function checkCoverageGaps(operatingWindow, assignments, dayName) {
  const warnings = [];
  
  if (assignments.length === 0 && operatingWindow.hasOperations) {
    warnings.push({
      type: 'NO_COVERAGE',
      severity: 'high',
      message: `No staff assigned for ${dayName} despite operating hours defined`,
      dayName
    });
    return warnings;
  }
  
  // Group assignments by role
  const byRole = {};
  for (const assignment of assignments) {
    if (!byRole[assignment.role]) {
      byRole[assignment.role] = [];
    }
    byRole[assignment.role].push(assignment);
  }
  
  // Check each required role has coverage
  for (const roleReq of operatingWindow.roleRequirements || []) {
    const assigned = byRole[roleReq.role.toLowerCase()]?.length || 0;
    if (assigned < roleReq.count) {
      // Warning already generated in assignRoleForDay, skip duplicate
    }
  }
  
  return warnings;
}

// ============================================================================
// SUMMARY GENERATION
// ============================================================================

/**
 * Generate summary statistics for the rota
 */
function generateRotaSummary(days, staffTracker, staff) {
  let totalAssignments = 0;
  let totalHours = 0;
  let totalWarnings = 0;
  
  for (const day of days) {
    totalAssignments += day.assignments.length;
    totalHours += day.assignments.reduce((sum, a) => sum + (a.hours || 0), 0);
    totalWarnings += day.warnings.length;
  }
  
  const staffUtilization = staff
    .filter(s => s.isActive)
    .map(member => {
      const tracker = staffTracker[member._id.toString()];
      return {
        staffId: member._id,
        name: member.name,
        role: member.role,
        hoursScheduled: tracker?.weeklyHours || 0,
        hoursContracted: tracker?.contractedHours || 0,
        daysWorked: tracker?.daysWorked?.size || 0,
        utilizationPercent: tracker?.contractedHours > 0
          ? ((tracker.weeklyHours / tracker.contractedHours) * 100).toFixed(1)
          : '0'
      };
    });
  
  return {
    totalAssignments,
    totalHours: totalHours.toFixed(1),
    totalWarnings,
    staffUtilization,
    averageHoursPerAssignment: totalAssignments > 0 
      ? (totalHours / totalAssignments).toFixed(1) 
      : '0'
  };
}

// ============================================================================
// UTILITY HELPERS
// ============================================================================

/**
 * Create an empty day structure (for days with no operations)
 */
function createEmptyDay(date, dayName) {
  return {
    date: formatDateISO(date),
    dayName,
    operatingStart: null,
    operatingEnd: null,
    requiredRoles: [],
    assignments: [],
    warnings: []
  };
}

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

/**
 * Convert minutes since midnight to time string (HH:MM)
 */
function minutesToTime(minutes) {
  const normalizedMinutes = ((minutes % 1440) + 1440) % 1440; // Handle negative/overflow
  const hours = Math.floor(normalizedMinutes / 60);
  const mins = normalizedMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Format date to ISO string (YYYY-MM-DD)
 */
function formatDateISO(date) {
  return date.toISOString().split('T')[0];
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  generateWeeklyRota,
  
  // Export helpers for testing
  _internal: {
    expandTemplatesToDailyWindows,
    getEligibleStaffForDay,
    scoreStaffForDay,
    createWorkBlockAssignment,
    calculateContractScore,
    calculateConsolidationScore,
    calculateTimePreferenceScore,
    calculateAvailabilityScore,
    initializeStaffTracker,
    CONFIG
  }
};
