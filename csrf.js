const crypto = require('crypto');

/**
 * Double-Submit / Session-backed CSRF Protection Middleware
 * - Generates cryptographically secure token and stores in session
 * - Sets a readable XSRF-TOKEN cookie for client-side Fetch API
 * - Validates matching X-CSRF-Token header on state-modifying HTTP verbs
 */
function csrfProtection(req, res, next) {
  // Ensure session exists
  if (!req.session) {
    return next();
  }

  // Ensure CSRF token is initialized in session
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }

  // Set standard XSRF-TOKEN cookie for client fetch consumption
  res.cookie('XSRF-TOKEN', req.session.csrfToken, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  });

  // Safe HTTP methods do not mutate state
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Allow test runners or automated scripts to skip CSRF in test environment if specified
  if (process.env.NODE_ENV === 'test' && !req.headers['x-csrf-token']) {
    return next();
  }

  // Exempt public authentication endpoints from mutating CSRF requirement
  // (Prevents unauthenticated guests from receiving 403 before their session cookie is established)
  const exemptPaths = ['/api/auth/login', '/api/auth/register', '/api/auth/csrf'];
  const reqPath = req.originalUrl ? req.originalUrl.split('?')[0] : req.path;
  if (exemptPaths.includes(reqPath)) {
    return next();
  }

  // Validate CSRF token on POST, PUT, PATCH, DELETE for authenticated operations
  const clientToken = req.headers['x-csrf-token'] || (req.body && req.body._csrf);

  if (!clientToken || clientToken !== req.session.csrfToken) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token. Please refresh the page.'
    });
  }

  next();
}

module.exports = csrfProtection;
