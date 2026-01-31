/**
 * Generate a random ID string
 */
export function generateId(): string {
  return (
    Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  );
}

/**
 * Generate a UUID-like string for guest usernames
 * Format: xxxxxxxx-xxxx-xxxx (20 chars including dashes)
 */
export function generateGuestUsername(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const segments = [8, 4, 4];
  return segments
    .map((len) =>
      Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
    )
    .join("-");
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

/**
 * Validate username format (3-12 alphanumeric characters)
 */
export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9]{3,12}$/.test(username);
}

// Re-export display name generator
export { generateGuestDisplayName } from "./displayName.js";
