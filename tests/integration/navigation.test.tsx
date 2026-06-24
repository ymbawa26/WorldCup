import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { SiteHeader } from "@/components/site-header";

describe("site navigation", () => {
  it("exposes mobile navigation from an accessible disclosure button", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);

    const menuButton = screen.getByRole("button", {
      name: /open navigation menu/i,
    });
    expect(menuButton).toHaveAttribute("aria-expanded", "false");

    await user.click(menuButton);

    expect(menuButton).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("navigation", { name: /mobile navigation/i }),
    ).toBeVisible();
  });
});
