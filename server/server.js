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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});