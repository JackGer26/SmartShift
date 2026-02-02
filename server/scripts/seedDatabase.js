const mongoose = require('mongoose');
const Staff = require('../src/models/Staff');
const ShiftTemplate = require('../src/models/ShiftTemplate');
const TimeOff = require('../src/models/TimeOff');
const RotaWeek = require('../src/models/RotaWeek');
require('dotenv').config();

/**
 * 🍽️ DEMO RESTAURANT SEED DATA
 * "The Golden Crown" - Fine Dining Restaurant
 * 
 * Scenario: Busy restaurant with mixed staff, varied availability,
 * and realistic scheduling challenges for demo purposes
 */

// 🏗️ STAFF TEAM (15 members with diverse roles and availability)
const demoStaff = [
  // === MANAGEMENT ===
  {
    name: 'Sarah Williams',
    email: 'sarah.williams@goldencrown.co.uk',
    phone: '+44 7700 900001',
    role: 'manager',
    hourlyRate: 22.50,
    maxHoursPerWeek: 45,
    contractHours: 40,
    age: 32,
    experienceLevel: 'senior',
    availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    preferredAvailability: {
      monday: { start: '10:00', end: '18:00', preferred: true },
      tuesday: { start: '10:00', end: '18:00', preferred: true },
      wednesday: { start: '10:00', end: '18:00', preferred: true },
      thursday: { start: '10:00', end: '18:00', preferred: true },
      friday: { start: '12:00', end: '20:00', preferred: true },
      saturday: { start: '12:00', end: '20:00', preferred: false }
    },
    qualifications: ['manager', 'chef', 'waiter'],
    isActive: true
  },
  {
    name: 'Michael Chen',
    email: 'michael.chen@goldencrown.co.uk',
    phone: '+44 7700 900002',
    role: 'assistant_manager',
    hourlyRate: 18.00,
    maxHoursPerWeek: 42,
    contractHours: 35,
    age: 28,
    experienceLevel: 'experienced',
    availableDays: ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    preferredAvailability: {
      tuesday: { start: '14:00', end: '22:00', preferred: true },
      wednesday: { start: '14:00', end: '22:00', preferred: true },
      thursday: { start: '14:00', end: '22:00', preferred: true },
      friday: { start: '16:00', end: '00:00', preferred: true },
      saturday: { start: '16:00', end: '00:00', preferred: true },
      sunday: { start: '12:00', end: '20:00', preferred: false }
    },
    qualifications: ['assistant_manager', 'waiter', 'bartender'],
    isActive: true
  },

  // === HEAD CHEF & KITCHEN ===
  {
    name: 'Antonio Rossi',
    email: 'antonio.rossi@goldencrown.co.uk',
    phone: '+44 7700 900003',
    role: 'head_chef',
    hourlyRate: 20.00,
    maxHoursPerWeek: 48,
    contractHours: 40,
    age: 45,
    experienceLevel: 'senior',
    availableDays: ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    preferredAvailability: {
      tuesday: { start: '14:00', end: '22:00', preferred: true },
      wednesday: { start: '14:00', end: '22:00', preferred: true },
      thursday: { start: '14:00', end: '22:00', preferred: true },
      friday: { start: '16:00', end: '23:30', preferred: true },
      saturday: { start: '16:00', end: '23:30', preferred: true }
    },
    qualifications: ['head_chef', 'chef'],
    isActive: true
  },
  {
    name: 'Emma Thompson',
    email: 'emma.thompson@goldencrown.co.uk',
    phone: '+44 7700 900004',
    role: 'chef',
    hourlyRate: 16.50,
    maxHoursPerWeek: 40,
    contractHours: 32,
    age: 26,
    experienceLevel: 'experienced',
    availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    preferredAvailability: {
      monday: { start: '08:00', end: '16:00', preferred: true },
      tuesday: { start: '08:00', end: '16:00', preferred: true },
      wednesday: { start: '08:00', end: '16:00', preferred: true },
      thursday: { start: '10:00', end: '18:00', preferred: false },
      friday: { start: '10:00', end: '18:00', preferred: false }
    },
    qualifications: ['chef'],
    isActive: true
  },
  {
    name: 'Hassan Ali',
    email: 'hassan.ali@goldencrown.co.uk',
    phone: '+44 7700 900005',
    role: 'kitchen_assistant',
    hourlyRate: 12.50,
    maxHoursPerWeek: 35,
    contractHours: 20,
    age: 22,
    experienceLevel: 'beginner',
    availableDays: ['wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    preferredAvailability: {
      wednesday: { start: '16:00', end: '22:00', preferred: true },
      thursday: { start: '16:00', end: '22:00', preferred: true },
      friday: { start: '17:00', end: '23:00', preferred: true },
      saturday: { start: '17:00', end: '23:00', preferred: true },
      sunday: { start: '12:00', end: '18:00', preferred: false }
    },
    qualifications: ['kitchen_assistant'],
    isActive: true
  },

  // === SENIOR WAITERS ===
  {
    name: 'Sophie Martinez',
    email: 'sophie.martinez@goldencrown.co.uk',
    phone: '+44 7700 900006',
    role: 'head_waiter',
    hourlyRate: 15.50,
    maxHoursPerWeek: 40,
    contractHours: 32,
    age: 30,
    experienceLevel: 'senior',
    availableDays: ['thursday', 'friday', 'saturday', 'sunday'],
    preferredAvailability: {
      thursday: { start: '17:00', end: '23:00', preferred: true },
      friday: { start: '17:00', end: '00:00', preferred: true },
      saturday: { start: '17:00', end: '00:00', preferred: true },
      sunday: { start: '12:00', end: '22:00', preferred: false }
    },
    qualifications: ['head_waiter', 'waiter'],
    isActive: true
  },
  {
    name: 'James Robertson',
    email: 'james.robertson@goldencrown.co.uk',
    phone: '+44 7700 900007',
    role: 'waiter',
    hourlyRate: 13.50,
    maxHoursPerWeek: 35,
    contractHours: 25,
    age: 24,
    experienceLevel: 'experienced',
    availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'sunday'],
    preferredAvailability: {
      monday: { start: '12:00', end: '20:00', preferred: true },
      tuesday: { start: '12:00', end: '20:00', preferred: true },
      wednesday: { start: '12:00', end: '20:00', preferred: true },
      thursday: { start: '12:00', end: '20:00', preferred: false },
      sunday: { start: '12:00', end: '18:00', preferred: true }
    },
    qualifications: ['waiter'],
    isActive: true
  },

  // === JUNIOR WAITERS ===
  {
    name: 'Lucy Anderson',
    email: 'lucy.anderson@goldencrown.co.uk',
    phone: '+44 7700 900008',
    role: 'waiter',
    hourlyRate: 12.00,
    maxHoursPerWeek: 30,
    contractHours: 16,
    age: 19,
    experienceLevel: 'beginner',
    availableDays: ['friday', 'saturday', 'sunday'],
    preferredAvailability: {
      friday: { start: '18:00', end: '00:00', preferred: true },
      saturday: { start: '18:00', end: '00:00', preferred: true },
      sunday: { start: '12:00', end: '22:00', preferred: true }
    },
    qualifications: ['waiter'],
    isActive: true
  },
  {
    name: 'David Kim',
    email: 'david.kim@goldencrown.co.uk',
    phone: '+44 7700 900009',
    role: 'waiter',
    hourlyRate: 12.50,
    maxHoursPerWeek: 25,
    contractHours: 12,
    age: 20,
    experienceLevel: 'beginner',
    availableDays: ['tuesday', 'wednesday', 'thursday', 'saturday'],
    preferredAvailability: {
      tuesday: { start: '18:00', end: '23:00', preferred: true },
      wednesday: { start: '18:00', end: '23:00', preferred: true },
      thursday: { start: '18:00', end: '23:00', preferred: false },
      saturday: { start: '12:00', end: '18:00', preferred: true }
    },
    qualifications: ['waiter'],
    isActive: true
  },

  // === BAR STAFF ===
  {
    name: 'Isabella Rodriguez',
    email: 'isabella.rodriguez@goldencrown.co.uk',
    phone: '+44 7700 900010',
    role: 'head_bartender',
    hourlyRate: 16.00,
    maxHoursPerWeek: 40,
    contractHours: 30,
    age: 29,
    experienceLevel: 'senior',
    availableDays: ['wednesday', 'thursday', 'friday', 'saturday'],
    preferredAvailability: {
      wednesday: { start: '19:00', end: '01:00', preferred: false },
      thursday: { start: '19:00', end: '01:00', preferred: true },
      friday: { start: '19:00', end: '02:00', preferred: true },
      saturday: { start: '19:00', end: '02:00', preferred: true }
    },
    qualifications: ['head_bartender', 'bartender'],
    isActive: true
  },
  {
    name: 'Oliver Jackson',
    email: 'oliver.jackson@goldencrown.co.uk',
    phone: '+44 7700 900011',
    role: 'bartender',
    hourlyRate: 13.00,
    maxHoursPerWeek: 32,
    contractHours: 20,
    age: 23,
    experienceLevel: 'experienced',
    availableDays: ['monday', 'tuesday', 'friday', 'saturday', 'sunday'],
    preferredAvailability: {
      monday: { start: '18:00', end: '23:00', preferred: true },
      tuesday: { start: '18:00', end: '23:00', preferred: true },
      friday: { start: '17:00', end: '01:00', preferred: false },
      saturday: { start: '17:00', end: '01:00', preferred: true },
      sunday: { start: '16:00', end: '22:00', preferred: true }
    },
    qualifications: ['bartender'],
    isActive: true
  },

  // === SUPPORT STAFF ===
  {
    name: 'Grace Wilson',
    email: 'grace.wilson@goldencrown.co.uk',
    phone: '+44 7700 900012',
    role: 'hostess',
    hourlyRate: 11.50,
    maxHoursPerWeek: 25,
    contractHours: 15,
    age: 21,
    experienceLevel: 'experienced',
    availableDays: ['thursday', 'friday', 'saturday', 'sunday'],
    preferredAvailability: {
      thursday: { start: '17:00', end: '22:00', preferred: true },
      friday: { start: '17:00', end: '23:00', preferred: true },
      saturday: { start: '17:00', end: '23:00', preferred: true },
      sunday: { start: '12:00', end: '20:00', preferred: false }
    },
    qualifications: ['hostess'],
    isActive: true
  },
  {
    name: 'Marcus Johnson',
    email: 'marcus.johnson@goldencrown.co.uk',
    phone: '+44 7700 900013',
    role: 'cleaner',
    hourlyRate: 11.44, // UK minimum wage
    maxHoursPerWeek: 20,
    contractHours: 16,
    age: 35,
    experienceLevel: 'experienced',
    availableDays: ['monday', 'tuesday', 'wednesday', 'sunday'],
    preferredAvailability: {
      monday: { start: '06:00', end: '10:00', preferred: true },
      tuesday: { start: '06:00', end: '10:00', preferred: true },
      wednesday: { start: '06:00', end: '10:00', preferred: true },
      sunday: { start: '08:00', end: '12:00', preferred: false }
    },
    qualifications: ['cleaner'],
    isActive: true
  },
  {
    name: 'Priya Patel',
    email: 'priya.patel@goldencrown.co.uk',
    phone: '+44 7700 900014',
    role: 'delivery_driver',
    hourlyRate: 12.00,
    maxHoursPerWeek: 30,
    contractHours: 20,
    age: 26,
    experienceLevel: 'experienced',
    availableDays: ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    preferredAvailability: {
      tuesday: { start: '11:00', end: '15:00', preferred: true },
      wednesday: { start: '11:00', end: '15:00', preferred: true },
      thursday: { start: '11:00', end: '15:00', preferred: true },
      friday: { start: '17:00', end: '21:00', preferred: true },
      saturday: { start: '17:00', end: '21:00', preferred: false }
    },
    qualifications: ['delivery_driver'],
    isActive: true
  },
  {
    name: 'Ryan O\'Connor',
    email: 'ryan.oconnor@goldencrown.co.uk',
    phone: '+44 7700 900015',
    role: 'trainee',
    hourlyRate: 10.50,
    maxHoursPerWeek: 20,
    contractHours: 12,
    age: 18,
    experienceLevel: 'beginner',
    availableDays: ['wednesday', 'thursday', 'friday', 'saturday'],
    preferredAvailability: {
      wednesday: { start: '16:00', end: '20:00', preferred: true },
      thursday: { start: '16:00', end: '20:00', preferred: true },
      friday: { start: '16:00', end: '22:00', preferred: false },
      saturday: { start: '12:00', end: '18:00', preferred: true }
    },
    qualifications: ['trainee'],
    isActive: true
  }
];

// 🍽️ SHIFT TEMPLATES (Comprehensive restaurant coverage)
const demoShiftTemplates = [
  // === MONDAY - Prep Day ===
  {
    name: 'Monday Morning Prep',
    dayOfWeek: 'monday',
    startTime: '08:00',
    endTime: '16:00',
    requiredRole: 'chef',
    staffCount: 1,
    priority: 1,
    description: 'Food prep and inventory for the week'
  },
  {
    name: 'Monday Lunch Service',
    dayOfWeek: 'monday',
    startTime: '12:00',
    endTime: '15:00',
    requiredRole: 'waiter',
    staffCount: 2,
    priority: 2,
    description: 'Lunch service coverage'
  },
  {
    name: 'Monday Evening Service',
    dayOfWeek: 'monday',
    startTime: '17:00',
    endTime: '22:00',
    requiredRole: 'waiter',
    staffCount: 2,
    priority: 2,
    description: 'Dinner service'
  },
  {
    name: 'Monday Management',
    dayOfWeek: 'monday',
    startTime: '10:00',
    endTime: '18:00',
    requiredRole: 'manager',
    staffCount: 1,
    priority: 1,
    description: 'Weekly planning and admin'
  },
  {
    name: 'Monday Morning Clean',
    dayOfWeek: 'monday',
    startTime: '06:00',
    endTime: '10:00',
    requiredRole: 'cleaner',
    staffCount: 1,
    priority: 1,
    description: 'Deep clean after weekend'
  },

  // === FRIDAY - Peak Night ===
  {
    name: 'Friday Kitchen Prep',
    dayOfWeek: 'friday',
    startTime: '10:00',
    endTime: '18:00',
    requiredRole: 'chef',
    staffCount: 1,
    priority: 1,
    description: 'Friday prep and lunch service'
  },
  {
    name: 'Friday Head Chef Evening',
    dayOfWeek: 'friday',
    startTime: '16:00',
    endTime: '23:30',
    requiredRole: 'head_chef',
    staffCount: 1,
    priority: 1,
    description: 'Peak night head chef coverage'
  },
  {
    name: 'Friday Kitchen Support',
    dayOfWeek: 'friday',
    startTime: '17:00',
    endTime: '23:00',
    requiredRole: 'kitchen_assistant',
    staffCount: 1,
    priority: 1,
    description: 'Kitchen support for busy night'
  },
  {
    name: 'Friday Peak Service',
    dayOfWeek: 'friday',
    startTime: '17:00',
    endTime: '00:00',
    requiredRole: 'waiter',
    staffCount: 5,
    priority: 1,
    description: 'Peak Friday night service'
  },
  {
    name: 'Friday Head Waiter',
    dayOfWeek: 'friday',
    startTime: '17:00',
    endTime: '00:00',
    requiredRole: 'head_waiter',
    staffCount: 1,
    priority: 1,
    description: 'Senior waiter for peak service'
  },
  {
    name: 'Friday Bar Peak',
    dayOfWeek: 'friday',
    startTime: '19:00',
    endTime: '02:00',
    requiredRole: 'head_bartender',
    staffCount: 1,
    priority: 1,
    description: 'Head bartender for peak night'
  },
  {
    name: 'Friday Management',
    dayOfWeek: 'friday',
    startTime: '16:00',
    endTime: '00:00',
    requiredRole: 'assistant_manager',
    staffCount: 1,
    priority: 1,
    description: 'Management oversight for peak night'
  },

  // === SATURDAY - Busiest Day ===
  {
    name: 'Saturday Head Chef',
    dayOfWeek: 'saturday',
    startTime: '16:00',
    endTime: '23:30',
    requiredRole: 'head_chef',
    staffCount: 1,
    priority: 1,
    description: 'Peak Saturday night coverage'
  },
  {
    name: 'Saturday Peak Service',
    dayOfWeek: 'saturday',
    startTime: '17:00',
    endTime: '00:00',
    requiredRole: 'waiter',
    staffCount: 6,
    priority: 1,
    description: 'Busiest service of the week'
  },
  {
    name: 'Saturday Head Waiter',
    dayOfWeek: 'saturday',
    startTime: '17:00',
    endTime: '00:00',
    requiredRole: 'head_waiter',
    staffCount: 1,
    priority: 1,
    description: 'Head waiter for peak service'
  },
  {
    name: 'Saturday Bar Peak',
    dayOfWeek: 'saturday',
    startTime: '19:00',
    endTime: '02:00',
    requiredRole: 'head_bartender',
    staffCount: 1,
    priority: 1,
    description: 'Head bartender for peak night'
  },
  {
    name: 'Saturday Management',
    dayOfWeek: 'saturday',
    startTime: '16:00',
    endTime: '00:00',
    requiredRole: 'assistant_manager',
    staffCount: 1,
    priority: 1,
    description: 'Peak night management'
  }
];

// 🏖️ TIME OFF REQUESTS (Realistic scenarios)
const demoTimeOff = [
  // Week of Feb 10-16, 2026 (Demo week)
  {
    staffId: null, // Will be set to Antonio Rossi (Head Chef)
    startDate: new Date('2026-02-14'), // Friday
    endDate: new Date('2026-02-15'),   // Saturday  
    reason: 'family_emergency',
    status: 'approved',
    notes: 'Family emergency - needs immediate coverage for weekend'
  },
  {
    staffId: null, // Will be set to Lucy Anderson (Waiter)
    startDate: new Date('2026-02-10'), // Monday
    endDate: new Date('2026-02-12'),   // Wednesday
    reason: 'sick',
    status: 'approved', 
    notes: 'Flu symptoms - doctor advised rest'
  },
  {
    staffId: null, // Will be set to Hassan Ali (Kitchen Assistant)
    startDate: new Date('2026-02-13'), // Thursday
    endDate: new Date('2026-02-13'),   // Thursday
    reason: 'personal',
    status: 'approved',
    notes: 'University exam - pre-approved'
  },
  {
    staffId: null, // Will be set to Grace Wilson (Hostess)
    startDate: new Date('2026-02-16'), // Sunday
    endDate: new Date('2026-02-16'),   // Sunday
    reason: 'holiday',
    status: 'approved',
    notes: 'Family birthday celebration'
  }
];

async function seedDemoData() {
  try {
    console.log('🍽️  Starting Golden Crown Restaurant seed data...');
    console.log('📍 Location: Fine Dining Restaurant Demo');
    console.log('👥 Staff: 15 team members with realistic availability');
    console.log('📅 Scenario: February 2026 demo week with scheduling challenges\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Clear existing data completely
    console.log('🗑️  Clearing ALL existing data...');
    await Staff.deleteMany({});
    await ShiftTemplate.deleteMany({});
    await TimeOff.deleteMany({});
    await RotaWeek.deleteMany({});
    console.log('   • Staff cleared');
    console.log('   • Shift templates cleared'); 
    console.log('   • Time off cleared');
    console.log('   • Rota weeks cleared');

    // Seed staff with enhanced data
    console.log('\n👥 Creating diverse staff team...');
    const createdStaff = await Staff.insertMany(demoStaff);
    console.log(`✅ Created ${createdStaff.length} staff members with:`)
    console.log('   • Mixed experience levels (senior/experienced/beginner)');
    console.log('   • Realistic availability windows');
    console.log('   • Varied contract hours and preferences');
    console.log('   • Multiple role qualifications');

    // Seed comprehensive shift templates
    console.log('\n📋 Creating comprehensive shift templates...');
    const createdTemplates = await ShiftTemplate.insertMany(demoShiftTemplates);
    console.log(`✅ Created ${createdTemplates.length} shift templates covering:`);
    console.log('   • Peak service periods');
    console.log('   • Kitchen, front of house, and management roles');
    console.log('   • Priority-based scheduling');

    // Seed realistic time off with staff references
    console.log('\n🏖️  Creating realistic time off scenarios...');
    
    // Find staff by name for realistic assignments
    const antonioRossi = createdStaff.find(staff => staff.name === 'Antonio Rossi');
    const lucyAnderson = createdStaff.find(staff => staff.name === 'Lucy Anderson');
    const hassanAli = createdStaff.find(staff => staff.name === 'Hassan Ali');
    const graceWilson = createdStaff.find(staff => staff.name === 'Grace Wilson');
    
    // Assign time off to specific staff
    demoTimeOff[0].staffId = antonioRossi._id;    // Head chef emergency weekend
    demoTimeOff[1].staffId = lucyAnderson._id;    // Waiter sick leave
    demoTimeOff[2].staffId = hassanAli._id;       // Kitchen assistant exam
    demoTimeOff[3].staffId = graceWilson._id;     // Hostess family event
    
    const createdTimeOff = await TimeOff.insertMany(demoTimeOff);
    console.log(`✅ Created ${createdTimeOff.length} time off requests:`);
    console.log(`   • HEAD CHEF unavailable Fri-Sat (CRITICAL constraint!)`);
    console.log(`   • Waiter sick Mon-Wed (coverage needed)`);
    console.log(`   • Kitchen assistant exam Thursday`);
    console.log(`   • Weekend hostess unavailable Sunday`);

    // Display demo scenario
    console.log('\n🎭 DEMO SCENARIO SUMMARY:');
    console.log('══════════════════════════════════════════════════════════════');
    console.log('📍 Restaurant: The Golden Crown (Fine Dining)');
    console.log('📅 Demo Week: February 10-16, 2026');
    console.log('🎯 Challenge: Generate optimal rota with constraints');
    console.log('');
    console.log('🚨 KEY SCHEDULING CHALLENGES:');
    console.log('   1. HEAD CHEF UNAVAILABLE FRIDAY-SATURDAY (peak nights!)');
    console.log('   2. Multiple staff sick/unavailable mid-week');
    console.log('   3. Junior staff availability conflicts');
    console.log('   4. Weekend coverage gaps need careful planning');
    console.log('');
    console.log('✨ DEMO WORKFLOW:');
    console.log('   1. 📊 Navigate to Rota Builder');
    console.log('   2. 📅 Select week of Feb 10, 2026');
    console.log('   3. 🎲 Click "Generate Rota"');
    console.log('   4. ⚠️  Review validation warnings (head chef conflict!)');
    console.log('   5. 🔧 Manual fixes: reassign roles, adjust coverage');
    console.log('   6. ✅ Validation clears');
    console.log('   7. 📢 Publish final rota');
    console.log('   8. 📤 Export to CSV/share with team');

    // Display staff summary by role
    console.log('\n👥 STAFF ROSTER BY ROLE:');
    console.log('══════════════════════════════════════════════════════════════');
    
    const roleGroups = createdStaff.reduce((acc, staff) => {
      if (!acc[staff.role]) acc[staff.role] = [];
      acc[staff.role].push(staff);
      return acc;
    }, {});

    Object.entries(roleGroups).forEach(([role, staffList]) => {
      console.log(`\n🏷️  ${role.replace('_', ' ').toUpperCase()}:`);
      staffList.forEach(staff => {
        const availability = staff.availableDays.join(', ');
        console.log(`   • ${staff.name} - £${staff.hourlyRate}/hr - ${staff.contractHours}h contract`);
        console.log(`     Available: ${availability}`);
      });
    });

    console.log('\n🎉 DEMO DATA SEEDING COMPLETED SUCCESSFULLY!');
    console.log('══════════════════════════════════════════════════════════════');
    console.log('🚀 Ready for comprehensive rota builder demonstration!');
    console.log('💡 Navigate to http://localhost:3000 to start demo');

  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('   • Check MongoDB connection string');
    console.log('   • Verify all models are properly defined');
    console.log('   • Ensure database permissions');
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the demo seeding function
if (require.main === module) {
  seedDemoData();
}

module.exports = { seedDemoData, demoStaff, demoShiftTemplates, demoTimeOff };