/**
 * Admin roles and super-admin-only sections. Kept apart from lib/auth.ts so
 * the edge middleware can import them without pulling in the database,
 * rewards and alert code.
 */
export const ADMIN_ROLES = ["MODERATOR", "SUPER_ADMIN"] as const;

/**
 * Admin areas only a SUPER_ADMIN may open (pages and their /api/admin routes).
 * Moderators keep reviews, reports, owner replies, claims and businesses.
 * Enforced in middleware.ts; the sidebar only hides what this already blocks.
 */
export const SUPER_ADMIN_SECTIONS = ["team", "activity", "banners", "imports", "categories", "question-sets"] as const;
