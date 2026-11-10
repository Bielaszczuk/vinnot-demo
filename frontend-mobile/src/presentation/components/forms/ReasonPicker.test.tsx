import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { ReasonPicker } from "./ReasonPicker";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string, o?: { count: number; max: number }) => (o ? `${o.count}/${o.max}` : key) }),
}));
jest.mock("@/presentation/components/ui/TextField", () => {
  const { Text, TextInput, View } = jest.requireActual("react-native");
  return {
    TextField: ({ label, hint, ...props }: { label: string; hint: string }) => (
      <View>
        <TextInput accessibilityLabel={label} {...props} />
        <Text>{hint}</Text>
      </View>
    ),
  };
});

const REASONS = ["SPAM", "FRAUD", "OTHER"] as const;
type Reason = (typeof REASONS)[number];

function Harness() {
  const [reason, setReason] = useState<Reason>("SPAM");
  const [note, setNote] = useState("");
  return (
    <ReasonPicker
      label="Reason"
      reasons={REASONS}
      value={reason}
      onChange={setReason}
      labelFor={(code) => ({ SPAM: "Spam", FRAUD: "Fraud", OTHER: "Other" })[code]}
      note={note}
      onNoteChange={setNote}
      noteLabel="Detail"
      maxNoteLength={255}
    />
  );
}

it("offers free text only under Other", () => {
  render(<Harness />);
  expect(screen.queryByLabelText("Detail")).toBeNull();
  fireEvent.press(screen.getByRole("radio", { name: "Fraud" }));
  expect(screen.queryByLabelText("Detail")).toBeNull();
  fireEvent.press(screen.getByRole("radio", { name: "Other" }));
  fireEvent.changeText(screen.getByLabelText("Detail"), "Chargebacks");
  expect(screen.getByText("11/255")).toBeTruthy();
  fireEvent.press(screen.getByRole("radio", { name: "Spam" }));
  expect(screen.queryByLabelText("Detail")).toBeNull();
});
