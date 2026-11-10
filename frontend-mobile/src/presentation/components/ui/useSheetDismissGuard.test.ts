import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { Alert, type AlertButton } from "react-native";
import { act, renderHook } from "@testing-library/react-native";
import { useSheetDismissGuard } from "./useSheetDismissGuard";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
const present = jest.fn();
const onClose = jest.fn();
const sheetRef = { current: { present } };
const press = (label: string) => {
  const buttons = alert.mock.calls.at(-1)?.[2] as AlertButton[];
  act(() => buttons.find((button) => button.text === label)?.onPress?.());
};
const guard = (state: { dirty: boolean; busy: boolean; visible?: boolean }) =>
  renderHook(() => useSheetDismissGuard({ sheetRef, visible: state.visible ?? true, dirty: state.dirty, busy: state.busy, onClose }));

describe("sheet dismiss guard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("closes at once when nothing changed", () => {
    const { result } = guard({ dirty: false, busy: false });
    result.current.requestClose();
    result.current.handleDismiss();
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(alert).not.toHaveBeenCalled();
  });

  it("asks before discarding changes on Cancel and keeps the sheet when the user keeps editing", () => {
    const { result } = guard({ dirty: true, busy: false });
    result.current.requestClose();
    expect(alert).toHaveBeenCalledWith("common.unsavedChanges.title", "common.unsavedChanges.message",
      expect.any(Array), { cancelable: false });
    press("common.unsavedChanges.keepEditing");
    expect(onClose).not.toHaveBeenCalled();
    result.current.requestClose();
    press("common.unsavedChanges.discard");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("re-opens a swiped sheet with unsaved changes when the user keeps editing", () => {
    const { result } = guard({ dirty: true, busy: false });
    result.current.handleDismiss();
    press("common.unsavedChanges.keepEditing");
    expect(present).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("cannot be dismissed while saving", () => {
    const { result } = guard({ dirty: true, busy: true });
    expect(result.current.enablePanDownToClose).toBe(false);
    expect(result.current.backdropPressBehavior).toBe("none");
    result.current.requestClose();
    result.current.handleDismiss();
    expect(onClose).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
    expect(present).toHaveBeenCalledTimes(1);
  });

  it("stays closed after a save even when the sheet reports the dismissal through an older callback", () => {
    const state = { dirty: true, busy: true, visible: true };
    const { result, rerender } = renderHook(() =>
      useSheetDismissGuard({ sheetRef, visible: state.visible, dirty: state.dirty, busy: state.busy, onClose }),
    );
    const dismissedWhileSaving = result.current.handleDismiss;
    state.busy = false;
    state.visible = false;
    rerender({});
    dismissedWhileSaving();
    expect(present).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("ignores the dismissal that follows a parent closing the sheet", () => {
    const { result } = guard({ dirty: true, busy: false, visible: false });
    result.current.handleDismiss();
    expect(alert).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
