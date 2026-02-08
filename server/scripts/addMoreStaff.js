const mongoose = require('mongoose');
require('dotenv').config();

const Staff = require('../src/models/Staff');

const newStaff = [
  // Additional Waiters (need ~181h more - adding 5 waiters with 40h each = 200h)
  {
    name: 'Emily Parker',
    email: 'emily.parker@restaurant.com',
    phone: '+44 7700 100001',
    role: 'waiter',
    hourlyRate: 12.50,
    maxHoursPerWeek: 40,
    availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    isActive: true
  },
  {
    name: 'Jack Morrison',
    email: 'jack.morrison@restaurant.com',
    phone: '+44 7700 100002',
    role: 'waiter',
    hourlyRate: 12.50,
    maxHoursPerWeek: 40,
    availableDays: ['monday', 'tuesday', 'wednesday', 'saturday', 'sunday'],
    isActive: true
  },
  {
    name: 'Grace Bennett',
    email: 'grace.bennett@restaurant.com',
    phone: '+44 7700 100003',
    role: 'waiter',
    hourlyRate: 12.50,
    maxHoursPerWeek: 35,
    availableDays: ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    isActive: true
  },
  {
    name: 'Oliver Hughes',
    email: 'oliver.hughes@restaurant.com',
    phone: '+44 7700 100004',
    role: 'waiter',
    hourlyRate: 12.50,
    maxHoursPerWeek: 40,
    availableDays: ['monday', 'wednesday', 'thursday', 'friday', 'sunday'],
    isActive: true
  },
  {
    name: 'Chloe Adams',
    email: 'chloe.adams@restaurant.com',
    phone: '+44 7700 100005',
    role: 'waiter',
    hourlyRate: 12.50,
    maxHoursPerWeek: 30,
    availableDays: ['monday', 'tuesday', 'saturday', 'sunday'],
    isActive: true
  },
  // Additional Manager (need ~10h more)
  {
    name: 'David Wright',
    email: 'david.wright@restaurant.com',
    phone: '+44 7700 100006',
    role: 'manager',
    hourlyRate: 18.00,
    maxHoursPerWeek: 35,
    availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    isActive: true
  },
  // Additional Delivery Driver (need ~8h more)
  {
    name: 'Tom Richards',
    email: 'tom.richards@restaurant.com',
    phone: '+44 7700 100007',
    role: 'delivery_driver',
    hourlyRate: 11.50,
    maxHoursPerWeek: 25,
    availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    isActive: true
  }
];

async function addStaff() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');
    
    console.log('Adding new staff members...\n');
    
    for (const staffData of newStaff) {
      // Check if staff with this email already exists
      const existing = await Staff.findOne({ email: staffData.email });
      if (existing) {
        console.log(`⚠️ Skipped: ${staffData.name} (email already exists)`);
        continue;
      }
      
      const staff = new Staff(staffData);
      await staff.save();
      console.log(`✅ Added: ${staffData.name} (${staffData.role}) - ${staffData.maxHoursPerWeek}h/week`);
    }
    
    // Show new totals
    console.log('\n=== UPDATED STAFF TOTALS ===\n');
    
    const allStaff = await Staff.find({ isActive: true }).lean();
    const byRole = {};
    
    for (const s of allStaff) {
      if (!byRole[s.role]) byRole[s.role] = { count: 0, totalHours: 0, staff: [] };
      byRole[s.role].count++;
      byRole[s.role].totalHours += (s.maxHoursPerWeek || 40);
      byRole[s.role].staff.push(s.name);
    }
    
    for (const [role, data] of Object.entries(byRole)) {
      console.log(`${role}: ${data.count} staff, ${data.totalHours}h total capacity`);
    }
    
    console.log(`\nTotal staff: ${allStaff.length}`);
    
    await mongoose.disconnect();
    console.log('\nDone!');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

addStaff();
