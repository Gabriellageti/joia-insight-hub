import { describe, expect, test } from "bun:test";
import type { Task } from "@/types";
import { assertExpectedTaskStatus, getCompletionPatch } from "./completion";

const task = { id: "1", status: "in_progress" } as Task;

describe("getCompletionPatch", () => {
  test("preserva o status anterior ao concluir", () => {
    const patch = getCompletionPatch(task, "user-1", new Date("2026-07-14T12:00:00Z"));
    expect(patch).toEqual({ status: "done", previousStatus: "in_progress", completedAt: "2026-07-14T12:00:00.000Z", completedBy: "user-1" });
  });

  test("reabre no status anterior e limpa a conclusão", () => {
    const patch = getCompletionPatch({ ...task, status: "done", previousStatus: "review" });
    expect(patch).toEqual({ status: "review", completedAt: "", completedBy: "" });
  });

  test("reabre em andamento quando o status anterior é inválido", () => {
    expect(getCompletionPatch({ ...task, status: "done", previousStatus: "done" }).status).toBe("in_progress");
  });

  test("impede desfazer sobre uma alteração posterior", () => {
    expect(() => assertExpectedTaskStatus({ ...task, status: "review" }, "done")).toThrow();
    expect(() => assertExpectedTaskStatus({ ...task, status: "done" }, "done")).not.toThrow();
  });
});
