/**
 * Role Utility Functions
 * Support for both single roles and comma-separated multi-roles
 */

/**
 * Check if a user has a specific role (supports comma-separated roles)
 * @param userRole - User's role string (e.g., "admin" or "admin,agent")
 * @param requiredRole - The role to check for
 * @returns true if user has the required role
 */
export function hasRole(userRole: string | undefined | null, requiredRole: string): boolean {
  if (!userRole) return false;
  const roles = userRole.split(',').map(r => r.trim());
  return roles.includes(requiredRole);
}

/**
 * Check if a user has any of the required roles (supports comma-separated roles)
 * @param userRole - User's role string (e.g., "admin" or "admin,agent")
 * @param requiredRoles - Array of roles to check for
 * @returns true if user has at least one of the required roles
 */
export function hasAnyRole(userRole: string | undefined | null, requiredRoles: string[]): boolean {
  if (!userRole) return false;
  const roles = userRole.split(',').map(r => r.trim());
  return requiredRoles.some(required => roles.includes(required));
}

/**
 * Check if a user has all of the required roles (supports comma-separated roles)
 * @param userRole - User's role string (e.g., "admin" or "admin,agent")
 * @param requiredRoles - Array of roles all must be present
 * @returns true if user has all required roles
 */
export function hasAllRoles(userRole: string | undefined | null, requiredRoles: string[]): boolean {
  if (!userRole) return false;
  const roles = userRole.split(',').map(r => r.trim());
  return requiredRoles.every(required => roles.includes(required));
}
