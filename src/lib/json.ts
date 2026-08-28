import type { Json } from "@/integrations/supabase/types";

export function toJsonValue(value: unknown): Json | null {
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "boolean" || typeof value === "number") return value;
  if (Array.isArray(value)) return value.map((item) => toJsonValue(item));
  if (typeof value === "object") {
    const result: { [key: string]: Json } = {};
    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined) result[key] = toJsonValue(item);
    }
    return result;
  }
  return null;
}
