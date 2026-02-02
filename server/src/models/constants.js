/**
 * SmartShift Restaurant Rota Builder - Shared Constants
 * 
 * Centralized constants for consistent data validation across the restaurant system.
 * Ensures data integrity and provides single source of truth for enums and constraints.
 */

// Restaurant staff roles - core job positions
const STAFF_ROLES = [
  'manager',
  'assistant_manager',
  'head_chef',
  'chef',
  'kitchen_assistant',
  'head_waiter',
  'waiter',
  'head_bartender',
  'bartender',
  'hostess',
  'delivery_driver',
  'trainee',
  'cleaner'
];

// Days of the week - for availability and shift templates
const DAYS_OF_WEEK = [
  'monday',
  'tuesday', 
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
];

// Time off request types
const TIME_OFF_TYPES = [
  'holiday',           // Planned vacation time
  'sick',              // Illness/medical leave
  'personal',          // Personal matters
  'family_emergency',  // Family emergency
  'other'              // Other reasons
];

// Time off request statuses
const TIME_OFF_STATUSES = [
  'pending',    // Awaiting manager approval
  'approved',   // Approved by manager
  'denied'      // Rejected by manager
];

// Shift assignment statuses
const SHIFT_STATUSES = [
  'scheduled',  // Initial assignment
  'confirmed',  // Staff member confirmed
  'completed',  // Shift finished successfully
  'missed'      // Staff member no-show
];

// Weekly rota statuses
const ROTA_STATUSES = [
  'draft',      // Being created/edited
  'published',  // Released to staff
  'archived'    // Past week, read-only
];

// Business constraints
const CONSTRAINTS = {
  MIN_HOURLY_RATE: 10.50,        // UK minimum wage (example)
  MAX_HOURLY_RATE: 50.00,        // Maximum reasonable rate
  MIN_HOURS_PER_WEEK: 0,         // Part-time minimum
  MAX_HOURS_PER_WEEK: 60,        // Legal maximum with overtime
  DEFAULT_HOURS_PER_WEEK: 40,    // Standard full-time
  MIN_STAFF_PER_SHIFT: 1,        // At least one person
  MAX_STAFF_PER_SHIFT: 10,       // Reasonable maximum
  SHIFT_PRIORITY_MIN: 1,         // Low priority
  SHIFT_PRIORITY_MAX: 5          // High priority
};

// Regular expressions for validation
const PATTERNS = {
  TIME_24H: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, // HH:MM format
  UK_PHONE: /^(\+44\s?7\d{3}\s?\d{6}|0[1-9]\d{8,9})$/,  // UK mobile/landline
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/              // Basic email format
};

module.exports = {
  STAFF_ROLES,
  DAYS_OF_WEEK,
  TIME_OFF_TYPES,
  TIME_OFF_STATUSES,
  SHIFT_STATUSES,
  ROTA_STATUSES,
  CONSTRAINTS,
  PATTERNS
};