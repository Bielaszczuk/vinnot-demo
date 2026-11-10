// Only the originating event screen may be resumed. No callback credentials enter routing state.
let target = '/partner/events';
export const paymentReturnNavigation = {
  remember(path: string) { target = path === '/admin/events' ? path : '/partner/events'; },
  destination() { return target; },
};
