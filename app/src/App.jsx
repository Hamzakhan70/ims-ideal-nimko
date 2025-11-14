import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import { AdminProvider, useAdmin } from "./context/AdminContext";
import { NotificationProvider } from "./context/NotificationContext";
import { ToastProvider } from "./context/ToastContext";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import ProductsPage from "./pages/ProductsPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import ContactPage from "./pages/ContactPage";
import AdminLayout from "./components/admin/AdminLayout";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ProductManagement from "./pages/admin/ProductManagement";
import OrderManagement from "./pages/admin/OrderManagement";
import AnalyticsDashboard from "./pages/admin/AnalyticsDashboard";
import SettingsPage from "./pages/admin/SettingsPage";
import ShopkeeperDashboard from "./pages/shopkeeper/ShopkeeperDashboard";
import SalesmanOrderManagement from "./pages/salesman/SalesmanOrderManagement";
import ShopkeeperOrderPage from "./pages/ShopkeeperOrderPage";
import ShopkeeperOrderManagement from "./pages/admin/ShopkeeperOrderManagement";
import WebsiteOrderManagement from "./pages/admin/WebsiteOrderManagement";
import AssignmentManagement from "./pages/admin/AssignmentManagement";
import CategoryManagement from "./pages/admin/CategoryManagement";
import UserManagement from "./pages/admin/UserManagement";
import SalesmanOrderPlacement from "./pages/salesman/SalesmanOrderPlacement";
import RecoveryManagement from "./pages/salesman/RecoveryManagement";
import AdminRecoveryManagement from "./pages/admin/RecoveryManagement";
import ErrorBoundary from "./components/ErrorBoundary";

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAdmin();
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/admin/login" />;
}

function RoleBasedRedirect() {
  const { admin } = useAdmin();
  
  if (!admin) {
    return <Navigate to="/admin/login" />;
  }
  
  // Redirect based on user role
  switch (admin.role) {
    case 'superadmin':
    case 'admin':
      return <Navigate to="/admin/dashboard" />;
    case 'salesman':
      return <Navigate to="/salesman/dashboard" />;
    case 'shopkeeper':
      return <Navigate to="/shopkeeper/dashboard" />;
    default:
      return <Navigate to="/admin/login" />;
  }
}

export default function App() {
  return (
    <ToastProvider>
      <CartProvider>
        <AdminProvider>
          <NotificationProvider>
            <BrowserRouter>
            <ErrorBoundary>
            <Routes>
              {/* Admin Routes - Must come first to avoid wildcard conflicts */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<Navigate to="/admin/dashboard" />} />
              
              {/* Role-based redirect for authenticated users */}
              <Route path="/dashboard" element={<RoleBasedRedirect />} />
              <Route path="/admin/dashboard" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <AdminDashboard />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/admin/products" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <ProductManagement />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/admin/website-orders" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <WebsiteOrderManagement />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/admin/analytics" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <AnalyticsDashboard />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/admin/settings" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <SettingsPage />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/admin/shopkeeper-orders" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <ShopkeeperOrderManagement />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/admin/assignments" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <AssignmentManagement />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/admin/categories" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <CategoryManagement />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <UserManagement />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/admin/recoveries" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <AdminRecoveryManagement />
                  </AdminLayout>
                </ProtectedRoute>
              } />

              {/* Shopkeeper Routes */}
              <Route path="/shopkeeper/dashboard" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <ShopkeeperDashboard />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/shopkeeper/orders" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <ShopkeeperOrderPage />
                  </AdminLayout>
                </ProtectedRoute>
              } />

              {/* Salesman Routes */}
              <Route path="/salesman/dashboard" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <SalesmanOrderManagement />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/salesman/orders" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <SalesmanOrderManagement />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/salesman/place-order" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <SalesmanOrderPlacement />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/salesman/recovery" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <RecoveryManagement />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              
              {/* Public Routes */}
              <Route path="/" element={
                <div className="min-h-screen bg-gray-50">
                  <Navbar />
                  <HomePage />
                </div>
              } />
              <Route path="/about" element={
                <div className="min-h-screen bg-gray-50">
                  <Navbar />
                  <AboutPage />
                </div>
              } />
              <Route path="/products" element={
                <div className="min-h-screen bg-gray-50">
                  <Navbar />
                  <ProductsPage />
                </div>
              } />
              <Route path="/cart" element={
                <div className="min-h-screen bg-gray-50">
                  <Navbar />
                  <CartPage />
                </div>
              } />
              <Route path="/checkout" element={
                <div className="min-h-screen bg-gray-50">
                  <Navbar />
                  <CheckoutPage />
                </div>
              } />
              <Route path="/contact" element={
                <div className="min-h-screen bg-gray-50">
                  <Navbar />
                  <ContactPage />
                </div>
              } />
            </Routes>
          </ErrorBoundary>
        </BrowserRouter>
        </NotificationProvider>
      </AdminProvider>
    </CartProvider>
    </ToastProvider>
  );
}