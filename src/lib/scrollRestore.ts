/** How far to scroll a returning page, or null while its content is still too short. */
export function scrollRestoreTarget(
  saved: number | undefined,
  scrollHeight: number,
  clientHeight: number,
  elapsedMs: number,
  timeoutMs = 4000,
): number | null {
  const target = saved ?? 0;
  const max = Math.max(0, scrollHeight - clientHeight);
  if (target <= max) return target;
  if (elapsedMs >= timeoutMs) return max;
  return null;
}
