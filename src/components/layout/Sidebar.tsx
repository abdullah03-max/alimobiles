import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import {
  LayoutDashboard, Monitor, ShoppingCart, Package, Layers, Tag, Box, Truck,
  ShoppingBag, Users, RotateCcw, CreditCard, BarChart3, Settings, LogOut,
  ChevronDown, Receipt,
} from 'lucide-react';
import { useState } from 'react';
import logoImage from '@/assets/—Pngtree—ali urdu calligraphy free eps_5739559.png';

const navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'POS', path: '/pos', icon: Monitor },
  { label: 'Sales', path: '/sales', icon: ShoppingCart },
  {
    label: 'Products',
    icon: Package,
    submenu: [
      { label: 'All Products', path: '/products' },
      { label: 'Categories', path: '/categories' },
    ],
  },
  // Inventory, Brands and Units removed as requested
  { label: 'Suppliers', path: '/suppliers', icon: Truck },
  { label: 'Purchases', path: '/purchases', icon: ShoppingBag },
  { label: 'Customers', path: '/customers', icon: Users },
  { label: 'Returns', path: '/returns', icon: RotateCcw },
  { label: 'Due Payments', path: '/due-payments', icon: CreditCard },
  { label: 'Expenses', path: '/expenses', icon: Receipt },
  { label: 'Reports', path: '/reports', icon: BarChart3 },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const collapsed = useUiStore(s => s.sidebarCollapsed);
  const logout = useAuthStore(s => s.logout);
  const shopName = useSettingsStore(s => s.shopSettings.shopName);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  const toggleSubmenu = (label: string) => {
    setExpandedMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full bg-gray-50 border-r border-gray-200 z-[45] flex flex-col transition-all duration-200',
        collapsed ? 'w-16' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className={cn('h-14 flex items-center border-b border-gray-200', collapsed ? 'justify-center px-2' : 'px-4')}>
        <div className="flex items-center gap-2">
          <img src={logoImage} alt="POS Logo" className="w-8 h-8 object-contain flex-shrink-0" />
          {!collapsed && (
            <div className="overflow-hidden">
              <span className="font-semibold text-sm text-gray-900 truncate">{shopName}</span>
              <span className="text-orange-500 font-semibold text-sm"> POS</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon;
          if (item.submenu) {
            const isExpanded = expandedMenus[item.label];
            const isSubActive = item.submenu.some(s => isActive(s.path));
            return (
              <div key={item.label}>
                <button
                  onClick={() => toggleSubmenu(item.label)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-gray-100',
                    isSubActive ? 'text-orange-500' : 'text-gray-700',
                    collapsed && 'justify-center px-2'
                  )}
                >
                  {Icon && <Icon className="w-[18px] h-[18px] flex-shrink-0" />}
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-180')} />
                    </>
                  )}
                </button>
                {!collapsed && isExpanded && (
                  <div className="bg-gray-50">
                    {item.submenu.map(sub => (
                      <button
                        key={sub.path}
                        onClick={() => navigate(sub.path)}
                        className={cn(
                          'w-full text-left pl-12 pr-4 py-2 text-sm transition-colors hover:bg-gray-100',
                          isActive(sub.path) ? 'text-orange-500 bg-orange-50 border-l-[3px] border-orange-500' : 'text-gray-600'
                        )}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <button
              key={item.path}
              onClick={() => item.path && navigate(item.path)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-gray-100',
                isActive(item.path || '')
                  ? 'text-orange-500 bg-orange-50 border-l-[3px] border-orange-500'
                  : 'text-gray-700',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              {Icon && <Icon className="w-[18px] h-[18px] flex-shrink-0" />}
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-gray-200 p-2">
        <button
          onClick={logout}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors rounded-md',
            collapsed && 'justify-center px-2'
          )}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
