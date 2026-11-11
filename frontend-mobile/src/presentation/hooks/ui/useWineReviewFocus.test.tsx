import { act, renderHook } from '@testing-library/react-native';
import type { LayoutChangeEvent, ScrollViewInstance } from 'react-native';
import { useWineReviewFocus } from './useWineReviewFocus';

const layout = { nativeEvent: { layout: { y: 750 } } } as LayoutChangeEvent;
it('keeps the reviews at the end of the information tab and scrolls once after content is ready, in either layout order', () => {
  const scroll = jest.fn();
  const { result, rerender } = renderHook(({ id }) => useWineReviewFocus(id, true), { initialProps: { id: 'wine' } });
  result.current.scrollRef.current = { scrollTo: scroll } as unknown as ScrollViewInstance;
  expect(result.current.tab).toBe('info');
  act(() => result.current.onSectionLayout(layout));
  expect(scroll).not.toHaveBeenCalled();
  act(() => result.current.onOwnReviewLayout());
  expect(scroll).toHaveBeenCalledWith({ y: 750, animated: false });
  act(() => { result.current.onOwnReviewLayout(); result.current.onSectionLayout(layout); });
  expect(scroll).toHaveBeenCalledTimes(1);
  act(() => result.current.setTab('ai'));
  expect(result.current.tab).toBe('ai');
  rerender({ id: 'other' });
  expect(result.current.tab).toBe('info');
  act(() => result.current.onOwnReviewLayout());
  expect(scroll).toHaveBeenCalledTimes(1);
  act(() => result.current.onSectionLayout(layout));
  expect(scroll).toHaveBeenCalledTimes(2);
});
it('preserves the information tab and position during an ordinary visit', () => {
  const scroll = jest.fn();
  const { result } = renderHook(() => useWineReviewFocus('wine', false));
  result.current.scrollRef.current = { scrollTo: scroll } as unknown as ScrollViewInstance;
  expect(result.current.tab).toBe('info');
  act(() => { result.current.onOwnReviewLayout(); result.current.onSectionLayout(layout); });
  expect(scroll).not.toHaveBeenCalled();
});

it('opens on the information tab and glides once to the reviews for the reviews link, without pinning the own review', () => {
  const scroll = jest.fn();
  const { result } = renderHook(() => useWineReviewFocus('wine', false, true));
  result.current.scrollRef.current = { scrollTo: scroll } as unknown as ScrollViewInstance;
  expect(result.current.tab).toBe('info');
  expect(result.current.focusOwnReview).toBe(false);
  act(() => result.current.onSectionLayout(layout));
  expect(scroll).toHaveBeenCalledWith({ y: 750, animated: true });
  act(() => result.current.onSectionLayout(layout));
  expect(scroll).toHaveBeenCalledTimes(1);
});

describe('the write-review shortcut', () => {
  const section = (y: number) => ({ nativeEvent: { layout: { y } } }) as LayoutChangeEvent;
  const mount = (focusOwnReview = false) => {
    const scroll = jest.fn();
    const hook = renderHook(() => useWineReviewFocus('wine', focusOwnReview));
    hook.result.current.scrollRef.current = { scrollTo: scroll } as unknown as ScrollViewInstance;
    return { ...hook, scroll };
  };

  it('stays on the information tab and scrolls smoothly to the reviews once the section has laid out', () => {
    const { result, scroll } = mount();
    act(() => result.current.focusReviews(false));
    expect(result.current.tab).toBe('info');
    expect(result.current.focusOwnReview).toBe(false);
    expect(scroll).not.toHaveBeenCalled();
    act(() => result.current.onSectionLayout(section(640)));
    expect(scroll).toHaveBeenCalledWith({ y: 640, animated: true });
    act(() => result.current.onSectionLayout(section(700)));
    expect(scroll).toHaveBeenCalledTimes(1);
  });

  it('scrolls right away when the reviews section is already on screen', () => {
    const { result, scroll } = mount();
    act(() => result.current.onSectionLayout(section(640)));
    expect(scroll).not.toHaveBeenCalled();
    act(() => result.current.focusReviews(false));
    expect(scroll).toHaveBeenCalledWith({ y: 640, animated: true });
  });

  it('waits for a fresh section layout after coming back from the profile tab', () => {
    const { result, scroll } = mount();
    act(() => result.current.onSectionLayout(section(640)));
    act(() => result.current.setTab('ai'));
    act(() => result.current.focusReviews(false));
    expect(result.current.tab).toBe('info');
    expect(scroll).not.toHaveBeenCalled();
    act(() => result.current.onSectionLayout(section(660)));
    expect(scroll).toHaveBeenCalledWith({ y: 660, animated: true });
  });

  it('pins the own review and scrolls to it only after it has laid out', () => {
    const { result, scroll } = mount();
    expect(result.current.focusOwnReview).toBe(false);
    act(() => result.current.focusReviews(true));
    expect(result.current.tab).toBe('info');
    expect(result.current.focusOwnReview).toBe(true);
    act(() => result.current.onSectionLayout(section(640)));
    expect(scroll).not.toHaveBeenCalled();
    act(() => result.current.onOwnReviewLayout());
    expect(scroll).toHaveBeenCalledWith({ y: 640, animated: true });
    act(() => result.current.onOwnReviewLayout());
    expect(scroll).toHaveBeenCalledTimes(1);
  });

  it('keeps the review deep link pinned to the own review', () => {
    const { result } = mount(true);
    expect(result.current.focusOwnReview).toBe(true);
  });
});
