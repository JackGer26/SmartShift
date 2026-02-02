const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    // Skip database connection if no MongoDB URI is provided or if running locally without MongoDB
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      console.log('⚠️  No MONGODB_URI provided - running without database');
      console.log('💡 Add MONGODB_URI=mongodb://localhost:27017/smartshift_restaurant_rota to .env to enable database');
      return null;
    }

    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    console.log('⚠️  Make sure MongoDB is installed and running');
    console.log('💡 Or use a cloud service like MongoDB Atlas');
    console.log('🔄 Server will continue running without database connection');
    return null;
  }
};

module.exports = connectDB;