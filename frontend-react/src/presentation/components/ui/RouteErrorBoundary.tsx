import { Component, type ReactNode } from "react";
import { useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IllustratedState } from "./IllustratedState";
import { Button } from "./Button";

class RenderBoundary extends Component<
  { children: ReactNode; fallback: (retry: () => void) => ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed
      ? this.props.fallback(() => this.setState({ failed: false }))
      : this.props.children;
  }
}
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { t } = useTranslation();
  return (
    <RenderBoundary
      key={location.pathname}
      fallback={(retry) => (
        <IllustratedState kind="server">
          <Button onClick={retry}>{t("common.retry")}</Button>
          <Link
            to="/"
            className="rounded-xl border border-wine-200 px-4 py-3 text-wine-700"
          >
            {t("nav.home")}
          </Link>
        </IllustratedState>
      )}
    >
      {children}
    </RenderBoundary>
  );
}
