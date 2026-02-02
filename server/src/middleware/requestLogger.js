/**
 * SmartShift Restaurant Rota Builder - Request Logger Middleware
 * 
 * Comprehensive request logging for debugging and monitoring API usage.
 * Tracks restaurant management operations (staff, shifts, time-off, rotas).
 * Helps identify issues and monitor system usage patterns.
 */
const requestLogger = (req, res, next) => {
  // Only log in development to avoid cluttering production logs
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.originalUrl;
    const userAgent = req.get('User-Agent') || 'Unknown';
    const contentType = req.get('Content-Type') || 'Not specified';
    
    // Enhanced logging with emojis for easy scanning
    const methodEmoji = {
      GET: '📖',
      POST: '✅', 
      PUT: '📝',
      DELETE: '🗑️',
      PATCH: '🔧'
    };
    
    console.log(`${methodEmoji[method] || '❓'} ${timestamp.split('T')[1].split('.')[0]} - ${method} ${url}`);
    
    // Log additional details for restaurant operations
    if (url.includes('/api/staff')) {
      console.log(`   👥 Staff Management Operation`);
    } else if (url.includes('/api/time-off')) {
      console.log(`   🏖️  Time Off Operation`);
    } else if (url.includes('/api/shift-templates')) {
      console.log(`   📋 Shift Template Operation`);
    } else if (url.includes('/api/rota')) {
      console.log(`   📅 Rota Generation/Management`);
    }
    
    // Log request body for POST/PUT requests (sanitized)
    if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && req.body) {
      const sanitizedBody = { ...req.body };
      
      // Remove/mask sensitive fields
      const sensitiveFields = ['password', 'token', 'secret', 'auth'];
      sensitiveFields.forEach(field => {
        if (sanitizedBody[field]) {
          sanitizedBody[field] = '[HIDDEN]';
        }
      });
      
      // Truncate long arrays for readability
      Object.keys(sanitizedBody).forEach(key => {
        if (Array.isArray(sanitizedBody[key]) && sanitizedBody[key].length > 5) {
          sanitizedBody[key] = [
            ...sanitizedBody[key].slice(0, 3),
            `... ${sanitizedBody[key].length - 3} more items`
          ];
        }
      });
      
      console.log(`   📦 Body:`, JSON.stringify(sanitizedBody, null, 2));
    }
    
    // Log query parameters if present
    if (Object.keys(req.query).length > 0) {
      console.log(`   🔍 Query:`, req.query);
    }
    
    // Track response time
    const startTime = Date.now();
    
    // Override res.end to log response details
    const originalEnd = res.end;
    res.end = function(...args) {
      const duration = Date.now() - startTime;
      const status = res.statusCode;
      
      // Color code status responses
      const statusEmoji = status >= 400 ? '❌' : status >= 300 ? '⚠️' : '✅';
      console.log(`   ${statusEmoji} ${status} - ${duration}ms\\n`);
      
      originalEnd.apply(this, args);
    };
  }
  
  next();
};

module.exports = requestLogger;