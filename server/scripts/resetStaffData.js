/**
 * Reset Staff Data
 * Clears existing staff and creates new staff with specified roles
 */
const mongoose = require('mongoose');
require('dotenv').config();

const Staff = require('../src/models/Staff');

const newStaff = [
  // Managers (2)
  { name: 'Sarah Johnson', email: 'sarah.johnson@restaurant.com', phone: '07700900001', role: 'manager', hourlyRate: 18.50 },
  { name: 'Michael Chen', email: 'michael.chen@restaurant.com', phone: '07700900002', role: 'manager', hourlyRate: 18.00 },
  
  // Assistant Managers (4)
  { name: 'Emma Wilson', email: 'emma.wilson@restaurant.com', phone: '07700900003', role: 'assistant_manager', hourlyRate: 15.50 },
  { name: 'James Taylor', email: 'james.taylor@restaurant.com', phone: '07700900004', role: 'assistant_manager', hourlyRate: 15.50 },
  { name: 'Olivia Brown', email: 'olivia.brown@restaurant.com', phone: '07700900005', role: 'assistant_manager', hourlyRate: 15.00 },
  { name: 'Daniel Martinez', email: 'daniel.martinez@restaurant.com', phone: '07700900006', role: 'assistant_manager', hourlyRate: 15.00 },
  
  // Waiters (10)
  { name: 'Sophie Anderson', email: 'sophie.anderson@restaurant.com', phone: '07700900007', role: 'waiter', hourlyRate: 11.50 },
  { name: 'Lucas Thomas', email: 'lucas.thomas@restaurant.com', phone: '07700900008', role: 'waiter', hourlyRate: 11.50 },
  { name: 'Ava Jackson', email: 'ava.jackson@restaurant.com', phone: '07700900009', role: 'waiter', hourlyRate: 11.00 },
  { name: 'Mason White', email: 'mason.white@restaurant.com', phone: '07700900010', role: 'waiter', hourlyRate: 11.00 },
  { name: 'Isabella Harris', email: 'isabella.harris@restaurant.com', phone: '07700900011', role: 'waiter', hourlyRate: 11.00 },
  { name: 'Ethan Martin', email: 'ethan.martin@restaurant.com', phone: '07700900012', role: 'waiter', hourlyRate: 10.50 },
  { name: 'Mia Thompson', email: 'mia.thompson@restaurant.com', phone: '07700900013', role: 'waiter', hourlyRate: 10.50 },
  { name: 'Noah Garcia', email: 'noah.garcia@restaurant.com', phone: '07700900014', role: 'waiter', hourlyRate: 10.50 },
  { name: 'Charlotte Robinson', email: 'charlotte.robinson@restaurant.com', phone: '07700900015', role: 'waiter', hourlyRate: 10.50 },
  { name: 'Liam Clark', email: 'liam.clark@restaurant.com', phone: '07700900016', role: 'waiter', hourlyRate: 10.50 },
  
  // Delivery Driver (1)
  { name: 'Ryan Lewis', email: 'ryan.lewis@restaurant.com', phone: '07700900017', role: 'delivery_driver', hourlyRate: 11.00 }
];

async function resetStaffData() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!\n');

    // Delete all existing staff
    console.log('🗑️  Deleting existing staff...');
    const deleteResult = await Staff.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} staff members\n`);

    // Create new staff
    console.log('👥 Creating new staff...');
    const created = await Staff.insertMany(newStaff);
    console.log(`✅ Created ${created.length} staff members\n`);

    // Display summary
    console.log('📊 Staff Summary:');
    const managers = created.filter(s => s.role === 'manager').length;
    const assistantManagers = created.filter(s => s.role === 'assistant_manager').length;
    const waiters = created.filter(s => s.role === 'waiter').length;
    const drivers = created.filter(s => s.role === 'delivery_driver').length;
    
    console.log(`   - Managers: ${managers}`);
    console.log(`   - Assistant Managers: ${assistantManagers}`);
    console.log(`   - Waiters: ${waiters}`);
    console.log(`   - Delivery Drivers: ${drivers}`);
    console.log(`   - Total: ${created.length}\n`);

    console.log('✅ Staff data reset complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetStaffData();
