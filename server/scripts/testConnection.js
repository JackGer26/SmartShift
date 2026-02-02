const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  try {
    console.log('🔄 Testing MongoDB Atlas connection...');
    console.log(`📍 Connection string: ${process.env.MONGODB_URI ? 'Configured' : 'NOT SET'}`);
    
    if (!process.env.MONGODB_URI) {
      console.log('❌ MONGODB_URI is not set in .env file');
      return;
    }

    // Attempt connection
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Successfully connected to MongoDB Atlas!');
    console.log(`📡 Connected to: ${conn.connection.host}`);
    console.log(`🗃️  Database: ${conn.connection.name}`);
    
    // Test basic operations
    console.log('🧪 Testing basic database operations...');
    
    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📁 Found ${collections.length} collections:`, collections.map(c => c.name));

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    if (error.message.includes('authentication failed')) {
      console.log('💡 Check your username and password in the connection string');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('💡 Check your cluster URL and network connectivity');
    } else if (error.message.includes('IP whitelist')) {
      console.log('💡 Add your IP address to MongoDB Atlas IP whitelist');
    }
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

testConnection();