import { describe, expect, it } from "vitest";
import { automationActionLabels, automationEventLabels } from "./automation-labels";

describe("automation labels", () => {
  it("covers all eight initial rule contracts", () => {
    expect(Object.keys(automationEventLabels)).toHaveLength(5);
    expect(Object.keys(automationActionLabels)).toHaveLength(7);
    expect(automationEventLabels["schedule.tick"]).toBe("Verificação periódica");
    expect(automationActionLabels.create_pending_task).toBe("Criar pendência");
  });
});
