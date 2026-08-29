import { addMonths, addWeeks, format, parseISO } from "date-fns";

export type ContractBillingType = "mensal" | "semanal" | "parcela" | "projeto";

export const addBillingPeriod = (
  isoDate: string,
  periods: number,
  billingType: ContractBillingType,
) => {
  const date = parseISO(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;

  const result = billingType === "semanal"
    ? addWeeks(date, periods)
    : addMonths(date, periods);

  return format(result, "yyyy-MM-dd");
};

export const getLocalTodayIso = () => format(new Date(), "yyyy-MM-dd");
