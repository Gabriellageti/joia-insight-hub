import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HealthBadge } from "./HealthBadge";

describe("HealthBadge", () => {
  it("renders an accessible text label in addition to color", () => {
    render(<HealthBadge health="critical" score={9} />);
    expect(screen.getByText("Crítico · 9 pts")).toBeInTheDocument();
  });
});
