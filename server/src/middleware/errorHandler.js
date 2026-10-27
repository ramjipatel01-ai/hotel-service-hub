/**
 * Centralized Global Error Handling Middleware
 * Prevents stack trace leakage in production while providing actionable logs.
 */
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  const isProduction = process.env.NODE_ENV === 'production';

  // Log error for internal monitoring
  console.error(`[Error] [${req.method} ${req.originalUrl}]:`, err.message);
  if (!isProduction && err.stack) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(err.errors && { errors: err.errors }),
    ...(!isProduction && { stack: err.stack }),
  });
}
