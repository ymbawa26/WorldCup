import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "@/app/page";

describe("landing page", () => {
  it("presents the product and links into the playable tournament flow", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", {
        name: /the world stage\.? ?your decisions\./i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /new tournament/i }),
    ).toHaveAttribute("href", "/play");
    expect(screen.getByRole("link", { name: /continue/i })).toHaveAttribute(
      "href",
      "/play",
    );
    expect(screen.getByText("104")).toBeInTheDocument();
  });
});
