import { render, screen } from "@testing-library/react-native";
import type { ReactTestRendererJSON } from "react-test-renderer";
import { StyleSheet } from "react-native";
import { Button } from "./Button";
import { radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

jest.mock("@/application/services/haptics.service", () => ({ hapticsService: { impact: jest.fn() } }));

/**
 * `Button` wraps its pressable in an animated view. A layout style such as `flex: 1` must reach that wrapper, or a row
 * of buttons collapses and hides their labels (#346).
 */
describe.each(["primary", "outline"] as const)("%s button", (variant) => {
  it("sizes the wrapper with layout styles and keeps the rest on the button", () => {
    const { toJSON } = render(
      <Button variant={variant} style={{ flex: 1, marginTop: 4, alignSelf: "stretch", backgroundColor: "red" }}>
        Send
      </Button>,
    );

    const wrapper = StyleSheet.flatten((toJSON() as ReactTestRendererJSON).props.style);
    const button = StyleSheet.flatten(screen.getByRole("button").props.style);

    expect(wrapper).toMatchObject({ flex: 1, marginTop: 4, alignSelf: "stretch" });
    expect(button.backgroundColor).toBe("red");
    expect(button).not.toHaveProperty("flex");
    expect(button).not.toHaveProperty("marginTop");
    expect(screen.getByText("Send")).toBeTruthy();
  });
});

describe("button tokens (S88)", () => {
  it.each(["sm", "md", "lg"] as const)("the %s size uses the radius scale and the button type preset", (size) => {
    render(<Button size={size}>Save</Button>);
    const surface = StyleSheet.flatten(screen.getByRole("button").props.style);
    const label = StyleSheet.flatten(screen.getByText("Save").props.style);
    expect(surface.borderRadius).toBe(radii.md);
    expect(label.fontFamily).toBe((size === "sm" ? textStyles.buttonSmall : textStyles.button).fontFamily);
    expect(label.lineHeight).toBeGreaterThanOrEqual(label.fontSize);
  });

  it("uses the button preset size for the default button", () => {
    render(<Button variant="outline">Save</Button>);
    expect(StyleSheet.flatten(screen.getByText("Save").props.style).fontSize).toBe(textStyles.button.fontSize);
  });

  it("gives a small button a 44 pt touch target", () => {
    render(<Button size="sm">Edit</Button>);
    const button = screen.getByRole("button");
    const height = StyleSheet.flatten(button.props.style).minHeight as number;
    const slop = button.props.hitSlop as { top: number; bottom: number };
    expect(height + slop.top + slop.bottom).toBeGreaterThanOrEqual(44);
  });
});

describe.each(["primary", "outline"] as const)("%s button label", (variant) => {
  it("shrinks and wraps a long label beside its icon instead of overflowing the screen", () => {
    render(
      <Button variant={variant} leftIcon={<></>}>
        Editar perfil experto completo
      </Button>,
    );
    expect(StyleSheet.flatten(screen.getByText("Editar perfil experto completo").props.style)).toMatchObject({
      flexShrink: 1,
    });
  });
});

describe("label on Android", () => {
  it("keeps one line at the size's height: no font padding, and a long label shrinks instead of wrapping", () => {
    render(<Button size="sm" leftIcon={null}>Agregar a Bodega</Button>);
    const label = screen.getByText("Agregar a Bodega");
    expect(label.props.numberOfLines).toBe(1);
    expect(label.props.adjustsFontSizeToFit).toBe(true);
    expect(label.props.minimumFontScale).toBe(0.8);
    expect(StyleSheet.flatten(label.props.style)).toMatchObject({ includeFontPadding: false, textAlignVertical: "center" });
  });
});
