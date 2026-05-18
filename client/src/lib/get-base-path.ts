/**
 * Get the base path for manual Link hrefs
 * Should match the Vite base configuration and Router base
 */
export function getBasePath() {
  // Use Vite's BASE_URL which is set to "/itsm_app/" in vite.config.ts
  // Remove trailing slash for consistency with Link hrefs
  return import.meta.env.BASE_URL.replace(/\/$/, '') || '';
}