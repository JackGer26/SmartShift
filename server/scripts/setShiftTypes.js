/**
 * Set Shift Types on Existing Templates
 * 
 * Analyzes template start times and assigns appropriate shift types:
 * - opening: Before 10:00
 * - peak: 10:00 - 16:00 (4pm)
 * - closing: After 16:00 (4pm)
 */

const mongoose = require('mongoose');
require('../src/config/database');
const ShiftTemplate = require('../src/models/ShiftTemplate');

function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

async function setShiftTypes() {
  try {
    console.log('🔄 Analyzing templates and setting shift types...\n');
    
    const templates = await ShiftTemplate.find({});
    
    console.log(`Found ${templates.length} templates\n`);
    
    let updated = 0;
    
    for (const template of templates) {
      const startMinutes = timeToMinutes(template.startTime);
      let shiftType;
      
      // Determine shift type based on start time
      if (startMinutes < 600) { // Before 10:00
        shiftType = 'opening';
      } else if (startMinutes >= 960) { // 16:00 (4pm) or later
        shiftType = 'closing';
      } else { // 10:00 - 16:00 (4pm)
        shiftType = 'peak';
      }
      
      // Update if different from current value
      if (template.shiftType !== shiftType) {
        template.shiftType = shiftType;
        await template.save();
        
        console.log(`✅ ${template.name} (${template.dayOfWeek})`);
        console.log(`   ${template.startTime} - ${template.endTime}`);
        console.log(`   Type: ${shiftType}`);
        console.log('');
        
        updated++;
      } else {
        console.log(`⏭️  ${template.name} already ${shiftType}`);
      }
    }
    
    console.log(`\n✅ Updated ${updated} templates`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\nDone!');
    process.exit(0);
  }
}

// Use async IIFE to handle connection properly
(async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connection.asPromise();
    console.log('Connected to MongoDB\n');
    await setShiftTypes();
  } catch (err) {
    console.error('Connection error:', err.message);
    process.exit(1);
  }
})();
