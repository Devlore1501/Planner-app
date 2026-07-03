import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Shell } from "@/components/layout/Shell";
import { Login } from "@/pages/Login";
import { Dashboard } from "@/pages/Dashboard";
import { Plans } from "@/pages/Plans";
import { PlanDetail } from "@/pages/PlanDetail";
import { BrandProfile } from "@/pages/BrandProfile";
import { Catalog } from "@/pages/Catalog";
import { Integrations } from "@/pages/Integrations";
import { Templates } from "@/pages/Templates";
import { Settings } from "@/pages/Settings";

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      Caricamento…
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

/** Un account cliente ha un solo brand: salta la scelta e va dritto ai piani. */
function HomeRedirect() {
  const { user } = useAuth();
  if (user?.role === "client" && user.brand_id) {
    return <Navigate to={`/brands/${user.brand_id}/plans`} replace />;
  }
  return <Dashboard />;
}

function RequireAgency({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== "agency") return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <RequireAuth>
              <Shell />
            </RequireAuth>
          }
        >
          <Route index element={<HomeRedirect />} />
          <Route path="brands/:brandId/plans" element={<Plans />} />
          <Route path="brands/:brandId/plans/:planId" element={<PlanDetail />} />
          <Route path="brands/:brandId/profile" element={<BrandProfile />} />
          <Route path="brands/:brandId/catalog" element={<Catalog />} />
          <Route
            path="brands/:brandId/integrations"
            element={
              <RequireAgency>
                <Integrations />
              </RequireAgency>
            }
          />
          <Route
            path="templates"
            element={
              <RequireAgency>
                <Templates />
              </RequireAgency>
            }
          />
          <Route
            path="settings"
            element={
              <RequireAgency>
                <Settings />
              </RequireAgency>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
