import { describe, it, expect } from 'vitest';
import { EVENT_DRAFT_TTL, readEventDraft } from './eventDraft';
describe('event draft decoding', () => {
  const now = 1000000000;
  const raw = (values: unknown, savedAt = now, version = 1) => JSON.stringify({version, savedAt, values});
  it('keeps only known primitive fields without prototype injection', () => {
    const result = readEventDraft(raw({ title: 'Wine', count: 0, enabled: false, empty: null, extra: 'ignored', object: {} }), now, ['title','count','enabled','empty','object','__proto__']);
    expect(result?.values).toEqual({title:'Wine',count:0,enabled:false,empty:null});
  });
  it('rejects malformed, oversized, expired and incompatible drafts', () => {
    for (const value of [null,'{','x'.repeat(100001),raw([]),raw(null),raw('x'),raw({}),raw({title:'x'},now+1),raw({title:'x'},now-EVENT_DRAFT_TTL-1),raw({title:'x'},now,2),'{"version":1,"savedAt":null,"values":{"title":"x"}}']) expect(readEventDraft(value,now,['title'])).toBeNull();
  });
});
