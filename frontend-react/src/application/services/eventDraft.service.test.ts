import { describe, it, expect } from 'vitest';
import { createEventDraftService } from './eventDraft.service';
import type { EventDraftStorage } from '@/application/ports/EventDraftStorage';
describe('event draft persistence', () => {
  const setup = () => {
    const values = new Map<string,string>();
    const storage: EventDraftStorage = {read: async key => values.get(key) ?? null,write:async(key,value)=>{values.set(key,value)},remove:async key=>{values.delete(key)}};
    return {storage, service:createEventDraftService(storage,()=>1000)};
  };
  it('isolates owners and events and recovers incomplete data', async () => {
    const {service}=setup();
    await service.save('alice',undefined,{title:'unfinished'});
    expect((await service.load('alice',undefined,['title']))?.values.title).toBe('unfinished');
    expect(await service.load('bob',undefined,['title'])).toBeNull();
    expect(await service.load('alice','existing',['title'])).toBeNull();
    await service.remove('alice');
    expect(await service.load('alice',undefined,['title'])).toBeNull();
  });
  it('orders slow writes before discard and recovers after storage failures', async () => {
    const {service,storage}=setup();
    let release!:()=>void;
    const gate = new Promise<void>(resolve=>{release=resolve});
    const write=storage.write;
    storage.write=async(k,v)=>{await gate; await write(k,v)};
    const saving=service.save('alice',undefined,{title:'pending'});
    const removing=service.remove('alice');
    release(); await Promise.all([saving,removing]);
    expect(await service.load('alice',undefined,['title'])).toBeNull();
    storage.write=async()=>{throw new Error('disk full')};
    await expect(service.save('alice',undefined,{title:'x'})).rejects.toThrow('disk full');
    storage.write=write;
    await service.save('alice',undefined,{title:'retry'});
    expect((await service.load('alice',undefined,['title']))?.values.title).toBe('retry');
    await expect(service.save('alice',undefined,{title:'x'.repeat(100001)})).rejects.toThrow('limit');
  });
  it('continues queued work after an earlier write rejects', async () => {
    const {service,storage}=setup();
    storage.write=async()=>{throw new Error('disk full')};
    const failed=service.save('alice',undefined,{title:'pending'});
    const removing=service.remove('alice');
    await expect(failed).rejects.toThrow('disk full');
    await removing;
    expect(await service.load('alice',undefined,['title'])).toBeNull();
  });

});
