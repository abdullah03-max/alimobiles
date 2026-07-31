import { useState, useEffect, useMemo } from 'react';
import { useSaleStore } from '@/stores/saleStore';
import { useProductStore } from '@/stores/productStore';
import { useExpenseStore } from '@/stores/expenseStore';
import { useImeiStore } from '@/stores/imeiStore';
import PageHeader from '@/components/shared/PageHeader';
import { formatCurrency, formatDate, downloadCSV } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { BarChart3, ShoppingCart, Package, CreditCard, TrendingUp, Percent } from 'lucide-react';

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

type ReportType = 'sales' | 'products' | 'profit' | 'expenses' | 'product_profit_loss';

export default function Reports() {
  const { sales, loadData: loadSales } = useSaleStore();
  const { products, categories, brands, loadData: loadProducts } = useProductStore();
  const { expenses, loadData: loadExpenses } = useExpenseStore();
  const toast = useToast();
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Product Profit & Loss filters
  const [filterProductName, setFilterProductName] = useState('');
  const [filterImei, setFilterImei] = useState('');
  const [filterInvoice, setFilterInvoice] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterCondition, setFilterCondition] = useState('');
  const [sortBy, setSortBy] = useState('invoice_desc');

  useEffect(() => { 
    loadSales(); 
    loadExpenses(); 
    loadProducts();
    useImeiStore.getState().loadData();
  }, []);

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

  const productProfitLossData = useMemo(() => {
    const list: any[] = [];
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const qty = item.quantity || 1;
        const cost = item.costPrice || 0;
        const salePrice = item.unitPrice || 0;
        
        let itemDiscount = 0;
        if (item.discount) {
          if (item.discountType === 'percent') {
            itemDiscount = (salePrice * item.discount) / 100;
          } else {
            itemDiscount = item.discount;
          }
        }
        
        const finalSellingPrice = salePrice - itemDiscount;
        const totalCost = cost * qty;
        const totalSale = finalSellingPrice * qty;
        const profit = totalSale - totalCost;
        const margin = totalSale > 0 ? (profit / totalSale) * 100 : 0;
        
        const p = products.find(prod => prod.id === item.productId);
        const brandName = p ? brands.find(b => b.id === p.brandId)?.name || 'Unknown' : 'Unknown';
        const catName = p ? categories.find(c => c.id === p.categoryId)?.name || 'Unknown' : 'Unknown';
        
        const imeiValue = item.imei || [item.imei1, item.imei2].filter(Boolean).join(', ') || 'N/A';
        
        // Resolve condition dynamically from IMEI store or base product
        let cond = p?.condition || 'new';
        if (imeiValue && imeiValue !== 'N/A') {
          const imeiRecord = useImeiStore.getState().imeis.find(im => 
            im.imei?.toLowerCase() === imeiValue.toLowerCase() || 
            im.imei1?.toLowerCase() === imeiValue.toLowerCase() || 
            (im.imei2 && im.imei2.toLowerCase() === imeiValue.toLowerCase())
          );
          if (imeiRecord?.condition) {
            cond = imeiRecord.condition;
          }
        }
        
        list.push({
          id: `${sale.id}-${item.productId}-${imeiValue}`,
          saleDate: sale.createdAt,
          invoiceNumber: sale.invoiceNumber,
          productName: item.productName,
          brand: brandName,
          categoryName: catName,
          variant: `${item.ram || ''}/${item.storage || ''}`.replace(/^\/|\/$/, '') || 'N/A',
          color: item.color || 'N/A',
          condition: cond,
          imei: imeiValue,
          quantity: qty,
          costPrice: cost,
          salePrice,
          discount: itemDiscount,
          finalSellingPrice,
          totalCost,
          totalSale,
          profit,
          margin
        });
      });
    });
    
    // Apply filters
    let result = list;
    if (filterProductName.trim()) {
      const q = filterProductName.toLowerCase();
      result = result.filter(r => r.productName.toLowerCase().includes(q));
    }
    if (filterImei.trim()) {
      const q = filterImei.toLowerCase();
      result = result.filter(r => r.imei.toLowerCase().includes(q));
    }
    if (filterInvoice.trim()) {
      const q = filterInvoice.toLowerCase();
      result = result.filter(r => r.invoiceNumber.toLowerCase().includes(q));
    }
    if (filterBrand) {
      result = result.filter(r => r.brand.toLowerCase() === filterBrand.toLowerCase());
    }
    if (filterCategory) {
      result = result.filter(r => r.categoryName.toLowerCase() === filterCategory.toLowerCase());
    }
    if (filterCondition) {
      result = result.filter(r => r.condition.toLowerCase() === filterCondition.toLowerCase());
    }
    
    // Apply sorting
    if (sortBy === 'invoice_desc') {
      result.sort((a, b) => b.invoiceNumber.localeCompare(a.invoiceNumber, undefined, { numeric: true, sensitivity: 'base' }));
    } else if (sortBy === 'highest_profit') {
      result.sort((a, b) => b.profit - a.profit);
    } else if (sortBy === 'highest_loss') {
      result.sort((a, b) => a.profit - b.profit);
    } else if (sortBy === 'highest_sale') {
      result.sort((a, b) => b.finalSellingPrice - a.finalSellingPrice);
    } else if (sortBy === 'lowest_sale') {
      result.sort((a, b) => a.finalSellingPrice - b.finalSellingPrice);
    }
    
    return result;
  }, [
    filteredSales, products, brands, categories, 
    filterProductName, filterImei, filterInvoice, 
    filterBrand, filterCategory, filterCondition, sortBy
  ]);

  const pnlSummary = useMemo(() => {
    let totalQty = 0;
    let totalRev = 0;
    let totalCst = 0;
    let totalProf = 0;
    let totalLos = 0;
    
    productProfitLossData.forEach(item => {
      totalQty += item.quantity;
      totalRev += item.totalSale;
      totalCst += item.totalCost;
      if (item.profit > 0) {
        totalProf += item.profit;
      } else if (item.profit < 0) {
        totalLos += Math.abs(item.profit);
      }
    });
    
    const avgProfit = totalQty > 0 ? (totalRev - totalCst) / totalQty : 0;
    
    return {
      totalQty,
      totalRev,
      totalCst,
      totalProf,
      totalLos,
      avgProfit
    };
  }, [productProfitLossData]);

  const totalRevenue = filteredSales.reduce((s, sa) => s + sa.grandTotal, 0);
  const totalCost = filteredSales.reduce((s, sa) => s + sa.items.reduce((is, i) => {
    const p = products.find(prod => prod.id === i.productId);
    let itemCost = p?.costPrice || 0;
    
    // Check if this specific IMEI has a custom cost price
    const itemImei = i.imei || i.imei1 || i.imei2;
    if (itemImei) {
      const imeiObj = useImeiStore.getState().imeis.find(im => 
        im.imei?.toLowerCase() === itemImei.toLowerCase() || 
        im.imei1?.toLowerCase() === itemImei.toLowerCase() || 
        (im.imei2 && im.imei2.toLowerCase() === itemImei.toLowerCase())
      );
      if (imeiObj && typeof imeiObj.costPrice === 'number' && imeiObj.costPrice > 0) {
        itemCost = imeiObj.costPrice;
      } else if (p?.description?.startsWith('{') && (i.ram || i.storage)) {
        try {
          const parsed = JSON.parse(p.description);
          const matchedVariant = (parsed.variants || []).find((v: any) => 
            v.ram?.trim().toLowerCase() === (i.ram || '').trim().toLowerCase() && 
            v.storage?.trim().toLowerCase() === (i.storage || '').trim().toLowerCase()
          );
          if (matchedVariant && typeof matchedVariant.costPrice === 'number') {
            itemCost = matchedVariant.costPrice;
          }
        } catch (e) {}
      }
    } else if (p?.description?.startsWith('{') && (i.ram || i.storage)) {
      try {
        const parsed = JSON.parse(p.description);
        const matchedVariant = (parsed.variants || []).find((v: any) => 
          v.ram?.trim().toLowerCase() === (i.ram || '').trim().toLowerCase() && 
          v.storage?.trim().toLowerCase() === (i.storage || '').trim().toLowerCase()
        );
        if (matchedVariant && typeof matchedVariant.costPrice === 'number') {
          itemCost = matchedVariant.costPrice;
        }
      } catch (e) {}
    }
    return is + (itemCost * i.quantity);
  }, 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const grossProfit = totalRevenue - totalCost;
  const netProfit = grossProfit - totalExpenses;

  const reportTypes = [
    { value: 'sales' as ReportType, label: 'Sales Report', icon: ShoppingCart },
    { value: 'products' as ReportType, label: 'Product Sales', icon: Package },
    { value: 'profit' as ReportType, label: 'Profit & Loss', icon: TrendingUp },
    { value: 'expenses' as ReportType, label: 'Expenses', icon: CreditCard },
    { value: 'product_profit_loss' as ReportType, label: 'Product Profit & Loss', icon: Percent },
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

  const handleExportCSV = () => {
    const data = productProfitLossData.map(r => ({
      Date: formatDate(r.saleDate),
      Invoice: r.invoiceNumber,
      Product: r.productName,
      Brand: r.brand,
      Variant: r.variant,
      Color: r.color,
      Condition: r.condition,
      IMEI: r.imei,
      Quantity: r.quantity,
      'Cost Price': r.costPrice,
      'Sale Price': r.salePrice,
      Discount: r.discount,
      'Final Selling Price': r.finalSellingPrice,
      'Total Cost': r.totalCost,
      'Total Sale': r.totalSale,
      'Profit/Loss': r.profit,
      'Margin %': `${r.margin.toFixed(2)}%`
    }));
    downloadCSV(data, 'product-profit-loss.csv');
    toast.success('CSV report downloaded');
  };

  const handleExportExcel = () => {
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Product PnL</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        <style>
          table { border-collapse: collapse; width: 100%; font-family: sans-serif; }
          th { background-color: #f97316; color: white; padding: 8px; border: 1px solid #ddd; }
          td { padding: 8px; border: 1px solid #ddd; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .green { color: #16a34a; font-weight: bold; }
          .red { color: #dc2626; font-weight: bold; }
        </style>
      </head>
      <body>
        <h2>Product Profit & Loss Report</h2>
        <p>Generated on: ${new Date().toLocaleDateString()} | Date Range: ${dateFrom || 'All'} to ${dateTo || 'All'}</p>
        <table>
          <thead>
            <tr>
              <th>Sale Date</th>
              <th>Invoice Number</th>
              <th>Product Name</th>
              <th>Brand</th>
              <th>Variant</th>
              <th>Color</th>
              <th>Condition</th>
              <th>IMEI</th>
              <th>Quantity</th>
              <th>Cost Price</th>
              <th>Sale Price</th>
              <th>Discount</th>
              <th>Final Price</th>
              <th>Total Cost</th>
              <th>Total Sale</th>
              <th>Profit / Loss</th>
              <th>Margin %</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    productProfitLossData.forEach(r => {
      const isLoss = r.profit < 0;
      html += `
        <tr>
          <td>${formatDate(r.saleDate)}</td>
          <td>${r.invoiceNumber}</td>
          <td>${r.productName}</td>
          <td>${r.brand}</td>
          <td>${r.variant}</td>
          <td>${r.color}</td>
          <td style="text-transform: capitalize;">${r.condition}</td>
          <td>'${r.imei}</td>
          <td class="text-right">${r.quantity}</td>
          <td class="text-right">${r.costPrice}</td>
          <td class="text-right">${r.salePrice}</td>
          <td class="text-right">${r.discount}</td>
          <td class="text-right">${r.finalSellingPrice}</td>
          <td class="text-right">${r.totalCost}</td>
          <td class="text-right">${r.totalSale}</td>
          <td class="${isLoss ? 'red' : 'green'} text-right">${r.profit}</td>
          <td class="${isLoss ? 'red' : 'green'} text-right">${r.margin.toFixed(2)}%</td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `product-profit-loss-${Date.now()}.xls`;
    link.click();
    toast.success('Excel report downloaded');
  };

  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    let tableHtml = '';
    productProfitLossData.forEach(r => {
      const isLoss = r.profit < 0;
      tableHtml += `
        <tr>
          <td>${formatDate(r.saleDate)}</td>
          <td>${r.invoiceNumber}</td>
          <td>${r.productName}</td>
          <td>${r.brand}</td>
          <td>${r.variant}</td>
          <td>${r.color}</td>
          <td style="text-transform: capitalize;">${r.condition}</td>
          <td>${r.imei}</td>
          <td style="text-align: center;">${r.quantity}</td>
          <td style="text-align: right;">${formatCurrency(r.costPrice)}</td>
          <td style="text-align: right;">${formatCurrency(r.salePrice)}</td>
          <td style="text-align: right;">${formatCurrency(r.discount)}</td>
          <td style="text-align: right;">${formatCurrency(r.finalSellingPrice)}</td>
          <td style="text-align: right;">${formatCurrency(r.totalCost)}</td>
          <td style="text-align: right;">${formatCurrency(r.totalSale)}</td>
          <td class="${isLoss ? 'red' : 'green'}" style="text-align: right;">${isLoss ? '-' : ''}${formatCurrency(Math.abs(r.profit))}</td>
          <td class="${isLoss ? 'red' : 'green'}" style="text-align: right;">${r.margin.toFixed(1)}%</td>
        </tr>
      `;
    });

    printWindow.document.write(`
      <html>
      <head>
        <title>Product Profit & Loss Report</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: sans-serif; color: #333; font-size: 10px; line-height: 1.4; margin: 0; }
          h2 { font-size: 16px; margin: 0 0 5px 0; color: #f97316; }
          p { margin: 0 0 15px 0; color: #666; font-size: 10px; }
          
          /* Summary stats */
          .summary-grid { display: grid; grid-template-cols: repeat(6, 1fr); gap: 10px; margin-bottom: 20px; }
          .summary-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px; text-align: center; }
          .summary-card .value { font-size: 12px; font-weight: bold; color: #111827; margin-top: 2px; }
          .summary-card .label { font-size: 8px; color: #6b7280; text-transform: uppercase; }

          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9px; }
          th { background-color: #f97316; color: white; padding: 6px 4px; border: 1px solid #e5e7eb; font-weight: bold; text-align: left; }
          td { padding: 5px 4px; border: 1px solid #e5e7eb; word-break: break-all; }
          tr:nth-child(even) { background-color: #f9fafb; }
          .green { color: #16a34a; font-weight: bold; }
          .red { color: #dc2626; font-weight: bold; }
        </style>
      </head>
      <body>
        <h2>Product Profit & Loss Report</h2>
        <p>Generated on ${new Date().toLocaleDateString()} | Date Range: ${dateFrom || 'All'} to ${dateTo || 'All'}</p>
        
        <div class="summary-grid">
          <div class="summary-card">
            <div class="label">Total Sold</div>
            <div class="value">${pnlSummary.totalQty}</div>
          </div>
          <div class="summary-card">
            <div class="label">Total Revenue</div>
            <div class="value">${formatCurrency(pnlSummary.totalRev)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Total Cost</div>
            <div class="value">${formatCurrency(pnlSummary.totalCst)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Total Profit</div>
            <div class="value" style="color: #16a34a;">${formatCurrency(pnlSummary.totalProf)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Total Loss</div>
            <div class="value" style="color: #dc2626;">${formatCurrency(pnlSummary.totalLos)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Avg Profit/Item</div>
            <div class="value">${formatCurrency(pnlSummary.avgProfit)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Invoice</th>
              <th>Product Name</th>
              <th>Brand</th>
              <th>Variant</th>
              <th>Color</th>
              <th>Cond.</th>
              <th>IMEI</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Cost</th>
              <th style="text-align: right;">Sale</th>
              <th style="text-align: right;">Disc.</th>
              <th style="text-align: right;">Final Price</th>
              <th style="text-align: right;">Total Cost</th>
              <th style="text-align: right;">Total Sale</th>
              <th style="text-align: right;">Profit/Loss</th>
              <th style="text-align: right;">Margin</th>
            </tr>
          </thead>
          <tbody>
            ${tableHtml}
          </tbody>
        </table>
        
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
    toast.success('PDF preview generated');
  };

  return (
    <div>
      <PageHeader 
        title="Reports" 
        subtitle="Generate business insights" 
        actions={
          <div className="flex gap-2">
            {reportType === 'product_profit_loss' ? (
              <>
                <Button size="sm" variant="outline" onClick={handleExportCSV}>Export CSV</Button>
                <Button size="sm" variant="outline" onClick={handleExportExcel}>Export Excel</Button>
                <Button size="sm" variant="outline" onClick={handlePrintPDF}>Print PDF</Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={handleExport}>
                <BarChart3 className="w-4 h-4 mr-1" />Export CSV
              </Button>
            )}
          </div>
        } 
      />

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

      {reportType === 'product_profit_loss' && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-lg font-bold">{pnlSummary.totalQty}</p>
              <p className="text-xs text-gray-500 font-medium">Total Sold</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-lg font-bold">{formatCurrency(pnlSummary.totalRev)}</p>
              <p className="text-xs text-gray-500 font-medium">Total Revenue</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-lg font-bold">{formatCurrency(pnlSummary.totalCst)}</p>
              <p className="text-xs text-gray-500 font-medium">Total Cost</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-lg font-bold text-green-600">{formatCurrency(pnlSummary.totalProf)}</p>
              <p className="text-xs text-gray-500 font-medium">Total Profit</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-lg font-bold text-red-600">{formatCurrency(pnlSummary.totalLos)}</p>
              <p className="text-xs text-gray-500 font-medium">Total Loss</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-lg font-bold">{formatCurrency(pnlSummary.avgProfit)}</p>
              <p className="text-xs text-gray-500 font-medium">Avg Profit/Product</p>
            </div>
          </div>

          {/* Filters Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <h4 className="font-semibold text-sm mb-3">Filter Report</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-gray-500 block mb-1">Product Name</label>
                <Input placeholder="Search name" value={filterProductName} onChange={e => setFilterProductName(e.target.value)} className="h-8 text-xs bg-white" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 block mb-1">IMEI</label>
                <Input placeholder="Search IMEI" value={filterImei} onChange={e => setFilterImei(e.target.value)} className="h-8 text-xs bg-white" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 block mb-1">Invoice Number</label>
                <Input placeholder="Search Invoice" value={filterInvoice} onChange={e => setFilterInvoice(e.target.value)} className="h-8 text-xs bg-white" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 block mb-1">Brand</label>
                <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)} className="w-full h-8 px-2 border rounded-md text-xs bg-white focus:ring-1 focus:ring-orange-500 focus:outline-none">
                  <option value="">All Brands</option>
                  {brands?.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 block mb-1">Category</label>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full h-8 px-2 border rounded-md text-xs bg-white focus:ring-1 focus:ring-orange-500 focus:outline-none">
                  <option value="">All Categories</option>
                  {categories?.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 block mb-1">Condition</label>
                <select value={filterCondition} onChange={e => setFilterCondition(e.target.value)} className="w-full h-8 px-2 border rounded-md text-xs bg-white focus:ring-1 focus:ring-orange-500 focus:outline-none">
                  <option value="">All Conditions</option>
                  <option value="new">New</option>
                  <option value="used">Used</option>
                  <option value="open_box">Open Box</option>
                  <option value="refurbished">Refurbished</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 block mb-1">Sort By</label>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full h-8 px-2 border rounded-md text-xs bg-white focus:ring-1 focus:ring-orange-500 focus:outline-none">
                  <option value="invoice_desc">Invoice (Newest First)</option>
                  <option value="highest_profit">Highest Profit</option>
                  <option value="highest_loss">Highest Loss</option>
                  <option value="highest_sale">Highest Sale Price</option>
                  <option value="lowest_sale">Lowest Sale Price</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table list */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase">
                    <th className="p-3">Sale Date</th>
                    <th className="p-3">Invoice</th>
                    <th className="p-3">Product Name</th>
                    <th className="p-3">Brand</th>
                    <th className="p-3">Variant</th>
                    <th className="p-3">Color</th>
                    <th className="p-3">Condition</th>
                    <th className="p-3">IMEI</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Cost Price</th>
                    <th className="p-3 text-right">Sale Price</th>
                    <th className="p-3 text-right">Discount</th>
                    <th className="p-3 text-right">Final Price</th>
                    <th className="p-3 text-right">Total Cost</th>
                    <th className="p-3 text-right">Total Sale</th>
                    <th className="p-3 text-right">Profit/Loss</th>
                    <th className="p-3 text-right">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 text-xs font-medium text-gray-700">
                  {productProfitLossData.length > 0 ? (
                    productProfitLossData.map((row) => {
                      const isLoss = row.profit < 0;
                      return (
                        <tr key={row.id} className="hover:bg-gray-50">
                          <td className="p-3 whitespace-nowrap">{formatDate(row.saleDate)}</td>
                          <td className="p-3 font-semibold text-orange-600">{row.invoiceNumber}</td>
                          <td className="p-3 max-w-[150px] truncate" title={row.productName}>{row.productName}</td>
                          <td className="p-3">{row.brand}</td>
                          <td className="p-3">{row.variant}</td>
                          <td className="p-3">{row.color}</td>
                          <td className="p-3 capitalize">{row.condition.replace('_', ' ')}</td>
                          <td className="p-3 max-w-[120px] truncate font-mono text-[10px]" title={row.imei}>{row.imei}</td>
                          <td className="p-3 text-center font-bold">{row.quantity}</td>
                          <td className="p-3 text-right font-semibold">{formatCurrency(row.costPrice)}</td>
                          <td className="p-3 text-right font-semibold">{formatCurrency(row.salePrice)}</td>
                          <td className="p-3 text-right text-gray-500 font-semibold">{formatCurrency(row.discount)}</td>
                          <td className="p-3 text-right font-semibold">{formatCurrency(row.finalSellingPrice)}</td>
                          <td className="p-3 text-right font-semibold">{formatCurrency(row.totalCost)}</td>
                          <td className="p-3 text-right font-semibold text-blue-700">{formatCurrency(row.totalSale)}</td>
                          <td className={`p-3 text-right font-bold ${isLoss ? 'text-red-600' : 'text-green-600'}`}>
                            {isLoss ? '-' : ''}{formatCurrency(Math.abs(row.profit))}
                          </td>
                          <td className={`p-3 text-right font-bold ${isLoss ? 'text-red-600' : 'text-green-600'}`}>
                            {row.margin.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={17} className="p-8 text-center text-gray-400 italic">
                        No transactions found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
