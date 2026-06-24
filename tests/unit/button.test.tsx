import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("supports keyboard activation", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={onClick}>Start</Button>);
    await user.tab();
    await user.keyboard("{Enter}");

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not activate when disabled", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(
      <Button disabled onClick={onClick}>
        Continue
      </Button>,
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(onClick).not.toHaveBeenCalled();
  });
});
