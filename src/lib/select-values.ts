export const ALL_FILTER_VALUE = "__all__";
export const NO_PROJECT_VALUE = "__none__";

export const normalizeDiagnosticFilter = (value: string) =>
  value === ALL_FILTER_VALUE ? "" : value;
