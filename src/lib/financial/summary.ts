export type FinancialSummaryRecord = {
  type: "receita" | "despesa";
  amount: number;
  date?: string;
  status?: "Pendente" | "Pago" | "Vencido";
  paidAt?: string;
};

export type FinancialSummary = {
  totalRevenue: number;
  totalExpenses: number;
  pendingCount: number;
  overdueCount: number;
  pendingAmount: number;
  cashBalance: number;
  payableAmount: number;
  payableCount: number;
  projectedBalance: number;
  margin: number;
};

const isInMonth = (value: string | undefined, referenceDate: Date) => {
  if (!value) return false;
  const [year, month] = value.split("-").map(Number);
  return year === referenceDate.getFullYear() && month === referenceDate.getMonth() + 1;
};

const isBeforeToday = (value: string | undefined, referenceDate: Date) => {
  if (!value) return false;
  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day) < today;
};

export const calculateFinancialSummary = (
  records: FinancialSummaryRecord[],
  referenceDate = new Date(),
): FinancialSummary => {
  const revenues = records.filter((record) => record.type === "receita");
  const expenses = records.filter((record) => record.type === "despesa");
  const openReceivables = revenues.filter((record) => record.status !== "Pago");
  const openPayables = expenses.filter((record) => record.status !== "Pago");
  const monthlyRevenues = revenues.filter((record) => isInMonth(record.date, referenceDate));
  const monthlyExpenses = expenses.filter((record) => isInMonth(record.date, referenceDate));

  const totalRevenue = monthlyRevenues.reduce((sum, record) => sum + record.amount, 0);
  const totalExpenses = monthlyExpenses.reduce((sum, record) => sum + record.amount, 0);
  const receivedRevenue = revenues
    .filter((record) => record.status === "Pago")
    .reduce((sum, record) => sum + record.amount, 0);
  const paidExpenses = expenses
    .filter((record) => record.status === "Pago")
    .reduce((sum, record) => sum + record.amount, 0);
  const payableAmount = openPayables.reduce((sum, record) => sum + record.amount, 0);
  const pendingAmount = openReceivables.reduce((sum, record) => sum + record.amount, 0);

  return {
    totalRevenue,
    totalExpenses,
    pendingCount: openReceivables.length,
    overdueCount: openReceivables.filter(
      (record) => record.status === "Vencido" || isBeforeToday(record.date, referenceDate),
    ).length,
    pendingAmount,
    cashBalance: receivedRevenue - paidExpenses,
    payableAmount,
    payableCount: openPayables.length,
    projectedBalance: receivedRevenue - paidExpenses + pendingAmount - payableAmount,
    margin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0,
  };
};
