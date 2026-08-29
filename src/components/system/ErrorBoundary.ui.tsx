import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

let shouldBreak = true;

function Broken() {
  if (shouldBreak) throw new Error("dado sensível que não deve aparecer");
  return <p>Conteúdo recuperado</p>;
}

describe("ErrorBoundary", () => {
  it("isola a falha e permite tentar novamente", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const suppressExpectedError = (event: ErrorEvent) => event.preventDefault();
    window.addEventListener("error", suppressExpectedError);
    shouldBreak = true;
    const view = render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Não foi possível exibir esta área")).toBeInTheDocument();
    expect(screen.queryByText(/dado sensível/)).not.toBeInTheDocument();
    shouldBreak = false;
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    view.rerender(<ErrorBoundary><Broken /></ErrorBoundary>);
    expect(screen.getByText("Conteúdo recuperado")).toBeInTheDocument();
    window.removeEventListener("error", suppressExpectedError);
  });
});
