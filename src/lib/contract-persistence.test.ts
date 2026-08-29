import { describe, expect, it } from "vitest";
import { buildContractUpdatePayload } from "./contract-persistence";

describe("persistência de contratos", () => {
  it("inclui título e projeto ao atualizar um contrato", () => {
    expect(buildContractUpdatePayload({ title: "Consultoria anual", projectId: "project-1" })).toEqual({
      title: "Consultoria anual",
      project_id: "project-1",
    });
  });

  it("permite remover a associação com um projeto", () => {
    expect(buildContractUpdatePayload({ projectId: undefined })).toEqual({});
    expect(buildContractUpdatePayload({ projectId: "" })).toEqual({ project_id: null });
  });
});
