/**
 * Role-Based Access Control (RBAC) Middleware Factory
 * Enforces route authorization based on authenticated user's role.
 *
 * @param  {...string} allowedRoles - Allowed USER_ROLES values ('GUEST', 'STAFF', 'ADMIN', 'MANAGER')
 * @returns {Function} Express middleware
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before checking permissions.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted. Role '${req.user.role}' is not authorized.`,
      });
    }

    next();
  };
}

export const requireRole = (role) => authorize(role);
export const requireRoles = (...roles) => authorize(...roles);

export default authorize;
