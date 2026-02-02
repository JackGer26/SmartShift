/**
 * Database Migration Script - Fix Email Uniqueness Constraint
 * 
 * This script removes the existing unique constraint on email field
 * and recreates it as a partial unique index that only applies to active staff.
 * This allows email addresses to be reused when staff members are deactivated.
 */
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartshift');
    console.log('✅ MongoDB Connected for migration');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

const migrateEmailConstraint = async () => {
  try {
    await connectDB();
    
    const db = mongoose.connection.db;
    const staffCollection = db.collection('staff');
    
    console.log('📋 Current indexes:');
    const existingIndexes = await staffCollection.indexes();
    existingIndexes.forEach(index => {
      console.log(`  - ${JSON.stringify(index.key)}: ${JSON.stringify(index)}`);
    });
    
    // Drop the existing unique email index if it exists
    try {
      await staffCollection.dropIndex({ email: 1 });
      console.log('✅ Dropped existing email unique index');
    } catch (error) {
      if (error.codeName === 'IndexNotFound') {
        console.log('ℹ️  No existing email index found to drop');
      } else {
        console.log('⚠️  Error dropping email index:', error.message);
      }
    }
    
    // Create new partial unique index for active staff only
    try {
      await staffCollection.createIndex(
        { email: 1 }, 
        { 
          unique: true, 
          partialFilterExpression: { isActive: true },
          name: 'email_unique_active'
        }
      );
      console.log('✅ Created partial unique index for active staff emails');
    } catch (error) {
      console.log('❌ Error creating partial unique index:', error.message);
    }
    
    console.log('📋 Updated indexes:');
    const newIndexes = await staffCollection.indexes();
    newIndexes.forEach(index => {
      if (index.key.email) {
        console.log(`  - Email index: ${JSON.stringify(index)}`);
      }
    });
    
    console.log('✅ Migration completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Database connection closed');
  }
};

// Run the migration
migrateEmailConstraint();