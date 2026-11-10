import { beforeEach, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TermsGate } from "./TermsGate";
import { legalService } from "@/application/services/legal.service";
const logout = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/presentation/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "account" }, isAuthenticated: true, isInitializing: false, logout }) }));
const language = vi.hoisted(() => ({ current: "es" }));
vi.mock("react-i18next", async () => {
  const { createInstance } = await import("i18next");
  const es = (await import("@/shared/i18n/locales/es-AR.json")).default;
  const en = (await import("@/shared/i18n/locales/en-US.json")).default;
  const i18n = createInstance();
  await i18n.init({ lng: "es", resources: { es: { translation: es }, en: { translation: en } }, interpolation: { escapeValue: false } });
  return { useTranslation: () => ({ t: i18n.getFixedT(language.current), i18n: { language: language.current } }) };
});
vi.mock("@/application/services/legal.service", () => ({ legalService: { status: vi.fn(), accept: vi.fn() } }));
const document = { version: "v1", acceptanceRevision: "r1", locale: "es" as const, contentHash: "a".repeat(64), title: "Términos de uso", summary: "Resumen", sections: [{ id: "one", title: "Reglas", body: "Texto completo" }] };
beforeEach(() => {
  vi.clearAllMocks();
  language.current = "es";
  vi.mocked(legalService.status).mockResolvedValue({ document, required: true, acceptedAt: null });
});
it("blocks business content until explicit confirmed consent, while keeping legal and exit actions available", async () => {
  vi.mocked(legalService.accept).mockResolvedValue({ document, required: false, acceptedAt: "server" });
  render(<MemoryRouter><TermsGate><p>Contenido privado</p></TermsGate></MemoryRouter>);
  const body = await screen.findByText("Texto completo");
  expect(body.closest("details")).not.toHaveAttribute("open");
  const submit = screen.getByRole("button", { name: "Aceptar y continuar" });
  expect(submit).toBeDisabled();
  expect(screen.queryByText("Contenido privado")).toBeNull();
  expect(screen.getByRole("link", { name: /contacto y solicitudes de privacidad/i })).toHaveAttribute("href", "/contact");
  fireEvent.click(screen.getByRole("checkbox"));
  expect(submit).toBeEnabled();
  fireEvent.click(submit);
  await screen.findByText("Contenido privado");
  expect(legalService.accept).toHaveBeenCalledTimes(1);
});
it("declining only signs out, and an unavailable server offers recovery without consent", async () => {
  vi.mocked(legalService.status).mockRejectedValueOnce(new Error("offline"));
  render(<MemoryRouter><TermsGate><p>Contenido privado</p></TermsGate></MemoryRouter>);
  await screen.findByRole("button", { name: "Volver a cargar términos" });
  expect(screen.queryByRole("heading", { name: "Antes de continuar" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Aceptar y continuar" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Ahora no · cerrar sesión" }));
  await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
  expect(legalService.accept).not.toHaveBeenCalled();
  expect(screen.queryByText("Contenido privado")).toBeNull();
});
it("does not gate public legal and support routes or record consent by visiting them", () => {
  render(<MemoryRouter><TermsGate exempt><p>Política pública</p></TermsGate></MemoryRouter>);
  expect(screen.getByText("Política pública")).toBeVisible();
  expect(legalService.status).not.toHaveBeenCalled();
  expect(legalService.accept).not.toHaveBeenCalled();
});

it("never shows acceptance UI while an already accepted account is being checked", async () => {
  let resolve!: (value: Awaited<ReturnType<typeof legalService.status>>) => void;
  vi.mocked(legalService.status).mockReturnValue(new Promise(done => { resolve = done; }));
  render(<MemoryRouter><TermsGate><p>Contenido privado</p></TermsGate></MemoryRouter>);
  expect(screen.getByRole("status", { name: "Verificando tu cuenta…" })).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Antes de continuar" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Aceptar y continuar" })).toBeNull();
  expect(screen.queryByText("Contenido privado")).toBeNull();
  await act(async () => resolve({ document, required: false, acceptedAt: "server" }));
  expect(screen.getByText("Contenido privado")).toBeVisible();
  expect(screen.queryByRole("heading", { name: "Antes de continuar" })).toBeNull();
  expect(legalService.accept).not.toHaveBeenCalled();
});

it("blocks on a failed recheck without asking an already accepted account to accept again", async () => {
  vi.mocked(legalService.status).mockResolvedValueOnce({ document, required: false, acceptedAt: "server" }).mockRejectedValueOnce(new Error("offline"));
  const ui = render(<MemoryRouter><TermsGate><p>Contenido privado</p></TermsGate></MemoryRouter>);
  await screen.findByText("Contenido privado");
  ui.rerender(<MemoryRouter><TermsGate exempt><p>Legal público</p></TermsGate></MemoryRouter>);
  ui.rerender(<MemoryRouter><TermsGate><p>Contenido privado</p></TermsGate></MemoryRouter>);
  await screen.findByRole("button", { name: "Volver a cargar términos" });
  expect(screen.queryByText("Contenido privado")).toBeNull();
  expect(screen.queryByRole("heading", { name: "Antes de continuar" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Aceptar y continuar" })).toBeNull();
});

it("shows the agreement copy from the English locale file", async () => {
  language.current = "en";
  vi.mocked(legalService.status).mockResolvedValue({ document: { ...document, locale: "en" as const }, required: true, acceptedAt: null });
  render(<MemoryRouter><TermsGate><p>Private content</p></TermsGate></MemoryRouter>);
  expect(await screen.findByRole("heading", { name: "Before we continue" })).toBeInTheDocument();
  expect(screen.getByText("I accept the Vinnot Terms of Use, version v1.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Accept and continue" })).toBeDisabled();
  expect(screen.getByRole("link", { name: "Privacy Policy (opens a new tab)" })).toHaveAttribute("href", "/privacy");
});

it("renders inside the app shell without a second main landmark", async () => {
  render(<MemoryRouter><main><TermsGate><p>Contenido privado</p></TermsGate></main></MemoryRouter>);
  expect(screen.getByRole("status", { name: "Verificando tu cuenta…" })).toBeTruthy();
  await screen.findByText("Texto completo");
  expect(screen.getAllByRole("main")).toHaveLength(1);
  expect(screen.getByRole("link", { name: /información legal/i })).toHaveAttribute("href", "/legal");
});
