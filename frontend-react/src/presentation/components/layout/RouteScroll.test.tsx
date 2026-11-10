import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useNavigate, useLocation } from 'react-router-dom';
import { RouteScroll } from './RouteScroll';
let y = 0;
const scroll = vi.fn();
const anchorScroll = vi.fn();
beforeEach(() => {
 y = 0; scroll.mockReset(); anchorScroll.mockReset();
 vi.spyOn(window, 'scrollTo').mockImplementation(scroll);
 Object.defineProperty(window, 'scrollY', { configurable:true, get: () => y });
 HTMLElement.prototype.scrollIntoView = anchorScroll;
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function Navigation() {
 const navigate = useNavigate(); const location = useLocation();
 return <><RouteScroll/><div data-testid="route">{location.pathname}{location.search}</div>
 <button onClick={() => navigate('/legal')}>Legal</button>
 <button onClick={() => navigate('/contact#support')}>Contact</button>
 <button onClick={() => navigate('/wines?country=Argentina')}>Filter</button>
 <button onClick={() => navigate(-1)}>Back</button></>;
}
describe('page scroll', () => {
 it('starts a new page at the top when navigating from the footer', () => {
  render(<MemoryRouter initialEntries={['/wines']}><Navigation/></MemoryRouter>);
  y = 900; fireEvent.scroll(window); scroll.mockClear();
  fireEvent.click(screen.getByText('Legal'));
  expect(scroll).toHaveBeenCalledWith({top:0,behavior:'instant'});
 });
 it('keeps scroll on query-only filter changes and restores a visited page on back', () => {
  render(<MemoryRouter initialEntries={['/wines']}><Navigation/></MemoryRouter>);
  y = 700; fireEvent.scroll(window); scroll.mockClear();
  fireEvent.click(screen.getByText('Filter')); expect(scroll).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Legal')); y=0; fireEvent.scroll(window); scroll.mockClear();
  fireEvent.click(screen.getByText('Back'));
  expect(scroll).toHaveBeenCalledWith({top:700,behavior:'instant'});
 });
 it('waits for a lazy section before positioning its anchor', async () => {
  render(<MemoryRouter initialEntries={['/wines']}><Navigation/></MemoryRouter>);
  fireEvent.click(screen.getByText('Contact'));
  const target = document.createElement('section'); target.id='support';document.body.appendChild(target);
  await waitFor(() => expect(anchorScroll).toHaveBeenCalledWith({block:'start',behavior:'instant'}));
  target.remove();
 });
});
