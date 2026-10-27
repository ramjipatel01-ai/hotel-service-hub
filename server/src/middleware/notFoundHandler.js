/**
 * 404 Not Found Middleware
 * Intercepts unmapped API requests and returns consistent JSON response.
 */
export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
  });
}
