import React from "react";
import { Text } from "react-native";
import { act, render, fireEvent } from "@testing-library/react-native";
import { TermsGate } from "./TermsGate";
import { legalService } from "@/application/services/legal.service";
const mockLogout = jest.fn().mockResolvedValue(undefined);
jest.mock("@/presentation/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "account" }, isAuthenticated: true, isInitializing: false, logout: mockLogout }) }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: { language: "es" }, t: (key: string) => key }) }));
jest.mock("@/application/services/legal.service", () => ({ legalService: { status: jest.fn(), accept: jest.fn() } }));
jest.mock("./PublicHeader", () => ({ PublicHeader: () => null }));
jest.mock("expo-router", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  const mockNative = jest.requireActual<typeof import("react-native")>("react-native");
  return { Link: ({ children }: { children: React.ReactNode }) => mockReact.createElement(mockNative.Text, null, children) };
});
const document = { version: "v1", acceptanceRevision: "r1", locale: "es" as const, contentHash: "a".repeat(64), title: "Términos de uso", summary: "Resumen", sections: [{ id: "one", title: "Reglas", body: "Texto completo" }] };
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(legalService.status).mockResolvedValue({ document, required: true, acceptedAt: null });
});
async function renderGate() {
  const ui = render(<TermsGate><Text>Contenido privado</Text></TermsGate>);
  // Flush the mocked service and React effects before assertions; do not race
  // the default polling timeout against cold native component loading in CI.
  await act(async () => {
    await Promise.resolve();
  });
  return ui;
}
it("requires an unchecked native checkbox and server confirmation without scroll tracking", async () => {
  jest.mocked(legalService.accept).mockResolvedValue({ document, required: false, acceptedAt: "server" });
  const ui = await renderGate();
  expect(ui.queryByText("Texto completo")).toBeNull();
  fireEvent.press(ui.getByText("Leer el texto completo"));
  expect(ui.getByText("Texto completo")).toBeTruthy();
  fireEvent.press(ui.getByText("Ocultar texto"));
  expect(ui.queryByText("Contenido privado")).toBeNull();
  const checkbox = ui.getByRole("checkbox");
  expect(checkbox.props.accessibilityState.checked).toBe(false);
  fireEvent.press(ui.getByText("Aceptar y continuar"));
  expect(legalService.accept).not.toHaveBeenCalled();
  fireEvent.press(checkbox);
  expect(ui.getByRole("checkbox").props.accessibilityState.checked).toBe(true);
  await act(async () => { fireEvent.press(ui.getByText("Aceptar y continuar")); });
  expect(ui.getByText("Contenido privado")).toBeTruthy();
  expect(legalService.accept).toHaveBeenCalledTimes(1);
});
it("keeps a recoverable state after failure and supports declining without acceptance", async () => {
  jest.mocked(legalService.status).mockRejectedValueOnce(new Error("offline"));
  const ui = await renderGate();
  expect(ui.getByText("Volver a cargar términos")).toBeTruthy();
  expect(ui.queryByText("Aceptar y continuar")).toBeNull();
  expect(ui.queryByRole("checkbox")).toBeNull();
  expect(ui.getByText("Contacto y solicitudes de privacidad")).toBeTruthy();
  await act(async () => { fireEvent.press(ui.getByText("Ahora no · cerrar sesión")); });
  expect(mockLogout).toHaveBeenCalledTimes(1);
  expect(legalService.accept).not.toHaveBeenCalled();
});

it("waits neutrally for an already accepted account and never requests consent", async () => {
  let resolve!: (result: Awaited<ReturnType<typeof legalService.status>>) => void;
  jest.mocked(legalService.status).mockReturnValue(new Promise(done => { resolve = done; }));
  const ui = render(<TermsGate><Text>Contenido privado</Text></TermsGate>);
  expect(ui.getByText("Verificando tu cuenta…")).toBeTruthy();
  expect(ui.queryByText("Antes de continuar")).toBeNull();
  expect(ui.queryByText("Aceptar y continuar")).toBeNull();
  expect(ui.queryByText("Contenido privado")).toBeNull();
  await act(async () => { resolve({ document, required: false, acceptedAt: "server" }); });
  expect(ui.getByText("Contenido privado")).toBeTruthy();
  expect(ui.queryByText("Antes de continuar")).toBeNull();
  expect(legalService.accept).not.toHaveBeenCalled();
});

it("shows the offline illustration instead of an agreement error when there is no connection, and retries", async () => {
  jest.mocked(legalService.status)
    .mockRejectedValueOnce(Object.assign(new Error("Network Error"), { code: "NETWORK_ERROR" }))
    .mockResolvedValueOnce({ document, required: false, acceptedAt: "server" });
  const ui = await renderGate();
  expect(ui.getByText("illustratedState.offline.title")).toBeTruthy();
  expect(ui.getByText("illustratedState.offline.description")).toBeTruthy();
  expect(ui.queryByText("No pudimos verificar tu acuerdo")).toBeNull();
  expect(ui.queryByText("Contenido privado")).toBeNull();
  await act(async () => { fireEvent.press(ui.getByText("Reintentar")); });
  expect(legalService.status).toHaveBeenCalledTimes(2);
  expect(ui.getByText("Contenido privado")).toBeTruthy();
});

it("keeps the agreement error for failures that are not about the connection", async () => {
  jest.mocked(legalService.status).mockRejectedValueOnce(Object.assign(new Error("boom"), { status: 500 }));
  const ui = await renderGate();
  expect(ui.getByText("No pudimos verificar tu acuerdo")).toBeTruthy();
  expect(ui.queryByText("illustratedState.offline.title")).toBeNull();
});
