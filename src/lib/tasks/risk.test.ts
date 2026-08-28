import { describe, expect, test } from "bun:test";
import { getTaskRiskSignal } from "./risk";
import type { Task } from "@/types";

const task = { id:"1", title:"Teste", projectId:"", projectName:"", clientId:"", clientName:"", type:"processo", responsible:"Ana", priority:"medium", dueDate:"2026-08-31", status:"not_started", evidenceRequired:false, createdAt:"2026-08-01" } satisfies Task;

describe("task operational risk", () => {
  test("flags a blocked task and reports duration", () => {
    expect(getTaskRiskSignal({ ...task, status:"blocked", blockReason:"Dependência", blockedAt:"2026-08-20T12:00:00Z" }, new Date("2026-08-28T12:00:00Z"))).toEqual({ atRisk:true, reason:"Dependência", blockedDays:8, staleBlock:true });
  });
  test("flags a task close to deadline that has not started", () => {
    expect(getTaskRiskSignal(task, new Date("2026-08-28T12:00:00Z")).reason).toBe("Prazo próximo sem início");
  });
  test("never flags completed work", () => {
    expect(getTaskRiskSignal({ ...task, status:"done", priority:"urgent" }, new Date("2026-08-28T12:00:00Z")).atRisk).toBe(false);
  });
});
