import { addMonths, addWeeks, format, parseISO } from "date-fns";

export type ContractBillingType = "mensal" | "semanal" | "parcela" | "projeto";

export interface ContractInstallment {
  id: string;
  value: number;
  dueDate: string;
  status: "pending" | "overdue" | "paid";
}

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

export const buildContractInstallments = ({
  billingType,
  totalValue,
  installmentCount,
  firstDueDate,
  existingInstallments = [],
  createId,
}: {
  billingType: ContractBillingType;
  totalValue: number;
  installmentCount: number;
  firstDueDate: string;
  existingInstallments?: ContractInstallment[];
  createId: () => string;
}): ContractInstallment[] => {
  const count = billingType === "projeto" ? 1 : installmentCount;
  const value = billingType === "projeto" ? totalValue : totalValue / count;

  return Array.from({ length: count }, (_, index) => ({
    // Receivables store this id as their contract link. Reusing it while a
    // contract is edited prevents the payment RPC from losing that link.
    id: existingInstallments[index]?.id ?? createId(),
    value,
    dueDate: billingType === "projeto"
      ? firstDueDate
      : addBillingPeriod(firstDueDate, index, billingType),
    status: existingInstallments[index]?.status ?? "pending",
  }));
};
