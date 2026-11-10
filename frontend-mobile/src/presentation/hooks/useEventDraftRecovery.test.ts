import { useEffect } from "react";
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useForm } from 'react-hook-form';
import { useEventDraftRecovery } from './useEventDraftRecovery';
import { eventDraftService } from '@/application/services/eventDraft.instance';
jest.mock('@/application/services/eventDraft.instance', () => ({ eventDraftService: { load: jest.fn(), save: jest.fn(), remove: jest.fn() } }));
jest.mock('@/presentation/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }));
const defaults = { title: '', latitude: null as number | null, count: 1 };
const useEditor = (active: boolean, eventId?: string) => {
  const form = useForm({ defaultValues: defaults });
  return { form, draft: useEventDraftRecovery(active, eventId, form) };
};
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(eventDraftService.load).mockResolvedValue(null);
  jest.mocked(eventDraftService.save).mockResolvedValue(undefined);
  jest.mocked(eventDraftService.remove).mockResolvedValue(undefined);
});
it('saves incomplete changes and offers explicit recovery on reopening', async () => {
  const {result, rerender} = renderHook(({active})=>useEditor(active), {initialProps:{active:true}});
  await waitFor(()=>expect(result.current.draft.status).toBe('ready'));
  act(()=>result.current.form.setValue('title','Unfinished tasting'));
  await waitFor(()=>expect(result.current.draft.status).toBe('saved'));
  expect(eventDraftService.save).toHaveBeenLastCalledWith('owner',undefined,{...defaults,title:'Unfinished tasting'});
  rerender({active:false});
  jest.mocked(eventDraftService.load).mockResolvedValueOnce({version:1,savedAt:1,values:{...defaults,title:'Recovered tasting'}});
  rerender({active:true});
  await waitFor(()=>expect(result.current.draft.recovery).not.toBeNull());
  expect(result.current.draft.blocked).toBe(true);
  act(()=>result.current.draft.restore());
  expect(result.current.form.getValues('title')).toBe('Recovered tasting');
  expect(result.current.draft.blocked).toBe(false);
});
it('reports failed storage, prevents a successful close, then supports retry and discard', async () => {
  const {result}=renderHook(()=>useEditor(true,'event'));
  await waitFor(()=>expect(result.current.draft.status).toBe('ready'));
  jest.mocked(eventDraftService.save).mockRejectedValue(new Error('full'));
  act(()=>result.current.form.setValue('title','Keep me'));
  await waitFor(()=>expect(result.current.draft.status).toBe('error'));
  let closed=true;
  await act(async()=>{closed=await result.current.draft.persist()});
  expect(closed).toBe(false);
  expect(result.current.form.getValues('title')).toBe('Keep me');
  jest.mocked(eventDraftService.save).mockResolvedValue(undefined);
  await act(async()=>{expect(await result.current.draft.persist()).toBe(true)});
  await act(async()=>{await result.current.draft.discard()});
  expect(eventDraftService.remove).toHaveBeenCalledWith('owner','event');
  expect(result.current.form.getValues('title')).toBe('');
});
it('keeps a draft after load/removal errors and cleans it only on explicit successful completion', async () => {
  jest.mocked(eventDraftService.load).mockRejectedValueOnce(new Error('unavailable'));
  const {result}=renderHook(()=>useEditor(true));
  await waitFor(()=>expect(result.current.draft.status).toBe('error'));
  act(()=>result.current.form.setValue('title','Still editable'));
  await waitFor(()=>expect(result.current.draft.status).toBe('saved'));
  jest.mocked(eventDraftService.remove).mockRejectedValueOnce(new Error('unavailable'));
  await act(async()=>{await result.current.draft.discard()});
  expect(result.current.form.getValues('title')).toBe('Still editable');
  await act(async()=>{await result.current.draft.complete()});
  const writes=jest.mocked(eventDraftService.save).mock.calls.length;
  act(()=>result.current.form.setValue('title','After successful save'));
  expect(jest.mocked(eventDraftService.save).mock.calls).toHaveLength(writes);
});
it('ignores late recovery from a different event', async () => {
  let resolve!:(draft:null)=>void;
  jest.mocked(eventDraftService.load).mockReturnValueOnce(new Promise(done=>{resolve=done}));
  const {result,rerender}=renderHook(({id})=>useEditor(true,id),{initialProps:{id:'a'}});
  rerender({id:'b'});
  await waitFor(()=>expect(result.current.draft.status).toBe('ready'));
  await act(async()=>resolve(null));
  expect(result.current.draft.recovery).toBeNull();
  expect(eventDraftService.load).toHaveBeenLastCalledWith('owner','b',Object.keys(defaults));
});

it('persists a reverted field even while the previous keystroke is still being written', async()=>{
  let release!:()=>void;
  jest.mocked(eventDraftService.save).mockReturnValueOnce(new Promise(done=>{release=done}));
  const {result}=renderHook(()=>useEditor(true));
  await waitFor(()=>expect(result.current.draft.status).toBe('ready'));
  act(()=>result.current.form.setValue('title','Temporary'));
  act(()=>result.current.form.setValue('title',''));
  await waitFor(()=>expect(eventDraftService.save).toHaveBeenLastCalledWith('owner',undefined,defaults));
  await act(async()=>release());
  expect(result.current.form.getValues('title')).toBe('');
});

it('does not save a new event reset into the previous event draft', async()=>{
  const useSwitchingEditor = (id:string) => {
    const form=useForm({defaultValues:defaults});
    const {reset}=form;
    useEffect(()=>reset({...defaults,title:id}),[id,reset]);
    return {form,draft:useEventDraftRecovery(true,id,form)};
  };
  const {result,rerender}=renderHook(({id})=>useSwitchingEditor(id),{initialProps:{id:'old'}});
  await waitFor(()=>expect(result.current.draft.status).toBe('ready'));
  act(()=>result.current.form.setValue('title','Keep old draft'));
  await waitFor(()=>expect(result.current.draft.status).toBe('saved'));
  rerender({id:'new'});
  await waitFor(()=>expect(result.current.draft.status).toBe('ready'));
  expect(eventDraftService.save).not.toHaveBeenCalledWith('owner','old',expect.objectContaining({title:'new'}));
});

it('keeps the editor blocked during discard even when an earlier write finishes', async()=>{
  let saveDone!:()=>void, removeDone!:()=>void;
  jest.mocked(eventDraftService.save).mockReturnValueOnce(new Promise(done=>{saveDone=done}));
  jest.mocked(eventDraftService.remove).mockReturnValueOnce(new Promise(done=>{removeDone=done}));
  const {result}=renderHook(()=>useEditor(true));
  await waitFor(()=>expect(result.current.draft.status).toBe('ready'));
  act(()=>result.current.form.setValue('title','Discarding'));
  let discarding!:Promise<void>;
  act(()=>{discarding=result.current.draft.discard()});
  expect(result.current.draft.blocked).toBe(true);
  await act(async()=>saveDone());
  expect(result.current.draft.blocked).toBe(true);
  await act(async()=>{removeDone();await discarding});
  expect(result.current.draft.blocked).toBe(false);
  expect(result.current.form.getValues('title')).toBe('');
});

it.each(['4', ''])('retains numeric input text %j while rejecting incompatible field types', async (value) => {
  jest.mocked(eventDraftService.load).mockResolvedValueOnce({version:1,savedAt:1,values:{count:value,title:false}});
  const {result}=renderHook(()=>useEditor(true));
  await waitFor(()=>expect(result.current.draft.recovery).not.toBeNull());
  act(()=>result.current.draft.restore());
  expect(result.current.form.getValues('count')).toBe(value);
  expect(result.current.form.getValues('title')).toBe('');
});
