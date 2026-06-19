import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { initializeDemoData } from '@/lib/dataGenerator';
import AppLayout from '@/components/layout/AppLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Pos from '@/pages/Pos';
import Sales from '@/pages/Sales';
import Products from '@/pages/Products';
import AddProduct from '@/pages/AddProduct';
import Categories from '@/pages/Categories';
import Suppliers from '@/pages/Suppliers';
import Purchases from '@/pages/Purchases';
import Customers from '@/pages/Customers';
import Returns from '@/pages/Returns';
import DuePayments from '@/pages/DuePayments';
import Expenses from '@/pages/Expenses';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';
import AccountSettings from '@/pages/AccountSettings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  useEffect(() => {
    initializeDemoData();
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/pos" element={<Pos />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/add" element={<AddProduct />} />
        <Route path="/products/edit/:id" element={<AddProduct />} />
        <Route path="/categories" element={<Categories />} />
        {/* Brands, Units and Inventory routes removed */}
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/purchases" element={<Purchases />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/returns" element={<Returns />} />
        <Route path="/due-payments" element={<DuePayments />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/account" element={<AccountSettings />} />
      </Route>
    </Routes>
  );
}
