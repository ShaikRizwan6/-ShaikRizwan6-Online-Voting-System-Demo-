/**
 * Centralized Global Error Handler Middleware
 * Normalizes all unhandled server errors into standardized JSON responses
 * without exposing sensitive stack traces or internal database details.
 */
function errorHandler(err, req, res, next) {
  // Log internal diagnostic details server-side
  console.error(`[Error] ${req.method} ${req.url} -`, err.message);

  if (process.env.NODE_ENV !== 'production' && err.stack) {
    console.error(err.stack);
  }

  // Determine status code
  let statusCode = err.statusCode || err.status || 500;
  let clientMessage = err.message || 'An unexpected internal server error occurred.';

  // Handle MySQL specific error codes
  if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
    statusCode = 409;
    clientMessage = 'A duplicate entry exists for this record.';
  } else if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
    statusCode = 400;
    clientMessage = 'Referenced entity does not exist.';
  } else if (
    ['ECONNREFUSED', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'PROTOCOL_CONNECTION_LOST', 'ETIMEDOUT'].includes(
      err.code
    )
  ) {
    statusCode = 503;
    clientMessage = 'Database service is currently unavailable. Please verify MySQL server is running and .env settings are correct.';
  }

  res.status(statusCode).json({
    success: false,
    message: clientMessage
  });
}

module.exports = errorHandler;
