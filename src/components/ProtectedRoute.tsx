// @ts-nocheck
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, projectAdminPath, projectAdminPrefix } from "../context/AuthContext";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, isAuthenticated, isLoading, isAdmin, isProjectAdmin } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/kms/login?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }

  if (adminOnly && !isAdmin) {
    // Not a super admin — a project admin may still enter, but only their own project(s)'
    // admin paths (and their sub-routes, e.g. Free Wi-Fi's Highlights/Charts/Datasets
    // tabs). A project admin can be assigned to more than one project, so any of them
    // is allowed, not just the first.
    const prefixes = isProjectAdmin
      ? (user?.projectSlugs || []).map(projectAdminPrefix).filter(Boolean)
      : [];
    if (prefixes.length === 0) {
      return <Navigate to="/kms" replace />;
    }
    const withinAssignedProject = prefixes.some(
      (prefix) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`)
    );
    if (!withinAssignedProject) {
      return <Navigate to={projectAdminPath(user?.projectSlugs?.[0]) || "/kms"} replace />;
    }
  }

  return children;
}

