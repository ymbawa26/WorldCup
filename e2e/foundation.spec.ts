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
