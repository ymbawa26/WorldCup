import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "@/app/page";

describe("landing page", () => {
  it("presents the product and keeps unavailable tournament actions disabled", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", {
        name: /the world stage\.? ?your decisions\./i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /new tournament/i }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
    expect(screen.getByText("104")).toBeInTheDocument();
  });
});
