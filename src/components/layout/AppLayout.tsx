import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/stores/uiStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useProductStore } from '@/stores/productStore';
import { useSaleStore } from '@/stores/saleStore';
import Sidebar from './Sidebar';
import Header from './Header';
import { Toaster } from '@/components/ui/sonner';
import ToastContainer from '@/components/shared/ToastContainer';

export default function AppLayout() {
  const sidebarCollapsed = useUiStore(s => s.sidebarCollapsed);
  const loadSettings = useSettingsStore(s => s.loadSettings);
  const loadProducts = useProductStore(s => s.loadData);
  const loadSales = useSaleStore(s => s.loadData);

  useEffect(() => {
    loadSettings();
    loadProducts();
    loadSales();
  }, [loadSettings, loadProducts, loadSales]);

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar />
      <Header />
      
      <main
        className={cn(
          'pt-14 min-h-screen transition-all duration-200',
          sidebarCollapsed ? 'sm:ml-16' : 'sm:ml-[260px]'
        )}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>

      <Toaster />
      <ToastContainer />
    </div>
  );
}
