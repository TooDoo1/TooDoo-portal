export type DuplicateListItem = {
  id: string;
  name: string;
  city: string;
};

function normalizeForMatch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\b(aktiebolag|handelsbolag|kommanditbolag|ekonomisk forening)\b/g, " ")
    .replace(/\b(ab|hb|kb|ek for)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildDuplicateKey(name: string, city: string): string {
  return `${normalizeForMatch(name)}::${city.trim().toLowerCase()}`;
}

/** Groups list items that share the same normalized name + city. */
export function buildDuplicateGroups<T extends DuplicateListItem>(items: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = buildDuplicateKey(item.name, item.city);
    if (!normalizeForMatch(item.name)) continue;
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  return groups;
}

export function getDuplicatePeers<T extends DuplicateListItem>(
  item: T,
  groups: Map<string, T[]>,
): T[] {
  const key = buildDuplicateKey(item.name, item.city);
  const group = groups.get(key) ?? [];
  return group.filter((peer) => peer.id !== item.id);
}

export function formatDuplicateWarning(peers: DuplicateListItem[]): string {
  if (peers.length === 0) return "";
  const preview = peers
    .slice(0, 3)
    .map((peer) => `${peer.name} (${peer.city})`)
    .join(", ");
  const suffix = peers.length > 3 ? ` och ${peers.length - 3} till` : "";
  return `Det finns ${peers.length} liknande post${peers.length === 1 ? "" : "er"} i listan: ${preview}${suffix}.`;
}
