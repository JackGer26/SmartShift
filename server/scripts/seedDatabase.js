const mongoose = require('mongoose');
const Staff = require('../src/models/Staff');
const ShiftTemplate = require('../src/models/ShiftTemplate');
const TimeOff = require('../src/models/TimeOff');
require('dotenv').config();

// Sample staff data
const sampleStaff = [
  {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@restaurant.com',
    phone: '+44 7700 900123',
    role: 'manager',
    hourlyRate: 18.50,
    maxHoursPerWeek: 45,
    availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    isActive: true
  },
  {
    name: 'Marco Rossi',
    email: 'marco.rossi@restaurant.com',
    phone: '+44 7700 900124',
    role: 'chef',
    hourlyRate: 16.00,
    maxHoursPerWeek: 40,
    availableDays: ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    isActive: true
  },
  {
    name: 'Emily Chen',
    email: 'emily.chen@restaurant.com',
    phone: '+44 7700 900125',
    role: 'waiter',
    hourlyRate: 12.50,
    maxHoursPerWeek: 35,
    availableDays: ['friday', 'saturday', 'sunday'],
    isActive: true
  },
  {
    name: 'James Wilson',
    email: 'james.wilson@restaurant.com',
    phone: '+44 7700 900126',
    role: 'bartender',
    hourlyRate: 14.00,
    maxHoursPerWeek: 30,
    availableDays: ['wednesday', 'thursday', 'friday', 'saturday'],
    isActive: true
  },
  {
    name: 'Maria Garcia',
    email: 'maria.garcia@restaurant.com',
    phone: '+44 7700 900127',
    role: 'waiter',
    hourlyRate: 12.50,
    maxHoursPerWeek: 25,
    availableDays: ['monday', 'tuesday', 'wednesday', 'thursday'],
    isActive: true
  },
  {
    name: 'Tom Anderson',
    email: 'tom.anderson@restaurant.com',
    phone: '+44 7700 900128',
    role: 'cleaner',
    hourlyRate: 11.50,
    maxHoursPerWeek: 20,
    availableDays: ['monday', 'sunday'],
    isActive: true
  }
];

// Sample shift templates
const sampleShiftTemplates = [
  {
    name: 'Morning Shift - Weekday',
    dayOfWeek: 'monday',
    startTime: '09:00',
    endTime: '17:00',
    requiredRole: 'waiter',
    staffCount: 2,
    priority: 1,
    description: 'Morning service for weekdays'
  },
  {
    name: 'Evening Shift - Weekend',
    dayOfWeek: 'friday',
    startTime: '17:00',
    endTime: '23:00',
    requiredRole: 'waiter',
    staffCount: 3,
    priority: 2,
    description: 'Weekend evening service'
  },
  {
    name: 'Kitchen Morning',
    dayOfWeek: 'tuesday',
    startTime: '10:00',
    endTime: '18:00',
    requiredRole: 'chef',
    staffCount: 1,
    priority: 1,
    description: 'Kitchen prep and lunch service'
  },
  {
    name: 'Bar Evening',
    dayOfWeek: 'saturday',
    startTime: '18:00',
    endTime: '02:00',
    requiredRole: 'bartender',
    staffCount: 1,
    priority: 3,
    description: 'Saturday night bar service'
  },
  {
    name: 'Management Shift',
    dayOfWeek: 'wednesday',
    startTime: '12:00',
    endTime: '20:00',
    requiredRole: 'manager',
    staffCount: 1,
    priority: 1,
    description: 'Supervisory shift for peak hours'
  }
];

// Sample time off requests
const sampleTimeOff = [
  {
    staffId: null, // Will be set after staff creation
    startDate: new Date('2026-02-10'),
    endDate: new Date('2026-02-12'),
    reason: 'holiday',
    status: 'approved',
    notes: 'Family holiday - pre-approved'
  },
  {
    staffId: null,
    startDate: new Date('2026-02-05'),
    endDate: new Date('2026-02-05'),
    reason: 'sick',
    status: 'approved',
    notes: 'Flu symptoms - called in sick'
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await Staff.deleteMany({});
    await ShiftTemplate.deleteMany({});
    await TimeOff.deleteMany({});

    // Seed staff
    console.log('👥 Creating staff members...');
    const createdStaff = await Staff.insertMany(sampleStaff);
    console.log(`✅ Created ${createdStaff.length} staff members`);

    // Seed shift templates
    console.log('📋 Creating shift templates...');
    const createdTemplates = await ShiftTemplate.insertMany(sampleShiftTemplates);
    console.log(`✅ Created ${createdTemplates.length} shift templates`);

    // Seed time off with staff references
    console.log('🏖️  Creating time off requests...');
    sampleTimeOff[0].staffId = createdStaff[1]._id; // Marco Rossi
    sampleTimeOff[1].staffId = createdStaff[2]._id; // Emily Chen
    
    const createdTimeOff = await TimeOff.insertMany(sampleTimeOff);
    console.log(`✅ Created ${createdTimeOff.length} time off requests`);

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • Staff members: ${createdStaff.length}`);
    console.log(`   • Shift templates: ${createdTemplates.length}`);
    console.log(`   • Time off requests: ${createdTimeOff.length}`);
    
    // Display created staff for verification
    console.log('\n👥 Created Staff:');
    createdStaff.forEach((staff, index) => {
      console.log(`   ${index + 1}. ${staff.name} - ${staff.role} (£${staff.hourlyRate}/hr)`);
    });

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the seeding function
seedDatabase();