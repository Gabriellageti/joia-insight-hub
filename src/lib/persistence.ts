export async function commitAfterPersistence<T>(
  persist: () => Promise<T>,
  commit: (result: T) => void,
): Promise<T> {
  const result = await persist();
  commit(result);
  return result;
}

export function getFriendlyPersistenceError(error: unknown) {
  const value = typeof error === "object" && error !== null
    ? error as { code?: string; message?: string }
    : {};
  const message = value.message?.toLowerCase() ?? "";
  if (value.code === "42501" || message.includes("permission") || message.includes("row-level security")) return "Você não tem permissão para concluir esta operação.";
  if (value.code === "23503" || value.code === "409") return "O item está vinculado a outros registros e não pode ser removido.";
  if (value.code === "PGRST116") return "O item não existe mais ou já foi removido.";
  if (message.includes("fetch") || message.includes("network")) return "Falha de conexão. Verifique sua internet e tente novamente.";
  return "A operação não foi concluída. Tente novamente.";
}
