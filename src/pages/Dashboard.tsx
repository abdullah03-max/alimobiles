import { useEffect, useMemo } from 'react';
import { useProductStore } from '@/stores/productStore';
import { useSaleStore } from '@/stores/saleStore';
import { useCustomerStore } from '@/stores/customerStore';
import { useSupplierStore } from '@/stores/supplierStore';
import { useExpenseStore } from '@/stores/expenseStore';
import KpiCard from '@/components/shared/KpiCard';
import { formatCurrency } from '@/lib/utils';
import {
  ShoppingCart, Receipt, Package, AlertTriangle,
  ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/utils';

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444'];

export default function Dashboard() {
  const { products, loadData: loadProducts } = useProductStore();
  const { sales, loadData: loadSales } = useSaleStore();
  const { customers, loadData: loadCustomers } = useCustomerStore();
  const { suppliers, loadData: loadSuppliers } = useSupplierStore();
  const { expenses, loadData: loadExpenses } = useExpenseStore();

  useEffect(() => {
    loadProducts();
    loadSales();
    loadCustomers();
    loadSuppliers();
    loadExpenses();
  }, []);

  const todaySales = useMemo(() => {
    const today = new Date().toDateString();
    return sales.filter(s => new Date(s.createdAt).toDateString() === today && s.status !== 'cancelled');
  }, [sales]);

  const todayRevenue = useMemo(() => todaySales.reduce((sum, s) => sum + s.grandTotal, 0), [todaySales]);
  const todayOrders = todaySales.length;
  const totalProducts = products.length;
  const lowStockItems = products.filter(p => p.stockQuantity <= p.minStockLevel && p.stockQuantity > 0).length;
  const outOfStockItems = products.filter(p => p.stockQuantity <= 0).length;

  // Weekly sales data for chart
  const weeklyData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((day, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const daySales = sales.filter(s => new Date(s.createdAt).toDateString() === d.toDateString() && s.status !== 'cancelled');
      return { name: day, sales: daySales.reduce((sum, s) => sum + s.grandTotal, 0) };
    });
  }, [sales]);

  // Category sales data
  const categoryData = useMemo(() => {
    const catMap: Record<string, number> = {};
    sales.forEach(s => {
      s.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const cat = useProductStore.getState().categories.find(c => c.id === product.categoryId);
          const name = cat?.name || 'Unknown';
          catMap[name] = (catMap[name] || 0) + item.total;
        }
      });
    });
    return Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [sales, products]);

  // Recent sales
  const recentSales = useMemo(() => sales.slice(0, 5), [sales]);

  // Low stock products
  const lowStockProducts = useMemo(() =>
    products.filter(p => p.stockQuantity <= p.minStockLevel).slice(0, 5),
    [products]
  );

  return (
    <div>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard
          title="Today's Sales"
          value={todayRevenue}
          isCurrency
          icon={ShoppingCart}
          iconBg="bg-orange-50"
          iconColor="text-orange-500"
          trend={{ value: 12, label: 'from yesterday' }}
        />
        <KpiCard
          title="Today's Orders"
          value={todayOrders}
          icon={Receipt}
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
          trend={{ value: 5, label: 'from yesterday' }}
        />
        <KpiCard
          title="Total Products"
          value={totalProducts}
          icon={Package}
          iconBg="bg-green-50"
          iconColor="text-green-500"
        />
        <KpiCard
          title="Low Stock Alert"
          value={lowStockItems}
          icon={AlertTriangle}
          iconBg="bg-yellow-50"
          iconColor="text-yellow-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Sales Overview */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 bg-orange-500 rounded-full" />
            <h3 className="font-semibold text-gray-800">Sales Overview</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `PKR ${v / 1000}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="sales" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Sales by Category */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 bg-orange-500 rounded-full" />
            <h3 className="font-semibold text-gray-800">Sales by Category</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {categoryData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Sales + Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Sales */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-orange-500 rounded-full" />
              <h3 className="font-semibold text-gray-800">Recent Sales</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Invoice</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map(sale => (
                  <tr key={sale.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-blue-600">{sale.invoiceNumber}</td>
                    <td className="px-4 py-3 text-gray-700">{sale.customerName}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(sale.grandTotal)}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={sale.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-orange-500 rounded-full" />
              <h3 className="font-semibold text-gray-800">Low Stock Items</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Min Level</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.map(product => (
                  <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{product.name}</td>
                    <td className="px-4 py-3 text-center font-medium">{product.stockQuantity}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{product.minStockLevel}</td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={product.stockQuantity <= 0 ? 'out_of_stock' : 'low_stock'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
