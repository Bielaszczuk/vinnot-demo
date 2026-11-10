import { test, expect } from "./fixtures";
import content from "../../../content/public-pages.json" with { type: "json" };

test.beforeEach(async ({ page }) => {
  // Begin with an explicit guest logout; a catalog-shaped response to /auth/me
  // otherwise invents a user and makes the contact email read-only.
  await page.addInitScript(() => localStorage.setItem("vinnot-logout-pending", "1"));
  // No production API writes, email delivery, or third-party requests in browser acceptance.
  await page.route(/^https?:\/\/[^/]+\/api\//, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ content: [], totalElements: 0, totalPages: 0 }),
    }),
  );
});
for (const locale of ["es", "en"] as const) {
  test(`every public document has content and stable anchors in ${locale}`, async ({
    page,
  }) => {
    await page.goto("/legal");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    if (locale === "en") {
      await page.evaluate(async () => {
        const modulePath = "/src/shared/i18n/index.ts";
        const module = await import(/* @vite-ignore */ modulePath);
        await module.default.changeLanguage("en-US");
      });
    }
    for (const document of content.pages) {
      // SPA navigation preserves selected locale.
      await page.evaluate((path) => {
        window.history.pushState({}, "", path);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }, "/legal/" + document.slug);
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: document.title[locale],
          exact: true,
        }),
      ).toBeVisible();
      await expect(page.locator("article section[id]")).toHaveCount(
        document.sections.length,
      );
      const first = document.sections[0]!;
      await page
        .getByRole("link", { name: first.title[locale], exact: true })
        .click();
      await expect(page).toHaveURL(new RegExp("#" + first.id + "$"));
    }
    await page.reload();
    await expect(page.locator("article h1")).toBeVisible();
  });
}
test("help search, cookie choice, and failed images retain usable actions", async ({
  page,
}) => {
  await page.goto("/help");
  await page.getByLabel("Buscar en ayuda").fill("zzzzzz");
  await expect(page.getByRole("status")).toContainText("No encontramos");
  await page.getByLabel("Buscar en ayuda").fill("escaneo");
  await expect(page.locator("article section[id]")).not.toHaveCount(0);
  await page.goto("/cookies");
  const option = page.getByRole("checkbox");
  await expect(option).not.toBeChecked();
  await option.check();
  await page.reload();
  await expect(option).toBeChecked();
  await option.uncheck();
  await page.reload();
  await expect(option).not.toBeChecked();
  await page.route(/\/(?:src\/shared\/assets\/illustrations\/.*|assets\/(?:403|404|429|500|503|emptycellar|event|legal|noconection|privacy|routes|timeout|winery)-.*)\.webp$/, (route) => route.abort());
  for (const path of [
    "/403",
    "/404",
    "/429",
    "/500",
    "/503",
    "/offline",
    "/timeout",
  ]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Ir al inicio" }),
    ).toBeVisible();
  }
});
test("contact preserves data after failure and reuses the id for the accepted retry", async ({
  page,
}) => {
  let firstId = "";
  let attempts = 0;
  await page.route("**/support/requests", async (route) => {
    const input = route.request().postDataJSON();
    attempts++;
    if (attempts === 1) {
      firstId = input.requestId;
      await route.fulfill({
        status: 503,
        json: { code: "SUPPORT_UNAVAILABLE" },
      });
    } else {
      expect(input.requestId).toBe(firstId);
      await route.fulfill({
        status: 202,
        json: { requestId: input.requestId },
      });
    }
  });
  await page.goto("/contact");
  await page.getByLabel("Nombre", { exact: true }).fill("QA User");
  await page.getByLabel("Correo", { exact: true }).fill("qa@example.org");
  await page
    .getByLabel("Mensaje", { exact: true })
    .fill("Consulta de prueba controlada");
  await page.getByRole("button", { name: "Enviar consulta" }).click();
  await expect(page.getByRole("alert")).toContainText("Conservamos");
  await expect(page.getByLabel("Mensaje", { exact: true })).toHaveValue(
    "Consulta de prueba controlada",
  );
  await page.getByRole("button", { name: "Enviar consulta" }).click();
  await expect(page.getByRole("status")).toContainText("Referencia");
  await expect(page.getByLabel("Mensaje", { exact: true })).toHaveValue("");
  expect(attempts).toBe(2);
});
test("phone layout keeps legal index and contact controls inside the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of ["/legal", "/privacy", "/help", "/contact", "/503"]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: "/tmp/vinnot-132-mobile-web.png",
    fullPage: true,
  });
});
