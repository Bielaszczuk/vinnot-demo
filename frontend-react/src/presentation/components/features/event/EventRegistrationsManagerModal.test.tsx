import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import en from '@i18n/locales/en-US.json';
import { EventRegistrationsManagerModal } from './EventRegistrationsManagerModal';

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(), refund: vi.fn(), toast: vi.fn(), refetch: vi.fn(), review: vi.fn(),
  list: null as unknown[] | null, pending: { isPending: false, variables: undefined } as { isPending: boolean; variables?: { registrationId: string } },
  payment: { registrationId: 'registration', attemptId: 'attempt', amount: 50, currency: 'ARS', paymentStatus: 'APPROVED', refundStatus: 'NONE', canRefund: true },
  registration: { id: 'registration', status: 'CONFIRMED', totalAmount: 50, currency: 'ARS', attendeeCount: 1,
    contactName: 'Guest', contactEmail: 'guest@example.com', contactPhone: '', companionNames: [], expiresAt: null,
    paymentStatus: 'APPROVED', externallyManagedPayment: true },
}));
vi.mock('@hooks/queries/event', () => ({
  useEventRegistrations: () => ({ data: { registrations: mocks.list ?? [mocks.registration] }, refetch: mocks.refetch }),
  useReviewEventRegistration: () => ({ ...mocks.pending, mutateAsync: mocks.review }),
}));
vi.mock('@hooks/queries/event/useOrganizerPayments', () => ({
  useOrganizerPayments: () => ({ data: [mocks.payment], refetch: mocks.refetch }),
  useRequestPaymentRefund: () => ({ isPending: false, mutateAsync: mocks.refund }),
}));
vi.mock('@hooks/useConfirm', () => ({ useConfirm: () => ({ confirm: mocks.confirm }) }));
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: mocks.toast }) }));
beforeEach(() => {
  vi.clearAllMocks(); mocks.confirm.mockResolvedValue(true); mocks.refund.mockResolvedValue(undefined);
  mocks.refetch.mockResolvedValue(undefined); mocks.payment.canRefund = true; mocks.payment.refundStatus = 'NONE';
  mocks.registration.status = 'CONFIRMED'; mocks.registration.paymentStatus = 'APPROVED';
  mocks.review.mockResolvedValue(undefined);
  mocks.list = null; mocks.pending = { isPending: false, variables: undefined }; mocks.registration.totalAmount = 50;
});
async function mount() {
  const i18n = createInstance(); await i18n.use(initReactI18next).init({ lng: 'en-US', resources: { 'en-US': { translation: en } } });
  render(<I18nextProvider i18n={i18n}><EventRegistrationsManagerModal isOpen eventId="event" eventTitle="Tasting" onClose={vi.fn()} /></I18nextProvider>);
}
it('confirms the exact refund and reports a request, not completed money movement', async () => {
  await mount(); fireEvent.click(screen.getByRole('button', { name: en.events.refund.action }));
  await waitFor(() => expect(mocks.refund).toHaveBeenCalledWith('attempt'));
  expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Guest') }));
  await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith({ type: 'success', message: en.events.refund.requested }));
  expect(screen.queryByLabelText(en.events.registrationManager.paymentMethod)).not.toBeInTheDocument();
});
it('does not request a refund after cancelling the confirmation', async () => {
  mocks.confirm.mockResolvedValue(false); await mount();
  fireEvent.click(screen.getByRole('button', { name: en.events.refund.action }));
  await waitFor(() => expect(mocks.confirm).toHaveBeenCalled()); expect(mocks.refund).not.toHaveBeenCalled();
});
it('shows a completed refund without a second refund action', async () => {
  mocks.payment.canRefund = false; mocks.payment.refundStatus = 'SUCCEEDED'; await mount();
  expect(screen.getByRole('status')).toHaveTextContent(en.events.refund.SUCCEEDED);
  expect(screen.queryByRole('button', { name: en.events.refund.action })).not.toBeInTheDocument();
});
it('offers a retry for a refund Mercado Pago rejected and confirms it before sending it again', async () => {
  mocks.payment.refundStatus = 'REJECTED'; await mount();
  expect(screen.getByRole('status')).toHaveTextContent(en.events.refund.REJECTED);
  expect(screen.queryByRole('button', { name: en.events.refund.action })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: en.events.refund.retry }));
  await waitFor(() => expect(mocks.refund).toHaveBeenCalledWith('attempt'));
  expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({
    confirmLabel: en.events.refund.retry, message: expect.stringContaining('Guest'),
  }));
  expect(mocks.confirm.mock.calls[0]?.[0].message).not.toBe(en.events.refund.confirm);
});
it('does not offer manual payment approval for a provider checkout', async () => {
  mocks.payment.canRefund = false; mocks.registration.status = 'AWAITING_PAYMENT'; mocks.registration.paymentStatus = 'PENDING'; await mount();
  expect(screen.queryByRole('button', { name: en.events.registrationManager.actions.APPROVE_PAYMENT })).not.toBeInTheDocument();
});
it('refreshes uncertain failures instead of retrying money operations automatically', async () => {
  mocks.refund.mockRejectedValue(new Error('connection lost')); await mount();
  fireEvent.click(screen.getByRole('button', { name: en.events.refund.action }));
  await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith({ type: 'error', message: en.events.refund.error }));
  expect(mocks.refund).toHaveBeenCalledTimes(1); expect(mocks.refetch).toHaveBeenCalled();
});
it('offers "Go back" as the refund dismiss option', async () => {
  await mount(); fireEvent.click(screen.getByRole('button', { name: en.events.refund.action }));
  await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ cancelLabel: 'Go back' })));
});
const RM = en.events.registrationManager
const second = () => ({ ...mocks.registration, id: 'second', contactName: 'Other guest', contactEmail: 'other@example.com' })

it('asks for confirmation before rejecting and does nothing when dismissed', async () => {
  mocks.payment.canRefund = false; mocks.registration.status = 'REQUESTED'; await mount();
  fireEvent.click(screen.getByRole('button', { name: RM.actions.REJECT }));
  const dialog = screen.getByRole('dialog', { name: RM.actions.REJECT });
  expect(within(dialog).getByText("Reject Guest's registration?")).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Go back' }));
  expect(screen.queryByRole('dialog', { name: RM.actions.REJECT })).toBeNull();
  expect(mocks.review).not.toHaveBeenCalled();
});
it('has no shared note box: the optional note is written inside the confirmation for that attendee', async () => {
  mocks.payment.canRefund = false; mocks.registration.status = 'REQUESTED'; mocks.registration.totalAmount = 0; await mount();
  expect(screen.queryByRole('textbox')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: RM.actions.APPROVE }));
  const dialog = screen.getByRole('dialog', { name: RM.actions.APPROVE });
  expect(within(dialog).getByText("Approve Guest's registration?")).toBeInTheDocument();
  fireEvent.change(within(dialog).getByLabelText('Note for Guest (optional)'), { target: { value: ' See you there ' } });
  fireEvent.click(within(dialog).getByRole('button', { name: RM.actions.APPROVE }));
  await waitFor(() => expect(mocks.review).toHaveBeenCalledWith({ registrationId: 'registration', action: 'APPROVE', organizerNote: 'See you there' }));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: RM.actions.APPROVE })).toBeNull());
  expect(mocks.toast).toHaveBeenCalledWith({ type: 'success', message: RM.updateSuccess });
});
it('never carries a note to the next attendee', async () => {
  mocks.payment.canRefund = false; mocks.registration.status = 'REQUESTED'; mocks.registration.totalAmount = 0; mocks.list = [mocks.registration, second()]; await mount();
  fireEvent.click(screen.getAllByRole('button', { name: RM.actions.WAITLIST })[0]!);
  fireEvent.click(screen.getByRole('radio', { name: RM.reasons.OTHER }));
  fireEvent.change(screen.getByLabelText('Note for Guest (optional)'), { target: { value: 'Only for Guest' } });
  fireEvent.click(within(screen.getByRole('dialog', { name: RM.actions.WAITLIST })).getByRole('button', { name: RM.actions.WAITLIST }));
  await waitFor(() => expect(mocks.review).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: RM.actions.WAITLIST })).toBeNull());
  fireEvent.click(screen.getAllByRole('button', { name: RM.actions.APPROVE })[1]!);
  expect(screen.getByLabelText('Note for Other guest (optional)')).toHaveValue('');
  fireEvent.click(within(screen.getByRole('dialog', { name: RM.actions.APPROVE })).getByRole('button', { name: RM.actions.APPROVE }));
  await waitFor(() => expect(mocks.review).toHaveBeenLastCalledWith({ registrationId: 'second', action: 'APPROVE', organizerNote: undefined }));
});
it('keeps the dialog and its note when the review fails, with a translated error', async () => {
  mocks.payment.canRefund = false; mocks.registration.status = 'REQUESTED';
  mocks.review.mockRejectedValue({ status: 0, code: 'NETWORK_ERROR', message: 'Network Error' }); await mount();
  fireEvent.click(screen.getByRole('button', { name: RM.actions.REJECT }));
  fireEvent.click(screen.getByRole('radio', { name: RM.reasons.OTHER }));
  const note = screen.getByLabelText('Note for Guest (optional)');
  fireEvent.change(note, { target: { value: 'See you there' } });
  fireEvent.click(within(screen.getByRole('dialog', { name: RM.actions.REJECT })).getByRole('button', { name: RM.actions.REJECT }));
  await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith({ type: 'error', message: en.errors.api.network }));
  expect(note).toHaveValue('See you there');
});
it('shows the pending state only on the attendee being acted on', async () => {
  mocks.payment.canRefund = false; mocks.registration.status = 'REQUESTED'; mocks.list = [mocks.registration, second()];
  mocks.pending = { isPending: true, variables: { registrationId: 'second' } }; await mount();
  const [guestReject, otherReject] = screen.getAllByRole('button', { name: RM.actions.REJECT });
  expect(guestReject).toBeEnabled();
  expect(otherReject).toBeDisabled();
});
it('shows each total as a whole price in the registration currency and filters with the shared select', async () => {
  mocks.registration.totalAmount = 1500;
  mocks.list = [{ ...mocks.registration, currency: 'USD' }];
  await mount();
  expect(screen.getByText('$1,500')).toBeInTheDocument();
  const filter = screen.getByRole('combobox', { name: en.admin.submissions.statusLabel });
  expect(filter.className).toContain('rounded-xl');
  expect(screen.queryByRole('navigation', { name: 'Pagination' })).toBeNull();
});
