import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { FinanceProvider } from "@/hooks/useFinance";
import { MonthProvider } from "@/hooks/useMonth";
import { ToastProvider } from "@/components/toast";
import { AppShell } from "@/components/AppShell";
import { Spinner } from "@/components/ui";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { supabaseConfigured } from "@/lib/supabase";
import Landing from "@/pages/Landing";
import AuthPage from "@/pages/AuthPage";

const Dashboard = lazy(() => import("@/pages/app/Dashboard"));
const Budget = lazy(() => import("@/pages/app/Budget"));
const Bills = lazy(() => import("@/pages/app/Bills"));
const Debts = lazy(() => import("@/pages/app/Debts"));
const Savings = lazy(() => import("@/pages/app/Savings"));
const NetWorth = lazy(() => import("@/pages/app/NetWorth"));
const Subscriptions = lazy(() => import("@/pages/app/Subscriptions"));
const Transactions = lazy(() => import("@/pages/app/Transactions"));
const Advisor = lazy(() => import("@/pages/app/Advisor"));
const Billing = lazy(() => import("@/pages/app/Billing"));
const SettingsPage = lazy(() => import("@/pages/app/Settings"));
const Legal = lazy(() => import("@/pages/Legal"));

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to={`/signin?next=${encodeURIComponent(loc.pathname)}`} replace />;
  return <>{children}</>;
}

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">That page doesn't exist</h1>
      <a href="/" className="mt-6 text-sm font-semibold text-vital-600 hover:underline">Go to the home page</a>
    </div>
  );
}

function ConfigMissing() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md rounded-xl2 border border-paper-line bg-white p-6 text-sm shadow-card">
        <h1 className="text-lg font-semibold">Setup needed</h1>
        <p className="mt-2 text-ink-mute">This site is missing its database settings. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in Netlify → Site configuration → Environment variables, then redeploy.</p>
      </div>
    </div>
  );
}

export default function App() {
  if (!supabaseConfigured) return <ConfigMissing />;
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <ScrollTop />
          <Suspense fallback={<Spinner />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/signin" element={<AuthPage initial="signin" />} />
              <Route path="/auth" element={<Navigate to="/signin" replace />} />
              <Route path="/signup" element={<AuthPage initial="signup" />} />
              <Route path="/forgot-password" element={<AuthPage initial="forgot" />} />
              <Route path="/reset-password" element={<AuthPage initial="reset" />} />
              <Route path="/terms" element={<Legal doc="terms" />} />
              <Route path="/privacy" element={<Legal doc="privacy" />} />
              <Route path="/refunds" element={<Legal doc="refunds" />} />
              <Route
                element={
                  <RequireAuth>
                    <FinanceProvider>
                      <MonthProvider>
                        <AppShell />
                      </MonthProvider>
                    </FinanceProvider>
                  </RequireAuth>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/budget" element={<Budget />} />
                <Route path="/bills" element={<Bills />} />
                <Route path="/debts" element={<Debts />} />
                <Route path="/savings" element={<Savings />} />
                <Route path="/net-worth" element={<NetWorth />} />
                <Route path="/subscriptions" element={<Subscriptions />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/advisor" element={<Advisor />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
