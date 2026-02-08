const mongoose = require('mongoose');
require('dotenv').config();

const ShiftTemplate = require('../src/models/ShiftTemplate');
const Staff = require('../src/models/Staff');
const { calculateShiftDuration } = require('../src/utils/dateUtils');

async function checkTemplates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const staff = await Staff.find({ isActive: true }).lean();
    const templates = await ShiftTemplate.find({ isActive: true }).lean();
    
    // Calculate how many hours each role needs per week
    console.log('\n=== TOTAL HOURS NEEDED PER ROLE ===\n');
    
    const roleHours = {};
    for (const t of templates) {
      const duration = calculateShiftDuration(t.startTime, t.endTime);
      for (const r of (t.roleRequirements || [])) {
        const role = r.role;
        const totalHours = duration * r.count;
        if (!roleHours[role]) roleHours[role] = { totalHours: 0, shifts: [] };
        roleHours[role].totalHours += totalHours;
        roleHours[role].shifts.push({
          day: t.dayOfWeek,
          template: t.name,
          count: r.count,
          hours: duration,
          totalHours: totalHours
        });
      }
    }
    
    for (const [role, data] of Object.entries(roleHours)) {
      console.log(`\n${role.toUpperCase()}: ${data.totalHours} total hours needed`);
      for (const s of data.shifts) {
        console.log(`  ${s.day}: ${s.count} x ${s.hours}h = ${s.totalHours}h`);
      }
    }
    
    // Calculate how many hours each role has available
    console.log('\n\n=== STAFF MAX HOURS BY ROLE ===\n');
    
    const roleStaff = {};
    for (const s of staff) {
      const role = s.role;
      if (!roleStaff[role]) roleStaff[role] = { staff: [], totalMaxHours: 0 };
      roleStaff[role].staff.push({ name: s.name, maxHours: s.maxHoursPerWeek || 40 });
      roleStaff[role].totalMaxHours += (s.maxHoursPerWeek || 40);
    }
    
    for (const [role, data] of Object.entries(roleStaff)) {
      const needed = roleHours[role]?.totalHours || 0;
      const status = data.totalMaxHours >= needed ? '✅' : '❌';
      console.log(`${status} ${role.toUpperCase()}: ${data.totalMaxHours}h available (need ${needed}h)`);
      for (const s of data.staff) {
        console.log(`  - ${s.name}: ${s.maxHours}h/week`);
      }
    }
    
    await mongoose.disconnect();
    console.log('\nDone!');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkTemplates();
