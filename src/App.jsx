import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";

// Auth
import RegisterPage from "@/pages/auth/RegisterPage";
import LoginPage from "@/pages/auth/LoginPage";

// Dashboards
import SalesDashboard from "@/pages/dashboard/SalesDashboard";
import AdminDashboard from "@/pages/dashboard/AdminDashboard";
import ManagerDashboard from "@/pages/dashboard/ManagerDashboard";

// Users
import ManageUsers from "@/pages/users/ManageUsers";

// Teams
import ManageTeams from "@/pages/teams/ManageTeams";
import ViewTeamPage from "@/pages/teams/ViewTeamPage";
import ManagerTeam from "@/pages/teams/ManagerTeam";

// Leads
import AdminLeads from "@/pages/leads/AdminLeads";
import LeadsImport from "@/pages/leads/LeadsImport";
import ManagerLeads from "@/pages/leads/ManagerLeads";
import SalesLeads from "@/pages/leads/SalesLeads";
import LeadExport from "@/pages/leadexport";

// Reports
import AdminReports from "@/pages/reports/AdminReports";
import ManagerReports from "@/pages/reports/ManagerReports";

// Profile
import ManagerProfile from "@/pages/profile/ManagerProfile";
import SalesProfile from "@/pages/profile/SalesProfile";

// Settings
import AdminSettings from "@/pages/settings/AdminSettings";

// Shared
import NotFound from "@/pages/NotFound";

// Guards & Utilities
import PrivateRoute from "@/components/PrivateRoute";
import PublicRoute from "@/components/PublicRoute";
import token from "@/lib/utilities";
import Notification from "@/components/ui/Notification";

const protectedRoutes = [
  // Dashboards
  { path: "/dashboard", element: SalesDashboard, roles: ["sales_rep"] },
  { path: "/admin/dashboard", element: AdminDashboard, roles: ["admin"] },
  { path: "/manager/dashboard", element: ManagerDashboard, roles: ["manager"] },

  // Users
  { path: "/admin/users", element: ManageUsers, roles: ["admin"] },

  // Teams
  { path: "/admin/teams", element: ManageTeams, roles: ["admin"] },
  { path: "/admin/teams/:id", element: ViewTeamPage, roles: ["admin"] },
  { path: "/manager/team", element: ManagerTeam, roles: ["manager"] },

  // Leads
  { path: "/admin/leads", element: AdminLeads, roles: ["admin"] },
  { path: "/admin/leads/import", element: LeadsImport, roles: ["admin"] },
  { path: "/admin/leads/export", element: LeadExport, roles: ["admin"] },
  { path: "/manager/leads", element: ManagerLeads, roles: ["manager"] },
  { path: "/leads", element: SalesLeads, roles: ["sales_rep"] },

  // Reports
  { path: "/admin/reports", element: AdminReports, roles: ["admin"] },
  { path: "/manager/reports", element: ManagerReports, roles: ["manager"] },

  // Profile
  { path: "/manager/profile", element: ManagerProfile, roles: ["manager"] },
  { path: "/profile", element: SalesProfile, roles: ["sales_rep"] },

  // Settings
  { path: "/admin/settings", element: AdminSettings, roles: ["admin"] },
];

const publicRoutes = [
  { path: "/register", element: RegisterPage },
  { path: "/login", element: LoginPage },
];

function AppShell() {
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize session (schedule auto-logout, handle immediate expiry)
    token.initAuthSession(() => {
      Notification.error("Your session expired. Please log in again.");
      navigate("/login", { replace: true });
    });
  }, [navigate]);

  const getDashboardRedirect = () => {
    if (!token.isAuthenticated() || token.isExpired()) return "/login";

    const user = token.getUserData();
    const role = user?.role?.value;

    if (role === "admin") return "/admin/dashboard";
    if (role === "manager") return "/manager/dashboard";
    return "/dashboard"; // default for sales_rep or fallback
  };

  return (
    <>
      <Routes>
        {/* Root redirect by role */}
        <Route path="/" element={<Navigate to={getDashboardRedirect()} replace />} />

        {/* Protected routes */}
        {protectedRoutes.map((route, idx) => (
          <Route
            key={idx}
            path={route.path}
            element={
              <PrivateRoute allowedRoles={route.roles}>
                <route.element />
              </PrivateRoute>
            }
          />
        ))}

        {/* Public routes */}
        {publicRoutes.map((route, idx) => (
          <Route
            key={idx}
            path={route.path}
            element={
              <PublicRoute>
                <route.element />
              </PublicRoute>
            }
          />
        ))}

        {/* Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Toasts */}
      <ToastContainer
        position="top-right"
        autoClose={2500}
        hideProgressBar={true}
        closeOnClick={true}
        draggable={false}
        pauseOnHover={true}
        theme="light"
      />
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}
