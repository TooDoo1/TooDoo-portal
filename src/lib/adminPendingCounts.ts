/** Dispatched when admin pending company/image counts should be re-fetched. */
export const ADMIN_PENDING_COUNTS_REFRESH = "toodoo:admin-pending-counts-refresh";

export function refreshAdminPendingCounts() {
  window.dispatchEvent(new CustomEvent(ADMIN_PENDING_COUNTS_REFRESH));
}
