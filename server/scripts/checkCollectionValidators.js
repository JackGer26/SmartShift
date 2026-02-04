/**
 * Script to check if MongoDB collection has validators causing issues
 */
const mongoose = require('mongoose');
require('dotenv').config();

async function checkCollectionValidators() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!');

    const db = mongoose.connection.db;
    const collections = await db.listCollections({ name: 'shifttemplates' }).toArray();
    
    if (collections.length === 0) {
      console.log('❌ Collection "shifttemplates" not found');
      process.exit(0);
    }

    const collection = collections[0];
    console.log('\n📋 Collection info:');
    console.log(JSON.stringify(collection, null, 2));

    // Check collection options
    const collectionInfo = await db.command({ listCollections: 1, filter: { name: 'shifttemplates' } });
    console.log('\n📋 Full collection details:');
    console.log(JSON.stringify(collectionInfo, null, 2));

    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkCollectionValidators();
