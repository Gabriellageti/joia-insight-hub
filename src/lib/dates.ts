import { addMonths, addWeeks, format, isBefore, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

export type ProjectDuration = "2w" | "4w" | "8w" | "3m" | "6m" | "manual";

const DATE_MASK = "dd/MM/yyyy";

export const parseDatePtBR = (value?: string): Date | null => {
  if (!value) return null;
  const parsed = parse(value, DATE_MASK, new Date());
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

export const formatDatePtBR = (value?: Date | string | null): string => {
  if (!value) return "";
  const date = value instanceof Date ? value : parseDatePtBR(value);
  if (!date) return "";
  return format(date, DATE_MASK, { locale: ptBR });
};

export const calculateForecastEndDate = (startDate?: string, duration?: ProjectDuration | null): string => {
  if (!startDate || !duration || duration === "manual") return "";
  const start = parseDatePtBR(startDate);
  if (!start) return "";

  const nextDate = (() => {
    switch (duration) {
      case "2w":
        return addWeeks(start, 2);
      case "4w":
        return addWeeks(start, 4);
      case "8w":
        return addWeeks(start, 8);
      case "3m":
        return addMonths(start, 3);
      case "6m":
        return addMonths(start, 6);
      default:
        return null;
    }
  })();

  return nextDate ? formatDatePtBR(nextDate) : "";
};

export const isPastDate = (value?: string): boolean => {
  if (!value) return false;
  const date = parseDatePtBR(value);
  if (!date) return false;
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return isBefore(date, todayMidnight);
};

export const durationLabel = (duration?: ProjectDuration | null): string => {
  switch (duration) {
    case "2w":
      return "2 semanas";
    case "4w":
      return "4 semanas";
    case "8w":
      return "8 semanas";
    case "3m":
      return "3 meses";
    case "6m":
      return "6 meses";
    case "manual":
      return "Manual";
    default:
      return "";
  }
};

export const safeNumber = (value?: string | number | null): number | null => {
  if (value === null || typeof value === "undefined") return null;
  const numberValue = typeof value === "number" ? value : Number(String(value).replace(/[^0-9-,.]/g, "").replace(",", "."));
  return Number.isFinite(numberValue) ? numberValue : null;
};
