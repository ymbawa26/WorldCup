import { expect, test } from "@playwright/test";

test("foundation shell is navigable and responsive", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /the world stage\.? ?your decisions\./i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /new tournament/i }),
  ).toBeVisible();

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

test("play flow advances by selected-team match and manages saves", async ({
  page,
}) => {
  await page.goto("/play");

  await page.getByLabel("Country").selectOption("mexico");
  await expect(page.getByLabel("Seed")).toHaveCount(0);
  await page.getByRole("button", { name: /^new tournament/i }).click();

  await expect(
    page.getByText("Your match was played. The rest of the world caught up.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText("Match 1 autosaved")).toBeVisible();
  await expect(page.getByText("Next: Mexico vs Korea Republic")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /updated tables and results/i }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Group A" })).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "GF" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "GA" }).first(),
  ).toBeVisible();
  await expect(page.getByText("🇲🇽").first()).toBeVisible();
  await expect(page.getByText(/Match 1.*Mexico/).last()).toBeVisible();
  await expect(page.getByText(/You (won|lost|drew)/).first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: /play next match/i }),
  ).toBeEnabled();

  await page.getByRole("button", { name: /play next match/i }).click();
  await expect(page.getByText("Match 28 autosaved")).toBeVisible();
  await expect(page.getByText(/Match 28.*Mexico/).last()).toBeVisible();

  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (
      await page
        .getByRole("heading", { name: /tournament bracket/i })
        .isVisible()
    ) {
      break;
    }
    await page.getByRole("button", { name: /play next match/i }).click();
  }
  await expect(
    page.getByRole("heading", { name: /tournament bracket/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Round of 32" }),
  ).toBeVisible();

  await page.getByRole("button", { name: /manual save/i }).click();
  await expect(page.getByText(/manual save complete/i)).toBeVisible();

  await page.getByText("Save transfer").click();
  await page.getByRole("button", { name: /^export/i }).click();
  const exported = await page.locator("textarea").first().inputValue();
  expect(exported).toContain('"schemaVersion": 2');
  expect(exported).toContain('"prematchOdds"');

  await page
    .getByPlaceholder("Paste exported save JSON here")
    .fill("{bad json");
  await page.getByRole("button", { name: /^import/i }).click();
  await expect(page.getByText(/import rejected/i)).toBeVisible();

  await page.getByPlaceholder("Paste exported save JSON here").fill(exported);
  await page.getByRole("button", { name: /^import/i }).click();
  await expect(page.getByText(/save imported/i)).toBeVisible();

  await page.getByRole("button", { name: /^reset/i }).click();
  await expect(page.getByText(/save reset/i)).toBeVisible();
});
