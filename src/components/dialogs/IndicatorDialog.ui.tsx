import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { IndicatorDialog } from "./IndicatorDialog";

const addIndicator = vi.fn().mockResolvedValue({ id: "indicator-1" });
vi.mock("@/contexts/DataContext", () => ({
  useData: () => ({
    addIndicator,
    updateIndicator: vi.fn(),
    projects: [{ id: "project-1", name: "Projeto A" }],
  }),
}));

describe("IndicatorDialog", () => {
  it("abre o seletor sem value vazio e persiste um novo indicador", async () => {
    const user = userEvent.setup();
    render(<IndicatorDialog open onOpenChange={vi.fn()} />);
    const selects = screen.getAllByRole("combobox");
    await user.click(selects.at(-1)!);
    const noProject = await screen.findByRole("option", { name: "Nenhum" });
    expect(noProject).toBeInTheDocument();
    await user.click(noProject);

    await user.type(screen.getByLabelText("Nome *"), "Margem operacional");
    await user.click(screen.getByRole("button", { name: "Criar" }));
    expect(addIndicator).toHaveBeenCalledWith(expect.objectContaining({ name: "Margem operacional", projectId: "" }));
  });
});
