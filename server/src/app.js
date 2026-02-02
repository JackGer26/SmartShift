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
const requestLogger = require('./middleware/requestLogger');

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
app.use(requestLogger); // Log requests in development

// Routes
app.use('/api/staff', staffRoutes);
app.use('/api/time-off', timeOffRoutes);
app.use('/api/shift-templates', shiftTemplateRoutes);
app.use('/api/rota', rotaRoutes);

// Health check endpoint - comprehensive system status
app.get('/api/health', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Check database connectivity
    let databaseStatus = 'disconnected';
    let databaseMessage = 'Not connected';
    
    try {
      // Test database connection by checking connection state
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) {
        databaseStatus = 'connected';
        databaseMessage = `Connected to ${mongoose.connection.host}`;
      } else {
        databaseStatus = 'connecting';
        databaseMessage = 'Database connection in progress';
      }
    } catch (dbError) {
      databaseStatus = 'error';
      databaseMessage = 'Database connection failed';
    }
    
    const responseTime = Date.now() - startTime;
    const uptime = process.uptime();
    
    // Determine overall system health
    const isHealthy = databaseStatus === 'connected';
    const overallStatus = isHealthy ? 'healthy' : 'degraded';
    
    const healthData = {
      status: overallStatus,
      message: `SmartShift Restaurant Rota API is ${overallStatus}`,
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(uptime),
        human: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`
      },
      services: {
        api: {
          status: 'healthy',
          responseTime: `${responseTime}ms`
        },
        database: {
          status: databaseStatus,
          message: databaseMessage
        }
      },
      environment: process.env.NODE_ENV || 'development',
      version: require('../../package.json').version || '1.0.0'
    };
    
    // Return appropriate status code based on health
    const statusCode = isHealthy ? 200 : 503;
    res.status(statusCode).json(healthData);
    
  } catch (error) {
    // Fallback error response
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// 404 handler for undefined routes
app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
    code: 'ROUTE_NOT_FOUND'
  });
});

// Error handling middleware (should be last)
app.use(errorHandler);

module.exports = app;