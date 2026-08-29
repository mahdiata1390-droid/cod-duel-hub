import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/Spinner";
import { useTranslation } from "@/i18n";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) return <Spinner label={t("common.loading")} />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
