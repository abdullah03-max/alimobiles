import { useState, useEffect, useMemo } from 'react';
import { useSaleStore } from '@/stores/saleStore';
import { useProductStore } from '@/stores/productStore';
import { useExpenseStore } from '@/stores/expenseStore';
import PageHeader from '@/components/shared/PageHeader';
import { formatCurrency, formatDate, downloadCSV } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { BarChart3, ShoppingCart, Package, CreditCard, TrendingUp } from 'lucide-react';

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

type ReportType = 'sales' | 'products' | 'profit' | 'expenses';

export default function Reports() {
  const { sales, loadData: loadSales } = useSaleStore();
  const { products, categories } = useProductStore();
  const { expenses, loadData: loadExpenses } = useExpenseStore();
  const toast = useToast();
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => { loadSales(); loadExpenses(); }, []);

  const filteredSales = useMemo(() => {
    let result = sales.filter(s => s.status !== 'cancelled');
    if (dateFrom) result = result.filter(s => new Date(s.createdAt) >= new Date(dateFrom));
    if (dateTo) result = result.filter(s => new Date(s.createdAt) <= new Date(dateTo + 'T23:59:59'));
    return result;
  }, [sales, dateFrom, dateTo]);

  const salesChartData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredSales.forEach(s => {
      const key = new Date(s.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
      map[key] = (map[key] || 0) + s.grandTotal;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).slice(-14);
  }, [filteredSales]);

  const productSalesData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredSales.forEach(s => s.items.forEach(i => { map[i.productName] = (map[i.productName] || 0) + i.quantity; }));
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filteredSales]);

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredSales.forEach(s => s.items.forEach(i => {
      const p = products.find(pr => pr.id === i.productId);
      const cat = categories.find(c => c.id === p?.categoryId);
      const name = cat?.name || 'Unknown';
      map[name] = (map[name] || 0) + i.total;
    }));
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredSales, products, categories]);

  const expenseData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const totalRevenue = filteredSales.reduce((s, sa) => s + sa.grandTotal, 0);
  const totalCost = filteredSales.reduce((s, sa) => s + sa.items.reduce((is, i) => is + (products.find(p => p.id === i.productId)?.costPrice || 0) * i.quantity, 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const grossProfit = totalRevenue - totalCost;
  const netProfit = grossProfit - totalExpenses;

  const reportTypes = [
    { value: 'sales' as ReportType, label: 'Sales Report', icon: ShoppingCart },
    { value: 'products' as ReportType, label: 'Product Sales', icon: Package },
    { value: 'profit' as ReportType, label: 'Profit & Loss', icon: TrendingUp },
    { value: 'expenses' as ReportType, label: 'Expenses', icon: CreditCard },
  ];

  const handleExport = () => {
    const data = filteredSales.map(s => ({
      Invoice: s.invoiceNumber,
      Date: formatDate(s.createdAt),
      Customer: s.customerName,
      Items: s.items.length,
      Subtotal: s.subtotal,
      Discount: s.discount,
      Total: s.grandTotal,
      Payment: s.paymentMethod,
      Status: s.status,
    }));
    downloadCSV(data, 'sales-report.csv');
    toast.success('Report exported');
  };

  return (
    <div>
      <PageHeader title="Reports" subtitle="Generate business insights" actions={<Button size="sm" variant="outline" onClick={handleExport}><BarChart3 className="w-4 h-4 mr-1" />Export CSV</Button>} />

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {reportTypes.map(r => {
            const Icon = r.icon;
            return (
              <button key={r.value} onClick={() => setReportType(r.value)} className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${reportType === r.value ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-200'}`}>
                <Icon className="w-4 h-4" />{r.label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 ml-auto">
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 text-sm w-36" />
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 text-sm w-36" />
        </div>
      </div>

      {reportType === 'sales' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="bg-white rounded-lg border border-gray-200 p-3"><p className="text-lg font-bold">{formatCurrency(totalRevenue)}</p><p className="text-xs text-gray-500">Total Sales</p></div>
            <div className="bg-white rounded-lg border border-gray-200 p-3"><p className="text-lg font-bold">{filteredSales.length}</p><p className="text-xs text-gray-500">Orders</p></div>
            <div className="bg-white rounded-lg border border-gray-200 p-3"><p className="text-lg font-bold">{filteredSales.length > 0 ? formatCurrency(totalRevenue / filteredSales.length) : 'PKR 0'}</p><p className="text-xs text-gray-500">Average Order</p></div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold mb-4">Sales Over Time</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={salesChartData}><CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={v => `PKR ${v / 1000}k`} /><Tooltip formatter={(v: number) => formatCurrency(v)} /><Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {reportType === 'products' && (
        <>
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <h3 className="font-semibold mb-4">Top Selling Products</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={productSalesData} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" /><XAxis type="number" tick={{ fontSize: 11 }} /><YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={150} /><Tooltip /><Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold mb-4">Sales by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart><Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">{categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip formatter={(v: number) => formatCurrency(v)} /><Legend /></PieChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {reportType === 'profit' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-white rounded-lg border border-gray-200 p-3"><p className="text-lg font-bold">{formatCurrency(totalRevenue)}</p><p className="text-xs text-gray-500">Revenue</p></div>
            <div className="bg-white rounded-lg border border-gray-200 p-3"><p className="text-lg font-bold">{formatCurrency(totalCost)}</p><p className="text-xs text-gray-500">COGS</p></div>
            <div className="bg-white rounded-lg border border-gray-200 p-3"><p className="text-lg font-bold">{formatCurrency(totalExpenses)}</p><p className="text-xs text-gray-500">Expenses</p></div>
            <div className="bg-white rounded-lg border border-gray-200 p-3"><p className={`text-lg font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(netProfit)}</p><p className="text-xs text-gray-500">Net Profit</p></div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold mb-4">Revenue vs Expenses</h3>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={salesChartData}><CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={v => `PKR ${v / 1000}k`} /><Tooltip formatter={(v: number) => formatCurrency(v)} /><Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316', r: 4 }} /></LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {reportType === 'expenses' && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold mb-4">Expenses by Category</h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart><Pie data={expenseData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">{expenseData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip formatter={(v: number) => formatCurrency(v)} /><Legend /></PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
