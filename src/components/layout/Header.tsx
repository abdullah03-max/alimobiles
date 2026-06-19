import { useLocation, useNavigate } from 'react-router-dom';
import { cn, formatHeaderDateTime } from '@/lib/utils';
import { useUiStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useProductStore } from '@/stores/productStore';
import { useSaleStore } from '@/stores/saleStore';
import { Menu, Bell, User, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect, useMemo } from 'react';
import logoImage from '@/assets/—Pngtree—ali urdu calligraphy free eps_5739559.png';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/pos': 'Point of Sale',
  '/sales': 'Sales',
  '/products': 'Products',
  '/categories': 'Categories',
  '/suppliers': 'Suppliers',
  '/purchases': 'Purchases',
  '/customers': 'Customers',
  '/returns': 'Returns',
  '/due-payments': 'Due Payments',
  '/expenses': 'Expenses',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const toggleSidebar = useUiStore(s => s.toggleSidebar);
  const toggleMobileSidebar = useUiStore(s => s.toggleMobileSidebar);
  const sidebarCollapsed = useUiStore(s => s.sidebarCollapsed);
  const user = useAuthStore(s => s.user);
  const dateFormat = useSettingsStore(s => s.shopSettings.dateFormat);
  const [currentTime, setCurrentTime] = useState(() => formatHeaderDateTime(dateFormat));
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const products = useProductStore(s => s.products);
  const sales = useSaleStore(s => s.sales);

  const pageTitle = pageTitles[location.pathname] || 'Ali Mobiles POS';
  const closeSidebar = useUiStore(s => s.closeSidebar);

  useEffect(() => {
    closeSidebar();
  }, [location.pathname, closeSidebar]);

  const notifications = useMemo(() => {
    const today = new Date();

    const overdueNotifications = sales
      .filter((sale) => {
        if (sale.status === 'cancelled') return false;
        const invoiceDate = new Date(sale.createdAt);
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + 30);
        return today > dueDate;
      })
      .map((sale) => ({
        id: `overdue-${sale.id}`,
        title: 'Overdue invoice',
        description: `${sale.invoiceNumber} for ${sale.customerName || 'unknown customer'} is overdue`,
        type: 'overdue' as const,
      }));

    const stockNotifications = products
      .filter((product) => product.stockQuantity <= 0)
      .map((product) => ({
        id: `stock-${product.id}`,
        title: 'Out of stock',
        description: `${product.name} has no stock remaining`,
        type: 'stock' as const,
      }));

    return [...overdueNotifications, ...stockNotifications];
  }, [products, sales]);

  const alertCount = notifications.length;

  const hasAlert = alertCount > 0;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(formatHeaderDateTime(dateFormat));
    }, 1000);
    return () => clearInterval(interval);
  }, [dateFormat]);

  return (
    <header
      className={cn(
        'fixed top-0 right-0 h-14 bg-white border-b border-gray-200 z-[30] flex items-center justify-between px-4 transition-all duration-200',
        sidebarCollapsed ? 'sm:left-16' : 'sm:left-[260px]'
      )}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (window.innerWidth < 768) {
              toggleMobileSidebar();
            } else {
              toggleSidebar();
            }
          }}
          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600"
        >
          <Menu className="w-5 h-5" />
        </button>
        <img src={logoImage} alt="POS Logo" className="w-6 h-6 object-contain rounded-md bg-white p-1 shadow-sm" />
        <div>
          <h1 className="text-base font-semibold text-gray-800">{pageTitle}</h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 hidden md:block">
          {currentTime}
        </span>

        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setUserMenuOpen(false);
            }}
            className="relative p-2 rounded-md hover:bg-gray-100 text-gray-600"
          >
            {hasAlert && (
              <span className="absolute inset-0 rounded-full bg-orange-500/20 animate-ping" />
            )}
            <Bell className={cn('w-5 h-5', hasAlert ? 'text-orange-600' : 'text-gray-600')} />
            {hasAlert ? (
              <span className="absolute top-1 right-1 min-w-[18px] h-4 px-1.5 text-[10px] font-semibold leading-none text-white bg-red-600 rounded-full flex items-center justify-center">
                {alertCount}
              </span>
            ) : (
              <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full" />
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 max-h-[320px] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">Notifications</p>
                <p className="text-xs text-gray-500">{alertCount} active alert{alertCount === 1 ? '' : 's'}</p>
              </div>
              <div className="divide-y divide-gray-100">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <div key={notification.id} className="px-4 py-3 hover:bg-gray-50">
                      <p className="text-sm font-semibold text-gray-800">{notification.title}</p>
                      <p className="text-xs text-gray-500">{notification.description}</p>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-4 text-sm text-gray-500">No notifications at the moment.</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-md hover:bg-gray-100"
          >
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-orange-600" />
            </div>
            <span className="text-sm text-gray-700 hidden md:block">{user?.name || 'User'}</span>
            <ChevronDown className="w-4 h-4 text-gray-400 hidden md:block" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-800">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  navigate('/account');
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Settings
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
