/**
 * SmartShift Restaurant Rota Builder - Express Application Configuration
 * 
 * Main Express.js application setup for the restaurant scheduling system.
 * Configures middleware, routes, and database connection for:
 * 
 * Core Features:
 * - Staff management (CRUD operations)
 * - Shift template configuration
 * - Time off request handling
 * - Automated weekly rota generation
 * 
 * API Routes:
 * - /api/staff - Staff member management
 * - /api/time-off - Time off request handling
 * - /api/shift-templates - Shift template configuration
 * - /api/rota - Rota generation and management
 */
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const staffRoutes = require('./routes/staffRoutes');
const timeOffRoutes = require('./routes/timeOffRoutes');
const shiftTemplateRoutes = require('./routes/shiftTemplateRoutes');
const rotaRoutes = require('./routes/rotaRoutes');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/staff', staffRoutes);
app.use('/api/time-off', timeOffRoutes);
app.use('/api/shift-templates', shiftTemplateRoutes);
app.use('/api/rota', rotaRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware (should be last)
app.use(errorHandler);

module.exports = app;