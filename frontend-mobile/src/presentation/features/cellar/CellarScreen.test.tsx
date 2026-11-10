import type { ReactNode } from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { CellarEntry } from '@/domain/cellar/cellar.types';
import CellarScreen from './CellarScreen';

const mockPush = jest.fn();
const mockEntry: CellarEntry = { id: 'entry', wine: { id: 'wine', name: 'Malbec', winery: 'Winery', wineryId: null,
  type: 'RED', vintage: null, imageUrl: null, region: '', country: '', price: null, rating: null },
  rating: 4, notes: 'Personal note', purchasePrice: null, vintage: null, reviewId: null, addedAt: new Date() };
let mockCellarData: CellarEntry[] = [];
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({
  t: (key: string, options?: { count?: number }) => (options?.count === undefined ? key : `${key}:${options.count}`),
}) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('@/presentation/hooks/queries/cellar', () => ({ useCellar: () => ({ data: mockCellarData }), useRemoveCellarEntry: () => ({ mutate: jest.fn() }) }));
jest.mock('@/presentation/hooks/ui', () => ({ useDebounce: (value: string) => value }));
jest.mock('@/presentation/providers/ToastProvider', () => ({ useToast: () => ({ showSuccess: jest.fn(), showError: jest.fn() }) }));
jest.mock('@/presentation/navigation/guards', () => ({ AuthGuard: ({ children }: { children: ReactNode }) => children }));
jest.mock('@gorhom/bottom-sheet', () => ({ BottomSheetModalProvider: ({ children }: { children: ReactNode }) => children }));
jest.mock('@shopify/flash-list', () => ({ FlashList: ({ data, renderItem, ListHeaderComponent }: {
  data: CellarEntry[]; renderItem: (info: { item: CellarEntry }) => ReactNode; ListHeaderComponent: ReactNode }) => {
  const React = jest.requireActual<typeof import('react')>('react');
  return React.createElement(React.Fragment, null, ListHeaderComponent, data.map(item => React.createElement(React.Fragment, { key: item.id }, renderItem({ item }))));
} }));
jest.mock('@/presentation/features/cellar', () => ({
  CellarEntryRow: jest.requireActual<typeof import('./CellarEntryRow')>('./CellarEntryRow').CellarEntryRow,
  CellarAddSheet: () => null, CellarFilterSheet: () => null, CellarStatsBanner: () => null,
}));
jest.mock('@/presentation/features/wine/WineImage', () => ({ WineImage: () => null }));
jest.mock('@/presentation/components/ui/BottomSheet', () => {
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  return {
    BottomSheetBackdrop: () => null,
    BottomSheetScrollView: ({ children }: { children: ReactNode }) => children,
    // Closing finishes at once, so the row menu runs the chosen action right away.
    BottomSheetModal: forwardRef(
      ({ children, onDismiss }: { children: ReactNode; onDismiss?: () => void }, ref: unknown) => {
        useImperativeHandle(ref, () => ({ present: () => undefined, dismiss: () => onDismiss?.() }));
        return children;
      },
    ),
  };
});
jest.mock('./CellarReviewSheet', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return { CellarReviewSheet: () => React.createElement(Text, null, 'Publication draft') };
});
jest.mock('@/presentation/components/ui/MotionPressable', () => ({
  MotionPressable: jest.requireActual<typeof import('react-native')>('react-native').Pressable,
}));
jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => ({
  __esModule: true, default: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('@/presentation/components/layout', () => ({ AppHeader: () => null }));
jest.mock('@/presentation/components/ui/SearchFilterBar', () => ({ SearchFilterBar: () => null }));

beforeEach(() => { jest.clearAllMocks(); mockEntry.reviewId = null; mockCellarData = [mockEntry]; });
it('shows View review and opens the own-review tab with the cellar as the return destination', () => {
  mockEntry.reviewId = 'own-review';
  const view = render(<CellarScreen />);
  fireEvent.press(view.getByLabelText('cellar.viewReview'));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/(app)/(tabs)/wines/[id]',
    params: { id: 'wine', review: 'mine', returnTo: '/(app)/cellar' } });
  expect(view.queryByText('Publication draft')).toBeNull();
  expect(view.queryByLabelText('cellar.publishReview')).toBeNull();
});
it('keeps the publication modal for entries without a review', () => {
  const view = render(<CellarScreen />);
  fireEvent.press(view.getByLabelText('cellar.publishReview'));
  expect(view.getByText('Publication draft')).toBeTruthy();
  expect(mockPush).not.toHaveBeenCalled();
});
it('keeps the floating add button while the cellar has wines', () => {
  const view = render(<CellarScreen />);
  expect(view.getByLabelText('cellar.addWine')).toBeTruthy();
});
it('drops the floating add button on an empty cellar so it never covers the welcome message', () => {
  mockCellarData = [];
  const view = render(<CellarScreen />);
  expect(view.queryByLabelText('cellar.addWine')).toBeNull();
});
it('counts the collection with the plural rules of the language', () => {
  const view = render(<CellarScreen />);
  expect(view.getByText('cellar.winesInCellarCount:1')).toBeTruthy();
});
