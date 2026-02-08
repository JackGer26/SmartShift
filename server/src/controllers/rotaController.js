const RotaWeek = require('../models/RotaWeek');
const Staff = require('../models/Staff');
// const rotaGenerationService = require('../services/rotaGenerationService'); // V1 service - replaced by V2
const HardConstraintValidator = require('../utils/hardConstraintValidator');
const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { getWeekStart, getDayName } = require('../utils/dateUtils');
const { Parser } = require('json2csv');

/**
 * Rota Controller
 * Handles rota generation, viewing, and management
 */

// @desc    Get all rota weeks with filtering and pagination
// @route   GET /api/rota?status=draft&from=2024-01-01&to=2024-12-31&limit=10&offset=0
// @access  Public
const getAllRotaWeeks = asyncHandler(async (req, res) => {
  const {
    status,
    from,
    to,
    limit = 20,
    offset = 0,
    sortBy = 'weekStartDate',
    order = 'desc'
  } = req.query;

  // Build filter object
  const filter = {};
  if (status) filter.status = status;
  if (from || to) {
    filter.weekStartDate = {};
    if (from) filter.weekStartDate.$gte = new Date(from);
    if (to) filter.weekStartDate.$lte = new Date(to);
  }

  // Build sort object
  const sortOrder = order === 'desc' ? -1 : 1;
  const sort = { [sortBy]: sortOrder };

  const [rotas, total] = await Promise.all([
    RotaWeek.find(filter)
      .sort(sort)
      .limit(Math.min(parseInt(limit), 50))
      .skip(parseInt(offset))
      .populate('shifts.staffId', 'name email role hourlyRate')
      .populate('shifts.shiftTemplateId', 'name requiredRole dayOfWeek')
      .select('-__v'),
    RotaWeek.countDocuments(filter)
  ]);

  res.json({
    success: true,
    count: rotas.length,
    total,
    data: rotas,
    pagination: {
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: parseInt(offset) + rotas.length < total
    }
  });
});

// @desc    Get rota week by ID
// @route   GET /api/rota/:id
// @access  Public
const getRotaWeekById = async (req, res, next) => {
  try {
    const rota = await RotaWeek.findById(req.params.id)
      .populate('shifts.staffId', 'name email role hourlyRate')
      .populate('shifts.shiftTemplateId', 'name requiredRole dayOfWeek');

    if (!rota) {
      return res.status(404).json({
        success: false,
        error: 'Rota not found'
      });
    }

    res.json({
      success: true,
      data: rota
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get rota week by week start date
// @route   GET /api/rota/week/:date
// @access  Public
const getRotaWeekByDate = asyncHandler(async (req, res) => {
  const inputDate = new Date(req.params.date);
  
  if (isNaN(inputDate.getTime())) {
    throw new ValidationError('Invalid date format. Please use YYYY-MM-DD.');
  }

  const weekStart = getWeekStart(inputDate);

  const rota = await RotaWeek.findOne({ weekStartDate: weekStart })
    .populate('shifts.staffId', 'name email role hourlyRate contractedHours')
    .populate('shifts.shiftTemplateId', 'name requiredRole dayOfWeek startTime endTime')
    .select('-__v');

  if (!rota) {
    throw new NotFoundError(`No rota found for week starting ${weekStart.toISOString().split('T')[0]}`);
  }

  // Add daily breakdown for better frontend consumption
  const dailyBreakdown = generateDailyBreakdown(rota);
  const transformedRota = transformRotaForFrontend(rota);

  res.json({
    success: true,
    data: transformedRota
  });
});

// @desc    Generate new rota week
// @route   POST /api/rota/generate
// @access  Public
const generateRotaWeek = async (req, res, next) => {
  try {
    const { 
      weekStartDate, 
      debug = false,
      templateIds = null,
      days = null,
      autoAssignStaff = true,
      useTemplates = true
    } = req.body;

    if (!weekStartDate) {
      return res.status(400).json({
        success: false,
        error: 'Week start date is required'
      });
    }

    // Enable debug logging if requested
    const rotaGenerationService = require('../services/rotaGenerationService');
    rotaGenerationService.debug = true; // Always enable for now

    const result = await rotaGenerationService.generateWeeklyRota(
      new Date(weekStartDate), 
      {
        templateIds,
        days,
        autoAssignStaff,
        useTemplates
      }
    );

    // Transform data for frontend consumption
    const transformedRota = transformRotaForFrontend(result.rota);

    res.status(201).json({
      success: true,
      data: transformedRota,
      analysis: result.analysis,
      performance: result.performance,
      message: `Rota generated successfully - ${result.performance.fillRate}% fill rate`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save manual edits to rota week
// @route   PUT /api/rota/:id
// @access  Public
const updateRotaWeek = asyncHandler(async (req, res) => {
  const { shifts, notes, manualOverrides } = req.body;
  
  const rota = await RotaWeek.findById(req.params.id);
  if (!rota) {
    throw new NotFoundError('Rota not found');
  }

  // Prevent editing published rotas unless specifically allowed
  if (rota.status === 'published' && !req.body.allowEditPublished) {
    throw new ValidationError('Cannot edit published rota. Set allowEditPublished=true to override.');
  }

  // Validate shift assignments if provided
  if (shifts) {
    await validateShiftAssignments(shifts);
    rota.shifts = shifts;
  }

  // Update metadata
  if (notes) rota.notes = notes;
  if (manualOverrides) {
    rota.manualOverrides = {
      ...rota.manualOverrides,
      ...manualOverrides,
      lastEditedAt: new Date(),
      lastEditedBy: req.user?.id || 'system' // Add user tracking if auth implemented
    };
  }

  // Recalculate totals
  await recalculateRotaTotals(rota);

  // Save with validation
  await rota.save();
  await rota.populate('shifts.staffId shifts.shiftTemplateId');

  res.json({
    success: true,
    data: rota,
    message: 'Rota updated successfully'
  });
});

// @desc    Publish rota week (make visible to staff)
// @route   POST /api/rota/:id/publish
// @access  Public
const publishRotaWeek = asyncHandler(async (req, res) => {
  const { notifyStaff = true, publishNotes } = req.body;
  
  const rota = await RotaWeek.findById(req.params.id)
    .populate('shifts.staffId', 'name email phone')
    .populate('shifts.shiftTemplateId');

  if (!rota) {
    throw new NotFoundError('Rota not found');
  }

  if (rota.status === 'published') {
    return res.json({
      success: true,
      message: 'Rota is already published',
      data: rota
    });
  }

  // Validate rota before publishing
  const validation = await validateRotaForPublishing(rota);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      error: 'Rota validation failed',
      issues: validation.issues,
      message: 'Please resolve issues before publishing'
    });
  }

  // Update rota status and metadata
  rota.status = 'published';
  rota.publishedAt = new Date();
  rota.publishedBy = req.user?.id || 'system';
  if (publishNotes) rota.publishNotes = publishNotes;

  await rota.save();

  // Optional: Send notifications to staff
  let notificationResults = null;
  if (notifyStaff) {
    notificationResults = await notifyStaffOfPublishedRota(rota);
  }

  res.json({
    success: true,
    data: rota,
    message: 'Rota published successfully',
    validation,
    notifications: notificationResults
  });
});

// @desc    Delete rota week
// @route   DELETE /api/rota/:id
// @access  Public
const deleteRotaWeek = async (req, res, next) => {
  try {
    const rota = await RotaWeek.findById(req.params.id);

    if (!rota) {
      return res.status(404).json({
        success: false,
        error: 'Rota not found'
      });
    }

    if (rota.status === 'published') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete published rota'
      });
    }

    await rota.deleteOne();

    res.json({
      success: true,
      message: 'Rota deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export rota week as CSV
// @route   GET /api/rota/:id/export/csv
// @access  Public
const exportRotaAsCSV = asyncHandler(async (req, res) => {
  const { format = 'detailed' } = req.query;
  
  const rota = await RotaWeek.findById(req.params.id)
    .populate('shifts.staffId', 'name email role hourlyRate')
    .populate('shifts.shiftTemplateId', 'name requiredRole dayOfWeek');

  if (!rota) {
    throw new NotFoundError('Rota not found');
  }

  let csvData, filename;

  if (format === 'summary') {
    // Staff summary format
    csvData = generateStaffSummaryCSV(rota);
    filename = `rota-summary-${rota.weekStartDate.toISOString().split('T')[0]}.csv`;
  } else {
    // Detailed shift format
    csvData = generateDetailedRotaCSV(rota);
    filename = `rota-detailed-${rota.weekStartDate.toISOString().split('T')[0]}.csv`;
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csvData);
});

// @desc    Get rota week statistics
// @route   GET /api/rota/:id/stats
// @access  Public
const getRotaStats = asyncHandler(async (req, res) => {
  const rota = await RotaWeek.findById(req.params.id)
    .populate('shifts.staffId', 'name role hourlyRate contractedHours')
    .populate('shifts.shiftTemplateId');

  if (!rota) {
    throw new NotFoundError('Rota not found');
  }

  const stats = calculateRotaStatistics(rota);

  res.json({
    success: true,
    data: {
      rotaId: rota._id,
      weekStart: rota.weekStartDate,
      status: rota.status,
      statistics: stats
    }
  });
});

// @desc    Get staff hours summary for a rota
// @route   GET /api/rota/:id/staff-hours
// @access  Public
const getStaffHours = asyncHandler(async (req, res) => {
  const rota = await RotaWeek.findById(req.params.id)
    .populate('shifts.staffId', 'name role hourlyRate maxHoursPerWeek contractedHours');

  if (!rota) {
    throw new NotFoundError('Rota not found');
  }

  // Calculate hours per staff member
  const staffHoursMap = {};

  for (const shift of rota.shifts) {
    if (!shift.staffId) continue;

    const staffId = shift.staffId._id.toString();
    const duration = calculateShiftDuration(shift.startTime, shift.endTime);

    if (!staffHoursMap[staffId]) {
      staffHoursMap[staffId] = {
        staffId: shift.staffId._id,
        firstName: shift.staffId.name?.split(' ')[0] || shift.staffId.name,
        lastName: shift.staffId.name?.split(' ').slice(1).join(' ') || '',
        name: shift.staffId.name,
        role: shift.staffId.role,
        hourlyRate: shift.staffId.hourlyRate,
        maxHoursPerWeek: shift.staffId.maxHoursPerWeek || 40,
        contractedHours: shift.staffId.contractedHours || 0,
        totalHours: 0,
        shiftCount: 0,
        shifts: [],
        dailyHours: {
          monday: 0, tuesday: 0, wednesday: 0, thursday: 0,
          friday: 0, saturday: 0, sunday: 0
        }
      };
    }

    staffHoursMap[staffId].totalHours += duration;
    staffHoursMap[staffId].shiftCount += 1;
    staffHoursMap[staffId].shifts.push({
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      duration
    });

    // Track daily hours
    const dayName = getDayName(new Date(shift.date)).toLowerCase();
    if (staffHoursMap[staffId].dailyHours[dayName] !== undefined) {
      staffHoursMap[staffId].dailyHours[dayName] += duration;
    }
  }

  const staffHours = Object.values(staffHoursMap);

  res.json({
    success: true,
    data: staffHours
  });
});

// @desc    Validate staff assignment against hard constraints
// @route   POST /api/rota/validate-assignment
// @access  Public
const validateStaffAssignment = asyncHandler(async (req, res) => {
  const { staffId, shiftDate, startTime, endTime, requiredRole, rotaId } = req.body;

  if (!staffId || !shiftDate || !startTime || !endTime || !requiredRole) {
    throw new ValidationError('Missing required fields: staffId, shiftDate, startTime, endTime, requiredRole');
  }

  // Prepare assignment object
  const assignment = {
    staffId,
    shiftDate: new Date(shiftDate),
    startTime,
    endTime,
    requiredRole
  };

  // Get existing assignments context if rotaId provided
  let context = {};
  if (rotaId) {
    const rota = await RotaWeek.findById(rotaId);
    if (rota) {
      context.existingAssignments = rota.shifts;
      
      // Build staff hour tracker
      context.staffHourTracker = {};
      rota.shifts.forEach(shift => {
        if (shift.staffId) {
          const staffId = shift.staffId.toString();
          const duration = calculateShiftDuration(shift.startTime, shift.endTime);
          
          if (!context.staffHourTracker[staffId]) {
            context.staffHourTracker[staffId] = { scheduledHours: 0 };
          }
          context.staffHourTracker[staffId].scheduledHours += duration;
        }
      });
    }
  }

  // Validate the assignment
  const validation = await HardConstraintValidator.validateStaffAssignment(assignment, context);

  res.json({
    success: true,
    data: {
      assignment,
      validation,
      canAssign: validation.isValid,
      constraints: HardConstraintValidator.getConstraintConfig()
    }
  });
});

// @desc    Get soft constraint scoring analytics for staff assignment
// @route   POST /api/rota/score-assignment
// @access  Public
const getAssignmentScoring = asyncHandler(async (req, res) => {
  const { staffList, shiftDate, startTime, endTime, requiredRole, rotaId } = req.body;

  if (!staffList || !shiftDate || !startTime || !endTime || !requiredRole) {
    throw new ValidationError('Missing required fields: staffList, shiftDate, startTime, endTime, requiredRole');
  }

  // Get full staff details
  const fullStaffDetails = await Staff.find({
    _id: { $in: staffList },
    isActive: true
  });

  // Prepare slot object
  const slot = {
    shift: {
      date: new Date(shiftDate),
      dayName: getDayName(new Date(shiftDate)).toLowerCase(),
      startTime,
      endTime,
      shiftDuration: calculateShiftDuration(startTime, endTime)
    },
    requiredRole
  };

  // Build context and staff hour tracker
  let context = {};
  let staffHourTracker = {};
  
  // Initialize basic tracker
  fullStaffDetails.forEach(staff => {
    staffHourTracker[staff._id.toString()] = {
      staff: staff,
      scheduledHours: 0,
      shiftCount: 0,
      maxHours: staff.maxHoursPerWeek || 40,
      contractedHours: staff.maxHoursPerWeek || 0,
      shifts: []
    };
  });

  if (rotaId) {
    const rota = await RotaWeek.findById(rotaId);
    if (rota) {
      context.existingAssignments = rota.shifts;
      
      // Update staff hour tracker with current assignments
      rota.shifts.forEach(shift => {
        if (shift.staffId) {
          const staffId = shift.staffId.toString();
          const duration = calculateShiftDuration(shift.startTime, shift.endTime);
          
          if (staffHourTracker[staffId]) {
            staffHourTracker[staffId].scheduledHours += duration;
            staffHourTracker[staffId].shiftCount += 1;
            staffHourTracker[staffId].shifts.push({
              date: shift.date,
              startTime: shift.startTime,
              endTime: shift.endTime,
              duration: duration
            });
          }
        }
      });
    }
  }

  // Get scoring from soft constraint scorer
  const SoftConstraintScorer = require('../utils/softConstraintScorer');
  const scoredStaff = SoftConstraintScorer.scoreMultipleStaff(
    fullStaffDetails,
    slot,
    context,
    staffHourTracker
  );

  res.json({
    success: true,
    data: {
      slot,
      scoredStaff,
      scoringConfig: SoftConstraintScorer.getScoringConfig(),
      analysis: {
        totalStaff: scoredStaff.length,
        averageScore: scoredStaff.reduce((sum, s) => sum + s.totalScore, 0) / scoredStaff.length,
        bestMatch: scoredStaff[0],
        scoreRange: {
          highest: Math.max(...scoredStaff.map(s => s.totalScore)),
          lowest: Math.min(...scoredStaff.map(s => s.totalScore))
        }
      }
    }
  });
});

// @desc    Validate entire rota against hard constraints
// @route   POST /api/rota/:id/validate
// @access  Public
const validateEntireRota = asyncHandler(async (req, res) => {
  const rota = await RotaWeek.findById(req.params.id)
    .populate('shifts.staffId', 'name email role maxHoursPerWeek dateOfBirth availableDays');

  if (!rota) {
    throw new NotFoundError('Rota not found');
  }

  const validation = await HardConstraintValidator.validateRotaConstraints(rota._id, rota.shifts);

  res.json({
    success: true,
    data: {
      rotaId: rota._id,
      weekStart: rota.weekStartDate,
      validation,
      constraintConfig: HardConstraintValidator.getConstraintConfig()
    }
  });
});

// @desc    Clone rota to another week
// @route   POST /api/rota/:id/clone
// @access  Public
const cloneRota = asyncHandler(async (req, res) => {
  const { targetWeekStart } = req.body;
  
  if (!targetWeekStart) {
    throw new ValidationError('Target week start date is required');
  }

  const sourceRota = await RotaWeek.findById(req.params.id);
  if (!sourceRota) {
    throw new NotFoundError('Source rota not found');
  }

  const targetDate = getWeekStart(new Date(targetWeekStart));
  
  // Check if target week already has a rota
  const existingRota = await RotaWeek.findOne({ weekStartDate: targetDate });
  if (existingRota) {
    throw new ValidationError('Rota already exists for target week');
  }

  // Clone the rota
  const clonedRota = new RotaWeek({
    weekStartDate: targetDate,
    weekEndDate: new Date(targetDate.getTime() + 6 * 24 * 60 * 60 * 1000),
    shifts: sourceRota.shifts.map(shift => ({
      ...shift.toObject(),
      _id: undefined,
      date: new Date(targetDate.getTime() + 
        (shift.date.getTime() - sourceRota.weekStartDate.getTime()))
    })),
    status: 'draft',
    notes: `Cloned from week ${sourceRota.weekStartDate.toISOString().split('T')[0]}`,
    totalStaffHours: sourceRota.totalStaffHours,
    totalLaborCost: sourceRota.totalLaborCost
  });

  await clonedRota.save();
  await clonedRota.populate('shifts.staffId shifts.shiftTemplateId');

  res.status(201).json({
    success: true,
    data: clonedRota,
    message: 'Rota cloned successfully'
  });
});

/**
 * Helper Methods
 */

// Generate daily breakdown for better frontend consumption
const generateDailyBreakdown = (rota) => {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const breakdown = {};

  days.forEach((day, index) => {
    const dayDate = new Date(rota.weekStartDate.getTime() + index * 24 * 60 * 60 * 1000);
    const dayShifts = rota.shifts.filter(shift => 
      shift.date.toDateString() === dayDate.toDateString()
    );

    breakdown[day] = {
      date: dayDate,
      shifts: dayShifts.map(shift => ({
        id: shift._id,
        staff: shift.staffId,
        template: shift.shiftTemplateId,
        startTime: shift.startTime,
        endTime: shift.endTime,
        status: shift.status
      })),
      totalHours: dayShifts.reduce((sum, shift) => {
        const { calculateShiftDuration } = require('../utils/dateUtils');
        const duration = calculateShiftDuration(shift.startTime, shift.endTime);
        return sum + duration;
      }, 0),
      staffCount: dayShifts.length
    };
  });

  return breakdown;
};

// Transform rota data for frontend consumption
// Groups shifts by template/time/date and collects staff into assignedStaff arrays
const transformRotaForFrontend = (rota) => {
  const rotaObj = rota.toObject ? rota.toObject() : rota;
  
  console.log(`🔄 Transforming rota for frontend: ${rotaObj.shifts.length} shifts`);
  
  // Group shifts by date + template + time
  const shiftMap = new Map();
  
  rotaObj.shifts.forEach(shift => {
    const key = `${shift.date.toISOString()}_${shift.shiftTemplateId}_${shift.startTime}_${shift.endTime}`;
    
    if (!shiftMap.has(key)) {
      shiftMap.set(key, {
        id: shift._id,
        shiftTemplateId: shift.shiftTemplateId,
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        status: shift.status,
        requiredRole: shift.shiftTemplateId?.requiredRole,
        templateName: shift.shiftTemplateId?.name,
        requiredStaffCount: 1,
        assignedStaff: []
      });
    }
    
    // Add staff to assignedStaff array if staff is assigned
    if (shift.staffId) {
      const shiftGroup = shiftMap.get(key);
      const staffData = {
        id: shift.staffId._id || shift.staffId,
        firstName: shift.staffId.firstName || shift.staffId.name?.split(' ')[0] || '',
        lastName: shift.staffId.lastName || shift.staffId.name?.split(' ')[1] || '',
        name: shift.staffId.name,
        role: shift.staffId.role,
        hourlyRate: shift.staffId.hourlyRate,
        // Include individual shift times (for V2 rota generator)
        start: shift.startTime,
        end: shift.endTime,
        hours: calculateShiftDuration(shift.startTime, shift.endTime)
      };
      console.log(`  Adding ${staffData.name}: ${staffData.start} - ${staffData.end} (${staffData.hours}h)`);
      shiftGroup.assignedStaff.push(staffData);
    }
  });
  
  // Convert map to array
  const groupedShifts = Array.from(shiftMap.values());
  
  console.log(`✅ Transformed to ${groupedShifts.length} grouped shifts with individual staff times`);
  
  return {
    _id: rotaObj._id,
    weekStartDate: rotaObj.weekStartDate,
    weekEndDate: rotaObj.weekEndDate,
    status: rotaObj.status,
    totalStaffHours: rotaObj.totalStaffHours,
    totalLaborCost: rotaObj.totalLaborCost,
    shifts: groupedShifts,
    createdAt: rotaObj.createdAt,
    updatedAt: rotaObj.updatedAt
  };
};

// Validate shift assignments
const validateShiftAssignments = async (shifts) => {
  const issues = [];

  for (const shift of shifts) {
    // Validate staff exists and is active
    if (shift.staffId) {
      const staff = await Staff.findOne({ _id: shift.staffId, isActive: true });
      if (!staff) {
        issues.push(`Staff member ${shift.staffId} not found or inactive`);
        continue;
      }

      // Check if staff is available on the day
      const dayName = getDayName(shift.date).toLowerCase();
      if (!staff.availableDays.includes(dayName)) {
        issues.push(`${staff.name} is not available on ${dayName}`);
      }
    }
  }

  if (issues.length > 0) {
    throw new ValidationError(`Shift validation failed: ${issues.join(', ')}`);
  }
};

// Recalculate rota totals after manual edits
const recalculateRotaTotals = async (rota) => {
  let totalHours = 0;
  let totalCost = 0;

  for (const shift of rota.shifts) {
    const duration = calculateShiftDuration(shift.startTime, shift.endTime);
    totalHours += duration;

    if (shift.staffId) {
      const staff = await Staff.findById(shift.staffId);
      if (staff) {
        totalCost += duration * staff.hourlyRate;
      }
    }
  }

  rota.totalStaffHours = Math.round(totalHours * 100) / 100;
  rota.totalLaborCost = Math.round(totalCost * 100) / 100;
};

// Validate rota before publishing
const validateRotaForPublishing = async (rota) => {
  const issues = [];
  
  // Check for unfilled critical shifts
  const criticalUnfilledShifts = rota.shifts.filter(shift => 
    !shift.staffId && shift.priority > 3
  );
  
  if (criticalUnfilledShifts.length > 0) {
    issues.push(`${criticalUnfilledShifts.length} critical shifts are unfilled`);
  }

  // Check for staff conflicts
  const conflicts = detectShiftConflicts(rota.shifts);
  if (conflicts.length > 0) {
    issues.push(`${conflicts.length} shift conflicts detected`);
  }

  // Check for minimum staffing requirements
  const understaffedDays = checkMinimumStaffing(rota);
  if (understaffedDays.length > 0) {
    issues.push(`Understaffed on: ${understaffedDays.join(', ')}`);
  }

  return {
    isValid: issues.length === 0,
    issues,
    timestamp: new Date()
  };
};

// Notify staff of published rota
const notifyStaffOfPublishedRota = async (rota) => {
  const notificationResults = {
    sent: 0,
    failed: 0,
    staff: []
  };

  // Get unique staff from shifts
  const staffInRota = new Set();
  rota.shifts.forEach(shift => {
    if (shift.staffId) {
      staffInRota.add(shift.staffId._id.toString());
    }
  });

  for (const staffId of staffInRota) {
    const staff = rota.shifts.find(s => s.staffId._id.toString() === staffId)?.staffId;
    if (staff && staff.email) {
      try {
        // Here you would integrate with email service
        // await emailService.sendRotaNotification(staff.email, rota);
        notificationResults.sent++;
        notificationResults.staff.push({
          name: staff.name,
          email: staff.email,
          status: 'sent'
        });
      } catch (error) {
        notificationResults.failed++;
        notificationResults.staff.push({
          name: staff.name,
          email: staff.email,
          status: 'failed',
          error: error.message
        });
      }
    }
  }

  return notificationResults;
};

// Generate detailed CSV
const generateDetailedRotaCSV = (rota) => {
  const shifts = rota.shifts.map(shift => ({
    Date: shift.date.toLocaleDateString(),
    Day: getDayName(shift.date),
    'Staff Name': shift.staffId?.name || 'Unassigned',
    Role: shift.staffId?.role || '',
    'Shift Template': shift.shiftTemplateId?.name || '',
    'Start Time': shift.startTime,
    'End Time': shift.endTime,
    'Duration (hours)': calculateShiftDuration(shift.startTime, shift.endTime),
    'Hourly Rate': shift.staffId?.hourlyRate || 0,
    'Shift Cost': shift.staffId ? 
      (calculateShiftDuration(shift.startTime, shift.endTime) * shift.staffId.hourlyRate).toFixed(2) : 0,
    Status: shift.status,
    Email: shift.staffId?.email || ''
  }));

  const parser = new Parser();
  return parser.parse(shifts);
};

// Generate staff summary CSV
const generateStaffSummaryCSV = (rota) => {
  const staffSummary = {};

  // Group shifts by staff
  rota.shifts.forEach(shift => {
    if (!shift.staffId) return;
    
    const staffId = shift.staffId._id.toString();
    if (!staffSummary[staffId]) {
      staffSummary[staffId] = {
        'Staff Name': shift.staffId.name,
        Role: shift.staffId.role,
        'Hourly Rate': shift.staffId.hourlyRate,
        'Total Hours': 0,
        'Total Cost': 0,
        'Shift Count': 0,
        Email: shift.staffId.email
      };
    }

    const duration = calculateShiftDuration(shift.startTime, shift.endTime);
    staffSummary[staffId]['Total Hours'] += duration;
    staffSummary[staffId]['Total Cost'] += duration * shift.staffId.hourlyRate;
    staffSummary[staffId]['Shift Count']++;
  });

  const summaryArray = Object.values(staffSummary).map(summary => ({
    ...summary,
    'Total Hours': summary['Total Hours'].toFixed(1),
    'Total Cost': summary['Total Cost'].toFixed(2)
  }));

  const parser = new Parser();
  return parser.parse(summaryArray);
};

// Calculate comprehensive rota statistics
const calculateRotaStatistics = (rota) => {
  const stats = {
    overview: {
      totalShifts: rota.shifts.length,
      filledShifts: rota.shifts.filter(s => s.staffId).length,
      unfilledShifts: rota.shifts.filter(s => !s.staffId).length,
      totalHours: rota.totalStaffHours,
      totalCost: rota.totalLaborCost,
      averageCostPerHour: rota.totalStaffHours > 0 ? (rota.totalLaborCost / rota.totalStaffHours).toFixed(2) : 0
    },
    byRole: {},
    byDay: {},
    staffUtilization: {}
  };

  // Calculate by role
  rota.shifts.forEach(shift => {
    if (shift.staffId) {
      const role = shift.staffId.role;
      if (!stats.byRole[role]) {
        stats.byRole[role] = { count: 0, hours: 0, cost: 0 };
      }
      
      const duration = calculateShiftDuration(shift.startTime, shift.endTime);
      stats.byRole[role].count++;
      stats.byRole[role].hours += duration;
      stats.byRole[role].cost += duration * shift.staffId.hourlyRate;
    }
  });

  // Calculate by day
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  days.forEach((day, index) => {
    const dayDate = new Date(rota.weekStartDate.getTime() + index * 24 * 60 * 60 * 1000);
    const dayShifts = rota.shifts.filter(shift => 
      shift.date.toDateString() === dayDate.toDateString()
    );
    
    stats.byDay[day] = {
      shifts: dayShifts.length,
      filledShifts: dayShifts.filter(s => s.staffId).length,
      hours: dayShifts.reduce((sum, shift) => {
        return sum + calculateShiftDuration(shift.startTime, shift.endTime);
      }, 0)
    };
  });

  // Calculate staff utilization
  const staffHours = {};
  rota.shifts.forEach(shift => {
    if (shift.staffId) {
      const staffId = shift.staffId._id.toString();
      if (!staffHours[staffId]) {
        staffHours[staffId] = {
          name: shift.staffId.name,
          hours: 0,
          shifts: 0,
          contractedHours: shift.staffId.contractedHours || 0
        };
      }
      
      staffHours[staffId].hours += calculateShiftDuration(shift.startTime, shift.endTime);
      staffHours[staffId].shifts++;
    }
  });

  stats.staffUtilization = Object.values(staffHours).map(staff => ({
    ...staff,
    utilizationRate: staff.contractedHours > 0 ? 
      ((staff.hours / staff.contractedHours) * 100).toFixed(1) : 'N/A'
  }));

  return stats;
};

// Detect shift conflicts
const detectShiftConflicts = (shifts) => {
  const conflicts = [];
  const sortedShifts = [...shifts].sort((a, b) => 
    a.date.getTime() - b.date.getTime() || 
    timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  );

  for (let i = 0; i < sortedShifts.length - 1; i++) {
    for (let j = i + 1; j < sortedShifts.length; j++) {
      const shift1 = sortedShifts[i];
      const shift2 = sortedShifts[j];

      if (shift1.staffId && shift2.staffId && 
          shift1.staffId.toString() === shift2.staffId.toString() &&
          shift1.date.toDateString() === shift2.date.toDateString()) {
        
        if (shiftsOverlap(shift1.startTime, shift1.endTime, shift2.startTime, shift2.endTime)) {
          conflicts.push({ shift1: shift1._id, shift2: shift2._id });
        }
      }
    }
  }

  return conflicts;
};

// Check minimum staffing requirements
const checkMinimumStaffing = (rota) => {
  const understaffedDays = [];
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  days.forEach((day, index) => {
    const dayDate = new Date(rota.weekStartDate.getTime() + index * 24 * 60 * 60 * 1000);
    const dayShifts = rota.shifts.filter(shift => 
      shift.date.toDateString() === dayDate.toDateString() && shift.staffId
    );
    
    // Basic check: ensure at least 1 person scheduled per day
    // You could make this more sophisticated based on business requirements
    if (dayShifts.length === 0) {
      understaffedDays.push(day);
    }
  });

  return understaffedDays;
};

// Calculate shift duration helper
function calculateShiftDuration(startTime, endTime) {
  const { calculateShiftDuration: utilCalculateShiftDuration } = require('../utils/dateUtils');
  return utilCalculateShiftDuration(startTime, endTime);
}

// Utility methods
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const shiftsOverlap = (start1, end1, start2, end2) => {
  const start1Minutes = timeToMinutes(start1);
  const end1Minutes = timeToMinutes(end1);
  const start2Minutes = timeToMinutes(start2);
  const end2Minutes = timeToMinutes(end2);

  return start1Minutes < end2Minutes && start2Minutes < end1Minutes;
};

// ============================================================================
// V2 ROTA GENERATOR - Production-Grade Algorithm
// ============================================================================

const ShiftTemplate = require('../models/ShiftTemplate');
const TimeOff = require('../models/TimeOff');

// @desc    Generate rota using V2 algorithm (production-grade)
// @route   POST /api/rota/generate-v2
// @access  Public
const generateRotaWeekV2 = asyncHandler(async (req, res) => {
  const { 
    weekStartDate,
    saveToDatabase = true
  } = req.body;

  if (!weekStartDate) {
    return res.status(400).json({
      success: false,
      error: 'Week start date is required'
    });
  }

  // Import the V2 generator
  const { generateWeeklyRota } = require('../services/rotaGeneratorV2');
  
  // Normalize to Monday
  const mondayDate = getWeekStart(new Date(weekStartDate));
  const sundayDate = new Date(mondayDate);
  sundayDate.setDate(sundayDate.getDate() + 6);

  // Check if rota already exists for this week
  const existingRota = await RotaWeek.findOne({ weekStartDate: mondayDate });
  if (existingRota) {
    return res.status(400).json({
      success: false,
      error: `Rota already exists for week starting ${mondayDate.toISOString().split('T')[0]}. Delete the existing rota first or use a different week.`
    });
  }

  // Gather all required data
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

  // Validate we have required data
  if (shiftTemplates.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No active shift templates found. Create shift templates before generating a rota.'
    });
  }

  if (staff.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No active staff members found. Add staff before generating a rota.'
    });
  }

  // Generate the rota using V2 algorithm
  let result;
  try {
    console.log('🎯 Controller: Calling V2 generator...');
    result = generateWeeklyRota({
      weekStartDate: mondayDate,
      shiftTemplates,
      staff,
      timeOffRequests
    });
    console.log('✅ Controller: V2 generator returned successfully');
  } catch (generatorError) {
    console.error('❌ Controller: V2 generator failed:', generatorError.message);
    return res.status(500).json({
      success: false,
      error: `Rota generation failed: ${generatorError.message}`,
      details: generatorError.stack
    });
  }

  // Calculate totals for storage
  let totalStaffHours = 0;
  let totalLaborCost = 0;

  // Transform V2 output to database format if saving
  let savedRota = null;
  
  if (saveToDatabase) {
    // Convert V2 assignments to database shifts format
    const dbShifts = [];
    
    console.log('📊 Converting V2 assignments to database format...');
    
    for (const day of result.days) {
      console.log(`  Day ${day.dayName}: ${day.assignments.length} assignments`);
      
      for (const assignment of day.assignments) {
        if (assignment.staffId) {
          console.log(`    - ${assignment.staffName}: ${assignment.start} - ${assignment.end} (${assignment.hours}h)`);
          
          // Find the template that matches this assignment
          const matchingTemplate = shiftTemplates.find(t => {
            const dayName = getDayName(new Date(day.date)).toLowerCase();
            return t.dayOfWeek === dayName;
          });

          const shiftHours = assignment.hours || 0;
          totalStaffHours += shiftHours;
          
          // Find staff hourly rate
          const staffMember = staff.find(s => s._id.toString() === assignment.staffId.toString());
          if (staffMember) {
            totalLaborCost += shiftHours * staffMember.hourlyRate;
          }

          dbShifts.push({
            staffId: assignment.staffId,
            shiftTemplateId: matchingTemplate?._id,
            date: new Date(day.date),
            startTime: assignment.start,
            endTime: assignment.end,
            status: 'scheduled',
            role: assignment.role,
            notes: assignment.warnings?.length > 0 
              ? assignment.warnings.map(w => w.message).join('; ')
              : undefined
          });
        }
      }
    }
    
    console.log(`✅ Created ${dbShifts.length} database shifts`);
    console.log(`📊 Total hours: ${totalStaffHours}, Total cost: $${totalLaborCost}`);

    // Save to database
    savedRota = new RotaWeek({
      weekStartDate: mondayDate,
      weekEndDate: sundayDate,
      shifts: dbShifts,
      status: 'draft',
      totalStaffHours: Math.round(totalStaffHours * 100) / 100,
      totalLaborCost: Math.round(totalLaborCost * 100) / 100,
      notes: `Generated using V2 algorithm on ${new Date().toISOString()}`
    });

    await savedRota.save();
    await savedRota.populate('shifts.staffId shifts.shiftTemplateId');
  }

  // Build response
  const responseData = savedRota ? transformRotaForFrontend(savedRota) : result;
  
  // Log sample of what's being sent
  if (responseData.shifts && responseData.shifts.length > 0) {
    console.log('\n📤 Sample shift being sent to frontend:');
    const sampleShift = responseData.shifts[0];
    console.log(`  Shift: ${sampleShift.startTime} - ${sampleShift.endTime}`);
    console.log(`  Assigned staff: ${sampleShift.assignedStaff?.length || 0}`);
    if (sampleShift.assignedStaff && sampleShift.assignedStaff.length > 0) {
      const sampleStaff = sampleShift.assignedStaff[0];
      console.log(`  Staff example: ${sampleStaff.name}`);
      console.log(`    - Individual times: ${sampleStaff.start} - ${sampleStaff.end} (${sampleStaff.hours}h)`);
    }
  }
  
  const response = {
    success: true,
    data: responseData,
    v2Result: result,
    summary: result.summary,
    globalWarnings: result.globalWarnings,
    message: `Rota generated successfully with ${result.summary.totalAssignments} assignments`
  };

  res.status(201).json(response);
});

// @desc    Preview rota using V2 algorithm (without saving)
// @route   POST /api/rota/preview-v2
// @access  Public
const previewRotaWeekV2 = asyncHandler(async (req, res) => {
  const { weekStartDate } = req.body;

  if (!weekStartDate) {
    return res.status(400).json({
      success: false,
      error: 'Week start date is required'
    });
  }

  // Import the V2 generator
  const { generateWeeklyRota } = require('../services/rotaGeneratorV2');
  
  // Normalize to Monday
  const mondayDate = getWeekStart(new Date(weekStartDate));
  const sundayDate = new Date(mondayDate);
  sundayDate.setDate(sundayDate.getDate() + 6);

  // Gather all required data
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

  // Generate preview (not saved)
  const result = generateWeeklyRota({
    weekStartDate: mondayDate,
    shiftTemplates,
    staff,
    timeOffRequests
  });

  res.json({
    success: true,
    preview: true,
    data: result,
    summary: result.summary,
    globalWarnings: result.globalWarnings,
    message: 'Preview generated - not saved to database'
  });
});

module.exports = {
  getAllRotaWeeks,
  getRotaWeekById,
  getRotaWeekByDate,
  generateRotaWeek,
  generateRotaWeekV2,
  previewRotaWeekV2,
  updateRotaWeek,
  publishRotaWeek,
  deleteRotaWeek,
  exportRotaAsCSV,
  getRotaStats,
  getStaffHours,
  validateStaffAssignment,
  getAssignmentScoring,
  validateEntireRota,
  cloneRota
};