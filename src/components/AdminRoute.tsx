import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function AdminRoute({ children }: { children: ReactNode }) {
  const { loading, isAdmin } = useAuth();

  if (loading) return null;
  return isAdmin ? <>{children}</> : <Navigate to="/" replace />;
}
