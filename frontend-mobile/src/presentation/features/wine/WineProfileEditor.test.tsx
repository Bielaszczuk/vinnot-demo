import { useState } from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { createProfileDraft, PROFILE_LIST_FIELDS, PROFILE_SCORE_FIELDS, PROFILE_TEXT_FIELDS } from "@/domain/wine/wine-profile.validators";
import { wineProfileFixture } from "@/test/fixtures/wineProfile";
import { WineProfileEditor } from "./WineProfileEditor";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string, values?: { label?: string; index?: number }) =>
  values ? `${key}:${values.label}:${values.index ?? ""}` : key }) }));

it("renders every supported text, score and list without exposing the raw JSON", () => {
  const view = render(<WineProfileEditor draft={createProfileDraft(wineProfileFixture)} errors={{}} onChange={jest.fn()} />);
  for (const field of [...PROFILE_TEXT_FIELDS, ...PROFILE_SCORE_FIELDS]) expect(view.getByTestId(`profile-field-${field}`)).toBeTruthy();
  for (const field of PROFILE_LIST_FIELDS) expect(view.getByTestId(`profile-field-${field}-0`)).toBeTruthy();
  expect(view.queryByText(/JSON/)).toBeNull();
  expect(view.getAllByRole("progressbar").map(bar => bar.props.accessibilityValue.now)).toEqual([0, 65, 30, 50]);
});

it("edits, adds and removes individual list items without splitting commas in their text", () => {
  function Editor() {
    const [draft, setDraft] = useState(() => createProfileDraft(wineProfileFixture));
    return <WineProfileEditor draft={draft} errors={{}} onChange={(field, value) =>
      setDraft(current => ({ ...current, values: { ...current.values, [field]: value } }))} />;
  }
  const view = render(<Editor />);
  fireEvent.changeText(view.getByTestId("profile-field-summary"), "Updated summary");
  expect(view.getByTestId("profile-field-summary").props.value).toBe("Updated summary");
  fireEvent.press(view.getByLabelText("admin.aiProfile.addItem:aiProfile.foodPairings:"));
  fireEvent.changeText(view.getByTestId("profile-field-foodPairings.pairings-2"), "Cheese, fruit and nuts");
  fireEvent.press(view.getByLabelText("admin.aiProfile.removeItem:aiProfile.foodPairings:1"));
  expect(view.getByTestId("profile-field-foodPairings.pairings-0").props.value).toBe("Pasta, tomato and herbs");
  expect(view.getByTestId("profile-field-foodPairings.pairings-1").props.value).toBe("Cheese, fruit and nuts");
  expect(view.queryByTestId("profile-field-foodPairings.pairings-2")).toBeNull();
});

it("shows field errors and disables inputs and list actions while persisting", () => {
  const onChange = jest.fn();
  const view = render(<WineProfileEditor draft={createProfileDraft(wineProfileFixture)}
    errors={{ summary: "required", "palateAnalysis.bodyScore": "score" }} disabled onChange={onChange} />);
  expect(view.getByText("admin.aiProfile.summaryRequired")).toBeTruthy();
  expect(view.getByText("admin.aiProfile.scoreError")).toBeTruthy();
  expect(view.getByTestId("profile-field-summary").props.editable).toBe(false);
  fireEvent.press(view.getByLabelText("admin.aiProfile.addItem:aiProfile.idealOccasions:"));
  fireEvent.press(view.getByLabelText("admin.aiProfile.removeItem:aiProfile.idealOccasions:1"));
  expect(onChange).not.toHaveBeenCalled();
});
