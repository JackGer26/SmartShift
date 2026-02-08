/**
 * SmartShift Restaurant Rota Builder - Server Entry Point
 * 
 * Starts the Express.js API server for the restaurant scheduling application.
 * Handles MongoDB connection and serves RESTful API endpoints for:
 * - Staff management
 * - Shift template configuration  
 * - Time off request handling
 * - Automated rota generation
 */
const app = require('./src/app');

const PORT = process.env.PORT || 5000;

// Add error handlers
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('✨ Server is ready to accept connections');
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});