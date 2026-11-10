import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ReviewsList } from './ReviewsList';

const mockState = { ownReview: false, loading: false, fail: false, listFail: false, authenticated: true, pages: 3 };
const mockQueries = jest.fn();
const mockRetry = jest.fn();
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@/presentation/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: mockState.authenticated, user: { id: 'owner' } }) }));
jest.mock('@/presentation/hooks/queries/wine/useWines', () => ({
  useMyReviewStatus: () => ({ data: { hasReview: mockState.ownReview } }),
  useWineReviews: (wineId: string | undefined, query: { filter: string; page: number }) => {
    mockQueries(wineId, query);
    const own = query.filter === 'mine';
    const listed = query.page > 0 ? `${query.filter}-page-${query.page}` : 'recent';
    const data = !wineId || (!own && mockState.listFail) ? undefined : { items: own ? (mockState.ownReview ? [{ id: 'older-own', userId: 'owner' }] : [])
      : [{ id: listed, userId: 'another' }], total: 23, totalPages: own ? 1 : mockState.pages, page: query.page,
      hasNext: !own && query.page < mockState.pages - 1, hasPrevious: query.page > 0 };
    return { data, currentData: data,
    isLoading: !!wineId && own && mockState.loading,
    isError: !!wineId && (own ? mockState.fail : mockState.listFail),
    error: new Error('offline'), refetch: mockRetry };
  },
}));
jest.mock('./ReviewItem', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Text, Pressable } = jest.requireActual<typeof import('react-native')>('react-native');
  return { ReviewItem: ({ review, onEdit }: { review: { id: string }; onEdit: () => void }) =>
    React.createElement(Pressable, { onPress: onEdit }, React.createElement(Text, null, review.id)) };
});
jest.mock('@/presentation/components/ui/QueryErrorState', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Text, Pressable } = jest.requireActual<typeof import('react-native')>('react-native');
  return { QueryErrorState: ({ onRetry }: { onRetry: () => void }) =>
    React.createElement(Pressable, { onPress: onRetry }, React.createElement(Text, null, 'Retry')) };
});
const mockWrite = jest.fn();
const mockEdit = jest.fn();
const list = (props: Partial<React.ComponentProps<typeof ReviewsList>> = {}) =>
  <ReviewsList wineId="wine" onWriteReview={mockWrite} onEditReview={mockEdit} {...props} />;
const WRITE = 'reviews.writeReview';
beforeEach(() => { jest.clearAllMocks(); Object.assign(mockState, { ownReview: false, loading: false, fail: false, listFail: false, authenticated: true, pages: 3 }); });
it('opens an older own review first and keeps it editable alongside recent reviews', () => {
  mockState.ownReview = true;
  const view = render(list({ focusOwnReview: true }));
  expect(view.getAllByText(/older-own|recent/).map(node => node.props.children)).toEqual(['older-own', 'recent']);
  expect(mockQueries).toHaveBeenCalledWith('wine', { page: 0, pageSize: 1, filter: 'mine' });
  expect(view.queryByText(WRITE)).toBeNull();
  fireEvent.press(view.getByText('older-own'));
  expect(mockEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'older-own' }));
});
it('does not fetch the own review on ordinary visits or without a session', () => {
  const view = render(list());
  expect(mockQueries).toHaveBeenCalledWith(undefined, { page: 0, pageSize: 1, filter: 'mine' });
  expect(view.getByText(WRITE)).toBeTruthy();
  mockState.authenticated = false;
  view.rerender(list({ focusOwnReview: true }));
  expect(mockQueries.mock.calls.at(-1)?.[0]).toBeUndefined();
  expect(view.queryByText(WRITE)).toBeNull();
});
it('waits for the own review and exposes retry rather than a duplicate publication form', () => {
  mockState.loading = true;
  const view = render(list({ focusOwnReview: true }));
  expect(view.queryByText(WRITE)).toBeNull();
  mockState.loading = false;
  mockState.fail = true;
  view.rerender(list({ focusOwnReview: true }));
  expect(view.queryByText(WRITE)).toBeNull();
  fireEvent.press(view.getByText('Retry'));
  expect(mockRetry).toHaveBeenCalledTimes(1);
});
it('pages through the reviews of a wine in the chosen order', () => {
  const view = render(list());
  expect(mockQueries).toHaveBeenCalledWith('wine', { page: 0, pageSize: 10, filter: 'recent' });
  expect(view.getByText('reviews.page')).toBeTruthy();
  expect(view.getByLabelText('common.previous').props.accessibilityState).toMatchObject({ disabled: true });
  fireEvent.press(view.getByLabelText('common.next'));
  expect(mockQueries).toHaveBeenCalledWith('wine', { page: 1, pageSize: 10, filter: 'recent' });
  expect(view.getByText('recent-page-1')).toBeTruthy();
  fireEvent.press(view.getByLabelText('common.previous'));
  expect(mockQueries.mock.calls.at(-2)).toEqual(['wine', { page: 0, pageSize: 10, filter: 'recent' }]);
});
it('sorts by popularity from the first page', () => {
  const view = render(list());
  fireEvent.press(view.getByLabelText('common.next'));
  fireEvent.press(view.getByText('reviews.sortPopular'));
  expect(mockQueries).toHaveBeenCalledWith('wine', { page: 0, pageSize: 10, filter: 'popular' });
  fireEvent.press(view.getByLabelText('common.next'));
  expect(view.getByText('popular-page-1')).toBeTruthy();
  fireEvent.press(view.getByText('reviews.sortRecent'));
  expect(mockQueries.mock.calls.at(-2)).toEqual(['wine', { page: 0, pageSize: 10, filter: 'recent' }]);
});
it('hides paging when every review fits on one page', () => {
  mockState.pages = 1;
  const view = render(list());
  expect(view.getByText('recent')).toBeTruthy();
  expect(view.queryByText('reviews.page')).toBeNull();
  expect(view.queryByLabelText('common.next')).toBeNull();
});
it('shows a retry instead of "no reviews" when the reviews fail to load, keeping the composer', () => {
  mockState.listFail = true;
  const view = render(list());
  expect(view.queryByText('wines.noReviews')).toBeNull();
  expect(view.getByText(WRITE)).toBeTruthy();
  fireEvent.press(view.getByText('Retry'));
  expect(mockRetry).toHaveBeenCalledTimes(1);
});
it('offers a Write review button instead of an inline form and opens the sheet from it', () => {
  const view = render(list());
  expect(view.queryByLabelText('reviews.form.titleLabel')).toBeNull();
  expect(view.queryByText('wines.sendReview')).toBeNull();

  fireEvent.press(view.getByRole('button', { name: WRITE }));

  expect(mockWrite).toHaveBeenCalledTimes(1);
  expect(mockEdit).not.toHaveBeenCalled();
});
it('keeps telling a reader who already reviewed the wine instead of offering a second review', () => {
  mockState.ownReview = true;
  const view = render(list());
  expect(view.queryByText(WRITE)).toBeNull();
  expect(view.getByText('wines.alreadyReviewed')).toBeTruthy();
});
