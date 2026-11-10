import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { it, expect, vi } from 'vitest';
import en from '@/shared/i18n/locales/en-US.json';
import es from '@/shared/i18n/locales/es-AR.json';
import { MyTicketsPage, MyTicketDetailsPage } from './MyTicketsPage';
import { illustrations } from '@/shared/illustrations';
const hooks = vi.hoisted(() => ({ list: vi.fn(), detail: vi.fn() }));
vi.mock('@/presentation/hooks/queries/event/useMyTickets', () => ({ useMyTickets: hooks.list, useMyTicket: hooks.detail }));
const id='65abf97c-205b-4c96-b5ba-7947c7f03920';
async function mount(detail=false,language='en-US',listPath='/my-tickets') {
 const i18n=createInstance(); await i18n.use(initReactI18next).init({lng:language,resources:{'en-US':{translation:en},'es-AR':{translation:es}},interpolation:{escapeValue:false}});
 return render(<I18nextProvider i18n={i18n}><MemoryRouter initialEntries={[detail?`/my-tickets/${id}`:listPath]}><Routes><Route path="/my-tickets" element={<MyTicketsPage/>}/><Route path="/my-tickets/:id" element={<MyTicketDetailsPage/>}/></Routes></MemoryRouter></I18nextProvider>);
}
it.each(['en-US','es-AR'])('uses translated empty state and existing artwork in %s',async language=>{
 hooks.list.mockReturnValue({data:{tickets:[],totalPages:0}});await mount(false,language);
 const labels=language==='en-US'?en:es;
 expect(screen.getByRole('heading',{name:labels.tickets.title})).toBeInTheDocument();
 expect(screen.getByText(labels.tickets.empty)).toBeInTheDocument();
 expect(screen.getByRole('link',{name:labels.tickets.explore})).toHaveAttribute('href','/events');
});
it('renders a refunded private ticket and event link without implying valid admission',async()=>{
 hooks.detail.mockReturnValue({data:{id,eventId:id,title:'Tasting',status:'CANCELLED',paymentStatus:'REFUNDED',eventStatus:'PUBLISHED',startDate:new Date('2026-10-20T18:00:00Z'),attendeeCount:2,totalAmount:50,currency:'ARS',description:'Event description'}});
 await mount(true);
 expect(screen.getByRole('heading',{name:'Tasting'})).toBeInTheDocument();
 expect(screen.getByText(en.events.registrationManager.statuses.CANCELLED)).toBeInTheDocument();
 expect(screen.getByRole('link',{name:en.tickets.eventDetails})).toHaveAttribute('href',`/events/${id}`);
});
it('shows an inaccessible ticket error without rendering previous data',async()=>{
 hooks.detail.mockReturnValue({isError:true,error:{status:403,code:'FORBIDDEN',message:'denied'}});await mount(true);
 expect(screen.getByRole('alert')).toHaveTextContent(en.tickets.unavailable);
 expect(screen.queryByRole('link',{name:en.tickets.eventDetails})).toBeNull();
});
it('shows attendee-facing status labels in the ticket list',async()=>{
 hooks.list.mockReturnValue({data:{tickets:[{id,eventId:id,title:'Tasting',status:'AWAITING_ATTENDEE_CONFIRMATION',startDate:new Date('2026-10-20T18:00:00Z')}],totalPages:1}});await mount();
 expect(screen.getByText('Awaiting your confirmation')).toBeInTheDocument();
});
it('offers a retry instead of "not found" when the ticket fails to load',async()=>{
 const refetch=vi.fn();hooks.detail.mockReturnValue({isError:true,error:{status:503,code:'SERVICE_UNAVAILABLE',message:'down'},refetch});await mount(true);
 expect(screen.getByRole('alert')).not.toHaveTextContent(en.tickets.unavailable);
 screen.getByRole('button',{name:'Retry'}).click();
 expect(refetch).toHaveBeenCalledTimes(1);
});
it('says the ticket was not found only when it is truly absent',async()=>{
 hooks.detail.mockReturnValue({isError:true,error:{status:404,code:'NOT_FOUND',message:'missing'},refetch:vi.fn()});await mount(true);
 expect(screen.getByRole('alert')).toHaveTextContent(en.tickets.unavailable);
 expect(screen.queryByRole('button',{name:'Retry'})).toBeNull();
});
it('keeps the ticket list page in the URL so Back returns to it',async()=>{
 hooks.list.mockImplementation((page:number)=>({data:{tickets:[{id,eventId:id,title:`Tasting ${page}`,status:'CONFIRMED',startDate:new Date('2026-10-20T18:00:00Z')}],totalPages:3}}));
 await mount(false,'en-US','/my-tickets?page=1');
 expect(hooks.list).toHaveBeenLastCalledWith(1);
 expect(screen.getByRole('heading',{name:'Tasting 1'})).toBeInTheDocument();
 screen.getByRole('button',{name:en.tickets.next}).click();
 await screen.findByRole('heading',{name:'Tasting 2'});
});
it('shows the empty list with the tickets watercolor and the page title band, inside the shell main',async()=>{
 hooks.list.mockReturnValue({data:{tickets:[],totalPages:0}});const view=await mount(false,'es-AR');
 expect(screen.getByRole('heading',{level:1,name:es.tickets.title})).toBeInTheDocument();
 expect(view.container.querySelector('img')).toHaveAttribute('src',illustrations.noTickets);
 expect(view.container.querySelector('main')).toBeNull();
 expect(screen.getByRole('link',{name:es.tickets.explore}).querySelector('button')).toBeNull();
});
it('formats the ticket total in the app language and the event currency, without a nested main',async()=>{
 hooks.detail.mockReturnValue({data:{id,eventId:id,title:'Tasting',status:'CONFIRMED',paymentStatus:'APPROVED',eventStatus:'PUBLISHED',startDate:new Date('2026-10-20T18:00:00Z'),attendeeCount:2,totalAmount:1500,currency:'USD'}});
 const view=await mount(true);
 expect(screen.getByText(/\$1,500/)).toBeInTheDocument();
 expect(view.container.querySelector('main')).toBeNull();
});
it('hides the pager with a single page of tickets',async()=>{
 hooks.list.mockReturnValue({data:{tickets:[{id,eventId:id,title:'Tasting',status:'CONFIRMED',startDate:new Date('2026-10-20T18:00:00Z')}],totalPages:1}});await mount();
 expect(screen.queryByRole('navigation',{name:'Pagination'})).toBeNull();
});
