import { expect, test } from "@playwright/test";

test("foundation shell is navigable and responsive", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /the world stage\.? ?your decisions\./i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /new tournament/i }),
  ).toBeDisabled();

  await page.getByRole("link", { name: "Methodology" }).first().click();
  await expect(
    page.getByRole("heading", { name: /a model you can interrogate/i }),
  ).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForLoadState("networkidle");
  const menuButton = page.getByRole("button", {
    name: /open navigation menu/i,
  });
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  await menuButton.click();
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("navigation", { name: /mobile navigation/i }),
  ).toBeVisible();
});

test("skip link reaches the main content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");

  const skipLink = page.getByRole("link", { name: /skip to main content/i });
  await expect(skipLink).toBeFocused();
  await skipLink.press("Enter");
  await expect(page.locator("#main-content")).toBeInViewport();
});

test("tournament model exposes the verified groups and bracket", async ({
  page,
}) => {
  await page.goto("/tournament-model");

  await expect(
    page.getByRole("heading", { name: /tournament, wired correctly/i }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Group A" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Group L" })).toBeVisible();
  await expect(page.getByText("Match 73", { exact: true })).toBeVisible();
  await expect(page.getByText("Match 88", { exact: true })).toBeVisible();
  await expect(page.getByText("2A", { exact: true })).toBeVisible();
  await expect(page.getByText("2B", { exact: true })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "Group A" })).toBeVisible();
  await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll");
});

test("data quality exposes all validated official squads", async ({ page }) => {
  await page.goto("/data-quality");

  await expect(
    page.getByRole("heading", { name: /every squad.*accounted for/i }),
  ).toBeVisible();
  await expect(page.getByText("1,248", { exact: true })).toBeVisible();
  await expect(page.getByText("48/48", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Mexico · official 26" }),
  ).toBeVisible();
  await expect(
    page.getByText("Quality gate passed", { exact: true }),
  ).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: /48 complete official squads/i }),
  ).toBeVisible();
});

test("ratings page exposes estimated player and team ratings", async ({
  page,
}) => {
  await page.goto("/ratings");

  await expect(
    page.getByRole("heading", {
      name: /independent ratings, built to be questioned/i,
    }),
  ).toBeVisible();
  await expect(page.getByText("1,248", { exact: true })).toBeVisible();
  await expect(page.getByText("8/player", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Top estimated squads" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Argentina · default 4-3-3" }),
  ).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText("Model contract", { exact: true })).toBeVisible();
});

test("match engine page exposes deterministic event log diagnostics", async ({
  page,
}) => {
  await page.goto("/match-engine");

  await expect(
    page.getByRole("heading", { name: /a match log first\. animation later/i }),
  ).toBeVisible();
  await expect(page.getByText(/engine gate passed/i)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /first notable events/i }),
  ).toBeVisible();
  await expect(page.getByText("phase-5-sample-opening-match")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByText("Immutable event log", { exact: true }),
  ).toBeVisible();
});
