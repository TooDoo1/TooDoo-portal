/** Swedish A–Z sort for admin business lists. */
export function compareBusinessName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name, "sv", { sensitivity: "base" });
}
