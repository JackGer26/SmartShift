/**
 * Fix Shift Template Validation
 * Removes old MongoDB validation rules and indexes
 */
const mongoose = require('mongoose');
require('dotenv').config();

async function fixValidation() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('shifttemplates');

    // Drop old indexes that reference removed fields
    console.log('\n🗑️  Dropping old indexes...');
    try {
      await collection.dropIndex('requiredRole_1_isActive_1');
      console.log('  ✅ Dropped: requiredRole_1_isActive_1');
    } catch (e) {
      console.log('  ⚠️  Index not found: requiredRole_1_isActive_1');
    }

    try {
      await collection.dropIndex('dayOfWeek_1_requiredRole_1_isActive_1');
      console.log('  ✅ Dropped: dayOfWeek_1_requiredRole_1_isActive_1');
    } catch (e) {
      console.log('  ⚠️  Index not found: dayOfWeek_1_requiredRole_1_isActive_1');
    }

    // Remove collection-level validator
    console.log('\n🔧 Removing collection validator...');
    try {
      await db.command({
        collMod: 'shifttemplates',
        validator: {},
        validationLevel: 'off'
      });
      console.log('  ✅ Validator removed');
    } catch (e) {
      console.log('  ⚠️  No validator found or error:', e.message);
    }

    console.log('\n✨ Done! Restart your server now.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixValidation();
