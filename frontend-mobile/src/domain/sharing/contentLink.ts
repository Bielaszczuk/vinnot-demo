export type SharedContentKind = 'wines' | 'events' | 'wine-routes';
export interface ShareContentInput { kind: SharedContentKind; id: string; title: string }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Canonical URLs contain only public identifiers, never navigation params or credentials. */
export function publicContentUrl(origin: string, kind: SharedContentKind, id: string): string {
  if (!['wines', 'events', 'wine-routes'].includes(kind) || !uuid.test(id)) throw new Error('Invalid shared content');
  if (!['https://vinnot.com', 'https://dev.vinnot.com'].includes(origin)) throw new Error('Invalid sharing origin');
  return `${origin}/share/${kind}/${id.toLowerCase()}`;
}
