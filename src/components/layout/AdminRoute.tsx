import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/Spinner";
import { useTranslation } from "@/i18n";

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, profile, isAdmin, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) return <Spinner label={t("common.loading")} />;
  if (!user) return <Navigate to="/login" replace />;
  if (!profile || profile.account_status !== "active") return <Navigate to="/" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}