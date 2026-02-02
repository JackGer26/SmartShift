const mongoose = require('mongoose');
const Staff = require('../src/models/Staff');
const { STAFF_ROLES } = require('../src/models/constants');

/**
 * Script to clean up and standardize staff roles in the database
 * Maps existing roles to approved roles and fixes any inconsistencies
 */

// Role mapping for common variations
const ROLE_MAPPING = {
  // Existing -> Standard
  'head chef': 'head_chef',
  'headchef': 'head_chef',
  'sous chef': 'chef',
  'souschef': 'chef',
  'cook': 'chef',
  'kitchen staff': 'kitchen_assistant',
  'server': 'waiter',
  'waitress': 'waiter',
  'waiter/waitress': 'waiter',
  'head waiter': 'head_waiter',
  'headwaiter': 'head_waiter',
  'senior waiter': 'head_waiter',
  'bar staff': 'bartender',
  'barman': 'bartender',
  'barmaid': 'bartender',
  'head bartender': 'head_bartender',
  'headbartender': 'head_bartender',
  'senior bartender': 'head_bartender',
  'host': 'hostess',
  'hostess/host': 'hostess',
  'driver': 'delivery_driver',
  'delivery': 'delivery_driver',
  'cleaning': 'cleaner',
  'cleaning staff': 'cleaner',
  'janitor': 'cleaner',
  'dishwasher': 'kitchen_assistant',
  'prep cook': 'kitchen_assistant',
  'trainee staff': 'trainee',
  'apprentice': 'trainee',
  'intern': 'trainee'
};

const cleanupStaffRoles = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/smartshift-restaurant');
    console.log('✅ Connected to MongoDB');

    // Get all active staff members
    const allStaff = await Staff.find({ isActive: true });
    console.log(`📊 Found ${allStaff.length} active staff members`);

    // Analyze current roles
    const currentRoles = {};
    const invalidRoles = [];
    
    allStaff.forEach(staff => {
      const role = staff.role.toLowerCase().trim();
      currentRoles[role] = (currentRoles[role] || 0) + 1;
      
      if (!STAFF_ROLES.includes(staff.role) && !ROLE_MAPPING[role]) {
        invalidRoles.push({ name: staff.name, currentRole: staff.role });
      }
    });

    console.log('\n📋 Current role distribution:');
    Object.entries(currentRoles).forEach(([role, count]) => {
      const isValid = STAFF_ROLES.includes(role);
      const isMapped = ROLE_MAPPING[role];
      const status = isValid ? '✅' : isMapped ? '🔄' : '❌';
      console.log(`  ${status} ${role}: ${count}`);
    });

    if (invalidRoles.length > 0) {
      console.log('\n⚠️  Staff with invalid roles:');
      invalidRoles.forEach(staff => {
        console.log(`  - ${staff.name}: "${staff.currentRole}"`);
      });
    }

    // Perform cleanup
    let updatedCount = 0;
    const updates = [];

    for (const staff of allStaff) {
      const currentRole = staff.role.toLowerCase().trim();
      let newRole = staff.role;

      // Check if role needs mapping
      if (ROLE_MAPPING[currentRole]) {
        newRole = ROLE_MAPPING[currentRole];
        updates.push({ name: staff.name, old: staff.role, new: newRole });
      }
      // Check if role is invalid and needs default assignment
      else if (!STAFF_ROLES.includes(staff.role)) {
        newRole = 'waiter'; // Default role for unknown roles
        updates.push({ name: staff.name, old: staff.role, new: newRole, note: 'Unknown role - defaulted to waiter' });
      }

      // Update if different
      if (newRole !== staff.role) {
        staff.role = newRole;
        await staff.save();
        updatedCount++;
      }
    }

    if (updates.length > 0) {
      console.log('\n🔄 Role updates performed:');
      updates.forEach(update => {
        const note = update.note ? ` (${update.note})` : '';
        console.log(`  - ${update.name}: "${update.old}" → "${update.new}"${note}`);
      });
    }

    console.log(`\n✅ Cleanup completed! Updated ${updatedCount} staff members.`);
    console.log('\n📋 Valid roles in system:');
    STAFF_ROLES.forEach(role => console.log(`  - ${role}`));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
};

// Run the cleanup if this script is executed directly
if (require.main === module) {
  cleanupStaffRoles();
}

module.exports = { cleanupStaffRoles, ROLE_MAPPING };