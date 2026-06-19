import { useState, useEffect, useMemo } from 'react';
import { useSaleStore } from '@/stores/saleStore';
import { useToast } from '@/hooks/useToast';
import { formatCurrency, formatDate } from '@/lib/utils';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreditCard } from 'lucide-react';

export default function DuePayments() {
  const { sales, loadData: loadSales, updateSale } = useSaleStore();
  const toast = useToast();
  const [collectModal, setCollectModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<{ id: string; number: string; balance: number; name: string } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => { loadSales(); }, []);

  const isInvoiceOverdue = (createdAt: string): boolean => {
    const invoiceDate = new Date(createdAt);
    const today = new Date();
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 30); // 30-day payment term
    return today > dueDate;
  };

  const customerDues = useMemo(() => {
    return sales.filter(s => s.status === 'pending' || s.status === 'partial').map(s => ({
      id: s.id,
      invoice: s.invoiceNumber,
      customer: s.customerName,
      date: s.createdAt,
      total: s.grandTotal,
      paid: s.paidAmount,
      balance: s.grandTotal - s.paidAmount,
      status: s.status,
      isOverdue: isInvoiceOverdue(s.createdAt),
    }));
  }, [sales]);

  const openCollect = (inv: typeof customerDues[0]) => {
    setSelectedInvoice({ id: inv.id, number: inv.invoice, balance: inv.balance, name: inv.customer });
    setPaymentAmount(String(inv.balance));
    setCollectModal(true);
  };

  const handlePayment = async () => {
    if (!selectedInvoice || !paymentAmount) {
      toast.error('Please enter payment amount');
      return;
    }

    const sale = sales.find(s => s.id === selectedInvoice.id);
    if (!sale) return;

    const amount = parseFloat(paymentAmount);
    if (amount <= 0) {
      toast.error('Payment amount must be greater than 0');
      return;
    }

    const newPaidAmount = sale.paidAmount + amount;
    const newStatus = newPaidAmount >= sale.grandTotal ? 'paid' : 'partial';

    await updateSale(sale.id, {
      paidAmount: newPaidAmount,
      status: newStatus,
    });

    toast.success(`Payment of ${formatCurrency(amount)} recorded`);
    setCollectModal(false);
    setPaymentAmount('');
    setSelectedInvoice(null);
  };

  return (
    <div>
      <PageHeader title="Due Payments" subtitle="Track outstanding payments" />

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-lg border border-gray-200 p-3"><p className="text-lg font-bold">{formatCurrency(customerDues.reduce((s, d) => s + d.balance, 0))}</p><p className="text-xs text-gray-500">Total Due</p></div>
        <div className="bg-white rounded-lg border border-gray-200 p-3"><p className="text-lg font-bold text-red-600">{formatCurrency(customerDues.filter(d => d.isOverdue && d.balance > 0).reduce((s, d) => s + d.balance, 0))}</p><p className="text-xs text-gray-500">Overdue (30+ days)</p></div>
        <div className="bg-white rounded-lg border border-gray-200 p-3"><p className="text-lg font-bold">{customerDues.length}</p><p className="text-xs text-gray-500">Customers</p></div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Invoice</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Due Date</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Paid</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Balance</th>
            <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr></thead>
          <tbody>{customerDues.map(d => (
            <tr key={d.id} className={`border-b border-gray-50 hover:bg-gray-50 ${d.isOverdue ? 'bg-red-50' : ''}`}>
              <td className="px-4 py-3 font-medium text-gray-800">{d.customer}</td>
              <td className="px-4 py-3 font-mono text-blue-600">{d.invoice}</td>
              <td className="px-4 py-3 text-gray-600">{formatDate(d.date)}</td>
              <td className="px-4 py-3 text-right">{formatCurrency(d.total)}</td>
              <td className="px-4 py-3 text-right text-green-600">{formatCurrency(d.paid)}</td>
              <td className={`px-4 py-3 text-right font-semibold ${d.isOverdue ? 'text-red-700 bg-red-100' : 'text-red-600'}`}>{formatCurrency(d.balance)}</td>
              <td className="px-4 py-3 text-center"><StatusBadge status={d.status} /></td>
              <td className="px-4 py-3 text-center"><Button size="sm" className="h-7 text-xs bg-orange-500" onClick={() => openCollect(d)}><CreditCard className="w-3 h-3 mr-1" />Collect</Button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      <Dialog open={collectModal} onOpenChange={setCollectModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Collect Payment</DialogTitle></DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="text-sm"><p><span className="text-gray-500">Customer:</span> <span className="font-medium">{selectedInvoice.name}</span></p><p><span className="text-gray-500">Invoice:</span> <span className="font-medium">{selectedInvoice.number}</span></p><p><span className="text-gray-500">Balance Due:</span> <span className="font-semibold text-red-600">{formatCurrency(selectedInvoice.balance)}</span></p></div>
              <div><Label>Payment Amount (PKR)</Label><Input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} /></div>
              <Button className="w-full bg-orange-500" onClick={handlePayment}>Record Payment</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
