// Shared (client + server): match an organization against the student's aggregated LinkedIn network.
/** Connections the student has at an organization (fuzzy company match). */
export function connectionsAt(network: { company: string; count: number }[] | undefined, org: string): number {
  if (!network?.length || !org) return 0;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\b(inc|llc|corp|corporation|co|ltd|the)\b/g, "").trim();
  const o = norm(org);
  if (!o) return 0;
  return network.filter((n) => {
    const c = norm(n.company);
    return c && (c === o || c.startsWith(o) || o.startsWith(c));
  }).reduce((s, n) => s + n.count, 0);
}
