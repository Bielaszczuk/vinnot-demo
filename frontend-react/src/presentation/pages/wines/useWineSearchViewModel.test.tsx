import { cleanup, act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWineSearchViewModel } from './useWineSearchViewModel';
import { useWineSearch } from '@hooks/queries/wine/useWineSearch';
import { useLocationCountry } from '@hooks/useLocationCountry';
const lang = vi.hoisted(() => ({ value: 'es-AR' }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t:(key:string)=>key, i18n:{ language: lang.value } }) }));
const motion = vi.hoisted(() => ({ reduced: false }))
vi.mock('@hooks/useReducedMotion', () => ({ useReducedMotion: () => motion.reduced }))
vi.mock('@hooks/queries/wine/useWineSearch', () => ({ useWineSearch: vi.fn() }));
vi.mock('@hooks/useLocationCountry', () => ({ useLocationCountry: vi.fn() }));
vi.mock('@hooks/queries/wine/useCountries', () => ({ useCountries: () => ({ data:[{id:'ar',code:'AR',name:'Argentina'},{id:'fr',code:'FR',name:'France'},{id:'de',code:'DE',name:'Alemania'}],isPending:false }) }));
vi.mock('@hooks/queries/wine/useRegions', () => ({ useRegions: () => ({ data:[] }) }));
vi.mock('@hooks/queries/wine/useGrapeTypes', () => ({ useGrapeTypes: () => ({ data:[] }) }));
vi.mock('@hooks/queries/wine/useWineTypes', () => ({ useWineTypes: () => ({ data:[{code:'RED',value:'red',names:{es:'Tinto',en:'Red'}},{code:'ORANGE',value:'orange',names:{es:'Naranja',en:'Orange'}}] }) }));
afterEach(cleanup);
beforeEach(() => {
 lang.value = 'es-AR';
 vi.mocked(useWineSearch).mockReturnValue({data:undefined,isLoading:false,isError:false,error:null,refetch:vi.fn()} as unknown as ReturnType<typeof useWineSearch>);
 vi.mocked(useLocationCountry).mockImplementation((_countries,enabled)=>({country:enabled?'Argentina':'',loading:false}));
});
const mount = (path='/wines') => renderHook(()=>useWineSearchViewModel(),{wrapper:({children})=><MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>});
const filters = () => vi.mocked(useWineSearch).mock.calls.at(-1)![1];
describe('initial wine country',()=>{
 it('shows country names in the interface language and keeps the stored filter value',()=>{lang.value='en-US';const {result}=mount('/wines?country=Alemania');expect(result.current.countryOptions).toContainEqual({value:'Alemania',label:'Germany'});expect(result.current.selectedCountryLabel).toBe('Germany');expect(filters()?.country).toBe('Alemania');});
 it('keeps the stored Spanish country names in the Spanish interface',()=>{const {result}=mount('/wines?country=Alemania');expect(result.current.countryOptions).toContainEqual({value:'Alemania',label:'Alemania'});expect(result.current.selectedCountryLabel).toBe('Alemania');});
 it('applies the resolved country to the actual backend filter',()=>{const {result}=mount();expect(result.current.selectedCountry).toBe('Argentina');expect(filters()?.country).toBe('Argentina');});
 it('respects an explicit country in a shared URL',()=>{const {result}=mount('/wines?country=France&page=2');expect(result.current.selectedCountry).toBe('France');expect(result.current.page).toBe(2);expect(useLocationCountry).toHaveBeenLastCalledWith(expect.any(Array),false);});
 it('waits for location before enabling the catalog query',()=>{vi.mocked(useLocationCountry).mockReturnValue({country:'',loading:true});const {result}=mount();expect(result.current.isLoading).toBe(true);expect(vi.mocked(useWineSearch).mock.calls.at(-1)![4]).toBe(false);});
 it('supports manual browsing if location fails or the country is unknown',()=>{vi.mocked(useLocationCountry).mockReturnValue({country:'',loading:false});const {result}=mount();expect(result.current.locationStatus).toBe('global');expect(filters()?.country).toBeUndefined();expect(vi.mocked(useWineSearch).mock.calls.at(-1)![4]).toBe(true);});
 it('does not overwrite a manual selection with a late location',()=>{vi.mocked(useLocationCountry).mockReturnValue({country:'',loading:true});const {result,rerender}=mount();act(()=>result.current.handleCountryChange('France'));vi.mocked(useLocationCountry).mockReturnValue({country:'Argentina',loading:false});rerender();expect(result.current.selectedCountry).toBe('France');expect(filters()?.country).toBe('France');});
 it('lets the user clear the automatic country and keeps it cleared',()=>{const {result,rerender}=mount();act(()=>result.current.clearFilters());rerender();expect(result.current.selectedCountry).toBe('');expect(filters()?.country).toBeUndefined();expect(useLocationCountry).toHaveBeenLastCalledWith(expect.any(Array),false);});
 it('uses the new country from page zero after browsing a later page',()=>{const {result}=mount('/wines?country=France&page=3');act(()=>result.current.handleCountryChange('Argentina'));expect(result.current.page).toBe(0);expect(filters()?.country).toBe('Argentina');});
});
describe('wine type filter',()=>{
 it('offers the reference catalog types, orange included, and filters by the chosen one',()=>{const {result}=mount();expect(result.current.typeOptions).toEqual([{value:'red',label:'wines.types.red'},{value:'orange',label:'wines.types.orange'}]);act(()=>result.current.handleTypeChange('orange'));expect(filters()?.type).toBe('orange');});
});
describe('page change scroll',()=>{
 beforeEach(()=>{motion.reduced=false;window.scrollTo=vi.fn() as never;});
 it('scrolls smoothly to the top when motion is allowed',()=>{const {result}=mount();act(()=>result.current.handlePageChange(2));expect(window.scrollTo).toHaveBeenCalledWith({top:0,behavior:'smooth'});});
 it('jumps to the top without smooth scrolling under reduced motion',()=>{motion.reduced=true;const {result}=mount();act(()=>result.current.handlePageChange(2));expect(window.scrollTo).toHaveBeenCalledWith({top:0,behavior:'auto'});});
});
