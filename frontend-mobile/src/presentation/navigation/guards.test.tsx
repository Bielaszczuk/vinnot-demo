import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AuthGuard } from './guards';
import { safeNativeIntent } from '@/domain/navigation/nativeIntent';
const mockRemember = jest.fn();
let mockAuthenticated = false;
let mockInitializing = false;
let mockPath = '/wines/fixture';
jest.mock('@/presentation/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: mockAuthenticated, isInitializing: mockInitializing, rememberReturnPath: mockRemember }) }));
jest.mock('@/presentation/store/auth.store', () => ({ useAuthStore: jest.fn() }));
jest.mock('expo-router', () => ({ usePathname: () => mockPath, Redirect: () => null }));
jest.mock('@/presentation/components/ui/Feedback', () => ({ Spinner: () => null }));
beforeEach(() => { jest.clearAllMocks(); mockAuthenticated = false; mockInitializing = false; mockPath = '/wines/fixture'; });
it('does not mount product content or query effects for a guest and remembers its destination', () => {
  const mounted = jest.fn();
  function Product() { mounted(); return <Text>Catalog</Text>; }
  const screen = render(<AuthGuard><Product /></AuthGuard>);
  expect(screen.queryByText('Catalog')).toBeNull();
  expect(mounted).not.toHaveBeenCalled();
  expect(mockRemember).toHaveBeenCalledWith('/wines/fixture');
});
it('waits for session initialization before redirecting or capturing a destination', () => {
  mockInitializing = true;
  const screen = render(<AuthGuard><Text>Catalog</Text></AuthGuard>);
  expect(screen.queryByText('Catalog')).toBeNull();
  expect(mockRemember).not.toHaveBeenCalled();
});
it('mounts the product for an authenticated user', () => {
  mockAuthenticated = true;
  const screen = render(<AuthGuard><Text>Catalog</Text></AuthGuard>);
  expect(screen.getByText('Catalog')).toBeTruthy();
  expect(mockRemember).not.toHaveBeenCalled();
});

it.each(['wines', 'events', 'wine-routes'])('retains a shared %s destination through cold session restoration', kind => {
  mockPath = safeNativeIntent(`https://vinnot.com/share/${kind}/758a7f04-2678-4b92-8f5a-00272d150318`);
  mockInitializing = true;
  const screen = render(<AuthGuard><Text>Detail</Text></AuthGuard>);
  expect(mockRemember).not.toHaveBeenCalled();
  mockInitializing = false;
  screen.rerender(<AuthGuard><Text>Detail</Text></AuthGuard>);
  expect(mockRemember).toHaveBeenCalledWith(mockPath);
  mockAuthenticated = true;
  screen.rerender(<AuthGuard><Text>Detail</Text></AuthGuard>);
  expect(screen.getByText('Detail')).toBeTruthy();
});
