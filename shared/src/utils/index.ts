/**
 * Generate a random ID string
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Check if a user has a specific role
 */
export function hasRole(roles: string[], role: string): boolean {
  return roles.includes(role);
}

/**
 * Check if a user is an admin
 */
export function isAdmin(roles: string[]): boolean {
  return hasRole(roles, "ADMIN");
}
