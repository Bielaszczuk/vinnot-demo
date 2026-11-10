import { it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ImageWithFallback } from "./ImageWithFallback";
import { IllustratedState } from "./IllustratedState";
import { RouteErrorBoundary } from "./RouteErrorBoundary";
import { QueryErrorState } from "./QueryErrorState";
it("prefers supplied images, recovers on source change and terminates fallback errors", () => {
  const onError = vi.fn();
  const { rerender } = render(
    <ImageWithFallback
      src="https://example.org/wine.jpg"
      alt="Wine"
      fallbackSrc="/fallback.jpg"
      onError={onError}
    />,
  );
  fireEvent.error(screen.getByRole("img"));
  expect(screen.getByRole("img")).toHaveAttribute("src", "/fallback.jpg");
  fireEvent.error(screen.getByRole("img"));
  expect(screen.getByRole("img")).not.toHaveAttribute("src");
  expect(onError).toHaveBeenCalledTimes(2);
  rerender(<ImageWithFallback src="https://example.org/new.jpg" alt="Wine" />);
  expect(screen.getByRole("img")).toHaveAttribute(
    "src",
    "https://example.org/new.jpg",
  );
  rerender(<ImageWithFallback src="" fallbackElement={<p>No photo</p>} />);
  expect(screen.getByText("No photo")).toBeVisible();
});
it("retains recovery actions when illustration fails and retries reads explicitly", () => {
  const retry = vi.fn();
  render(<QueryErrorState error={{ status: 503 }} onRetry={retry} />);
  fireEvent.error(document.querySelector("img")!);
  fireEvent.click(screen.getByRole("button"));
  expect(retry).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("heading")).toHaveTextContent(
    "El servicio no está disponible",
  );
});
it("does not offer a blind retry for insufficient permissions", () => {
  render(<QueryErrorState error={{ status: 403 }} onRetry={vi.fn()} />);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
it("renders session state without a misleading forbidden image", () => {
  render(<IllustratedState kind="session" />);
  expect(document.querySelector("img")).toBeNull();
  expect(screen.getByRole("heading")).toHaveTextContent(
    "Volvé a iniciar sesión",
  );
});
it("recovers a render exception without exposing its details", () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  let broken = true;
  function Child() {
    if (broken) throw new Error("SECRET");
    return <p>Recovered</p>;
  }
  render(
    <MemoryRouter>
      <RouteErrorBoundary>
        <Child />
      </RouteErrorBoundary>
    </MemoryRouter>,
  );
  expect(screen.queryByText("SECRET")).not.toBeInTheDocument();
  broken = false;
  fireEvent.click(screen.getByRole("button"));
  expect(screen.getByText("Recovered")).toBeVisible();
  consoleError.mockRestore();
});
