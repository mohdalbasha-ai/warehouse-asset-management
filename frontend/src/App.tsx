import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { I18nProvider } from "./i18n/I18nContext";
import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import OrganizationPage from "./pages/OrganizationPage";
import EmployeesPage from "./pages/EmployeesPage";
import SuppliersPage from "./pages/SuppliersPage";
import WarehousesPage from "./pages/WarehousesPage";
import ItemsPage from "./pages/ItemsPage";
import DevicesPage from "./pages/DevicesPage";
import DeviceDetailPage from "./pages/DeviceDetailPage";
import ContractsPage from "./pages/ContractsPage";
import ContractDetailPage from "./pages/ContractDetailPage";
import DeliveriesPage from "./pages/DeliveriesPage";
import StockReceivePage from "./pages/StockReceivePage";
import StockIssuePage from "./pages/StockIssuePage";
import StockTransfersPage from "./pages/StockTransfersPage";
import MaintenancePage from "./pages/MaintenancePage";
import WarrantyPage from "./pages/WarrantyPage";
import UsersPage from "./pages/UsersPage";
import RolesPage from "./pages/RolesPage";
import NotificationsPage from "./pages/NotificationsPage";
import ReportsPage from "./pages/ReportsPage";
import AuditLogPage from "./pages/AuditLogPage";

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/organization" element={<OrganizationPage />} />
                <Route path="/employees" element={<EmployeesPage />} />
                <Route path="/suppliers" element={<SuppliersPage />} />
                <Route path="/warehouses" element={<WarehousesPage />} />
                <Route path="/items" element={<ItemsPage />} />
                <Route path="/devices" element={<DevicesPage />} />
                <Route path="/devices/:id" element={<DeviceDetailPage />} />
                <Route path="/contracts" element={<ContractsPage />} />
                <Route path="/contracts/:id" element={<ContractDetailPage />} />
                <Route path="/deliveries" element={<DeliveriesPage />} />
                <Route path="/stock/receive" element={<StockReceivePage />} />
                <Route path="/stock/issue" element={<StockIssuePage />} />
                <Route path="/stock/transfers" element={<StockTransfersPage />} />
                <Route path="/maintenance" element={<MaintenancePage />} />
                <Route path="/warranty" element={<WarrantyPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/roles" element={<RolesPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/audit-log" element={<AuditLogPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  );
}
