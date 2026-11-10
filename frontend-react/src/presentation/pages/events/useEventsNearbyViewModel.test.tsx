import { act, cleanup, renderHook as renderBare } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEventsNearbyViewModel } from './useEventsNearbyViewModel';
import { useGeolocation } from '@hooks/useGeolocation';
import { useEvents } from '@hooks/queries/event/useEvents';
import { useDiscoverEvents } from '@hooks/queries/event/useDiscoverEvents';
vi.mock('react-i18next',()=>({useTranslation:()=>({t:(key:string)=>key})}));
vi.mock('@hooks/useDebounce',()=>({useDebounce:(value:string)=>value}));
vi.mock('@hooks/useGeolocation',()=>({useGeolocation:vi.fn()}));
const motion = vi.hoisted(() => ({ reduced: false }))
vi.mock('@hooks/useReducedMotion', () => ({ useReducedMotion: () => motion.reduced }))
vi.mock('@hooks/queries/event/useEvents',()=>({useEvents:vi.fn()}));
vi.mock('@hooks/queries/event/useDiscoverEvents',()=>({useDiscoverEvents:vi.fn()}));
vi.mock('@hooks/queries/wine/useCountries',()=>({useCountries:()=>({data:[]})}));
vi.mock('@hooks/queries/wine/useRegions',()=>({useRegions:()=>({data:[]})}));
afterEach(cleanup);
const entries = { current: ['/events'] };
function renderHook<T>(callback: () => T) {
 return renderBare(callback, { wrapper: ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={entries.current}>{children}</MemoryRouter> });
}
beforeEach(()=>{
 entries.current=['/events'];
 window.scrollTo = vi.fn() as never;
 vi.mocked(useGeolocation).mockReturnValue({latitude:0,longitude:0,error:null,loading:false});
 vi.mocked(useEvents).mockReturnValue({data:undefined,isLoading:false,isError:false,error:null,refetch:vi.fn()} as unknown as ReturnType<typeof useEvents>);
 vi.mocked(useDiscoverEvents).mockReturnValue({data:{nearbyEventsFound:true,nearbyEvents:[],otherEvents:[]},isLoading:false,isError:false,error:null,refetch:vi.fn()} as unknown as ReturnType<typeof useDiscoverEvents>);
});
describe('event discovery mode',()=>{
 it('uses coordinates on zero axes and does not fetch the global list',()=>{const {result}=renderHook(()=>useEventsNearbyViewModel());expect(result.current.discoveryMode).toBe('nearby');expect(useDiscoverEvents).toHaveBeenLastCalledWith(0,0,100,0,50,true);expect(useEvents).toHaveBeenLastCalledWith(undefined,0,50,false);});
 it('waits for location without showing global events as nearby',()=>{vi.mocked(useGeolocation).mockReturnValue({latitude:null,longitude:null,error:null,loading:true});const {result}=renderHook(()=>useEventsNearbyViewModel());expect(result.current.isLoading).toBe(true);expect(result.current.discoveryMode).toBe('locating');expect(useEvents).toHaveBeenLastCalledWith(undefined,0,50,false);});
 it('offers an explicit global fallback when location is denied',()=>{vi.mocked(useGeolocation).mockReturnValue({latitude:null,longitude:null,error:'denied',loading:false});const {result}=renderHook(()=>useEventsNearbyViewModel());expect(result.current.discoveryMode).toBe('global');expect(useEvents).toHaveBeenLastCalledWith(undefined,0,50,true);});
 it('labels results from other areas when no nearby event exists',()=>{vi.mocked(useDiscoverEvents).mockReturnValue({data:{nearbyEventsFound:false,nearbyEvents:[],otherEvents:[]},isLoading:false,isError:false,error:null,refetch:vi.fn()} as unknown as ReturnType<typeof useDiscoverEvents>);const {result}=renderHook(()=>useEventsNearbyViewModel());expect(result.current.discoveryMode).toBe('other');});
 it('makes a manual zone explicit and restores nearby mode on clear',()=>{const {result}=renderHook(()=>useEventsNearbyViewModel());act(()=>result.current.setSelectedCountry('France'));expect(result.current.discoveryMode).toBe('filtered');expect(useDiscoverEvents).toHaveBeenLastCalledWith(0,0,100,0,50,false);act(()=>result.current.clearFilters());expect(result.current.discoveryMode).toBe('nearby');expect(result.current.currentPage).toBe(0);});
});

describe('no-nearby-events notice', () => {
  function discoverWith(nearbyEventsFound: boolean, otherEvents: unknown[]) {
    vi.mocked(useDiscoverEvents).mockReturnValue({
      data: { nearbyEventsFound, nearbyEvents: [], otherEvents, message: 'No encontramos eventos cerca de tu zona actualmente.' },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDiscoverEvents>)
  }

  it('shows when nothing is nearby but other events are listed', () => {
    discoverWith(false, [{ id: 'far-away' }])
    const { result } = renderHook(() => useEventsNearbyViewModel())

    expect(result.current.showDiscoveryFallback).toBe(true)
  })

  it('stays hidden when there is no other event to list', () => {
    discoverWith(false, [])
    const { result } = renderHook(() => useEventsNearbyViewModel())

    expect(result.current.showDiscoveryFallback).toBe(false)
  })

  it('stays hidden when events are nearby', () => {
    discoverWith(true, [{ id: 'far-away' }])
    const { result } = renderHook(() => useEventsNearbyViewModel())

    expect(result.current.showDiscoveryFallback).toBe(false)
  })
})

describe('filters kept in the URL', () => {
  it('restores search, filters and page from the URL after going Back', () => {
    entries.current = ['/events?search=malbec&type=TASTING&country=Argentina&region=Mendoza&page=2']
    const { result } = renderHook(() => useEventsNearbyViewModel())
    expect(result.current).toMatchObject({ search: 'malbec', selectedType: 'TASTING', selectedCountry: 'Argentina', selectedRegion: 'Mendoza', currentPage: 2 })
    expect(useEvents).toHaveBeenLastCalledWith({ search: 'malbec', type: 'TASTING', country: 'Argentina', region: 'Mendoza' }, 2, 50, true)
  })

  it('writes every change into the URL and resets the page', () => {
    const { result } = renderHook(() => ({ vm: useEventsNearbyViewModel(), location: useLocation() }))
    act(() => result.current.vm.setSearch('cata'))
    act(() => result.current.vm.setSelectedType('TASTING' as never))
    act(() => result.current.vm.setSelectedCountry('Argentina'))
    act(() => result.current.vm.setSelectedRegion('Mendoza'))
    act(() => result.current.vm.goToPage(3))
    expect(result.current.location.search).toBe('?search=cata&type=TASTING&country=Argentina&region=Mendoza&page=3')
    act(() => result.current.vm.setSelectedCountry('Chile'))
    expect(result.current.location.search).toBe('?search=cata&type=TASTING&country=Chile')
  })
})
describe('page change scroll',()=>{
 beforeEach(()=>{motion.reduced=false;});
 it('scrolls smoothly to the top when motion is allowed',()=>{const {result}=renderHook(()=>useEventsNearbyViewModel());act(()=>result.current.goToPage(1));expect(window.scrollTo).toHaveBeenCalledWith({top:0,behavior:'smooth'});});
 it('jumps to the top without smooth scrolling under reduced motion',()=>{motion.reduced=true;const {result}=renderHook(()=>useEventsNearbyViewModel());act(()=>result.current.goToPage(1));expect(window.scrollTo).toHaveBeenCalledWith({top:0,behavior:'auto'});});
});
