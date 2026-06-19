import { useState, useEffect } from 'react';
import { useExpenseStore } from '@/stores/expenseStore';
import { useToast } from '@/hooks/useToast';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import DeleteConfirmModal from '@/components/shared/DeleteConfirmModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { expenseSchema, type ExpenseFormData } from '@/lib/validators';
import { formatCurrency, formatDate, getCategoryColor } from '@/lib/utils';
import { EXPENSE_CATEGORIES } from '@/lib/constants';
import { Plus, Pencil, Trash2, Receipt } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function Expenses() {
  const { expenses, loadData, addExpense, updateExpense, deleteExpense } = useExpenseStore();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseFormData>({ date: new Date().toISOString().split('T')[0], category: '', description: '', amount: 0, paymentMethod: 'cash' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => { loadData(); }, []);

  const filtered = expenses.filter(e => {
    const matchSearch = !search || e.description.toLowerCase().includes(search.toLowerCase()) || e.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = !categoryFilter || e.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const stats = {
    total: expenses.reduce((s, e) => s + e.amount, 0),
    thisMonth: expenses.filter(e => new Date(e.date).getMonth() === new Date().getMonth()).reduce((s, e) => s + e.amount, 0),
    categories: new Set(expenses.map(e => e.category)).size,
  };

  const openAdd = () => { setEditId(null); setForm({ date: new Date().toISOString().split('T')[0], category: '', description: '', amount: 0, paymentMethod: 'cash' }); setErrors({}); setModalOpen(true); };
  const openEdit = (e: typeof expenses[0]) => { setEditId(e.id); setForm({ date: e.date.split('T')[0], category: e.category, description: e.description, amount: e.amount, paymentMethod: e.paymentMethod, notes: e.notes }); setErrors({}); setModalOpen(true); };

  const handleSubmit = () => {
    const result = expenseSchema.safeParse(form);
    if (!result.success) { const errs: Record<string, string> = {}; result.error.issues.forEach(e => { errs[e.path[0] as string] = e.message; }); setErrors(errs); return; }
    if (editId) { updateExpense(editId, form); toast.success('Expense updated'); }
    else { addExpense(form); toast.success('Expense added'); }
    setModalOpen(false);
  };

  return (
    <div>
      <PageHeader title="Expenses" actions={<Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={openAdd}><Plus className="w-4 h-4 mr-1" />Add Expense</Button>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg border border-gray-200 p-3"><p className="text-lg font-bold">{formatCurrency(stats.total)}</p><p className="text-xs text-gray-500">Total Expenses</p></div>
        <div className="bg-white rounded-lg border border-gray-200 p-3"><p className="text-lg font-bold">{formatCurrency(stats.thisMonth)}</p><p className="text-xs text-gray-500">This Month</p></div>
        <div className="bg-white rounded-lg border border-gray-200 p-3"><p className="text-lg font-bold">{stats.categories}</p><p className="text-xs text-gray-500">Categories</p></div>
        <div className="bg-white rounded-lg border border-gray-200 p-3"><p className="text-lg font-bold">{expenses.length}</p><p className="text-xs text-gray-500">Entries</p></div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4 flex flex-wrap gap-2">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search expenses..." className="max-w-xs" />
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="h-9 px-3 border rounded-md text-sm bg-white"><option value="">All Categories</option>{EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
      </div>

      {filtered.length === 0 ? <EmptyState icon={<Receipt className="w-12 h-12" />} title="No expenses" action={<Button className="bg-orange-500" onClick={openAdd}><Plus className="w-4 h-4 mr-1" />Add</Button>} /> : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 bg-gray-50"><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Category</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Description</th><th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th><th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Method</th><th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th></tr></thead>
            <tbody>{filtered.map(e => (
              <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">{formatDate(e.date)}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(e.category)}`}>{e.category}</span></td>
                <td className="px-4 py-3 text-gray-800">{e.description}</td>
                <td className="px-4 py-3 text-right font-medium text-red-600">-{formatCurrency(e.amount)}</td>
                <td className="px-4 py-3 text-center capitalize text-xs">{e.paymentMethod}</td>
                <td className="px-4 py-3 text-center"><div className="flex items-center justify-center gap-1"><button onClick={() => openEdit(e)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Pencil className="w-4 h-4" /></button><button onClick={() => setDeleteId(e.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>{editId ? 'Edit Expense' : 'Add Expense'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            <div><Label>Category *</Label><select value={form.category} onChange={e => { setForm({ ...form, category: e.target.value }); setErrors({ ...errors, category: '' }); }} className={`w-full h-9 px-3 border rounded-md text-sm ${errors.category ? 'border-red-500' : ''}`}><option value="">Select</option>{EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>{errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}</div>
            <div><Label>Description *</Label><Input value={form.description} onChange={e => { setForm({ ...form, description: e.target.value }); setErrors({ ...errors, description: '' }); }} className={errors.description ? 'border-red-500' : ''} />{errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}</div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Amount (PKR) *</Label><Input type="number" value={form.amount || ''} onChange={e => { setForm({ ...form, amount: parseFloat(e.target.value) || 0 }); setErrors({ ...errors, amount: '' }); }} className={errors.amount ? 'border-red-500' : ''} />{errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}</div>
              <div><Label>Payment Method</Label><select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value as 'cash' | 'card' | 'bank_transfer' })} className="w-full h-9 px-3 border rounded-md text-sm"><option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Bank Transfer</option></select></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4"><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button className="bg-orange-500 hover:bg-orange-600" onClick={handleSubmit}>{editId ? 'Update' : 'Save'}</Button></div>
        </DialogContent>
      </Dialog>
      <DeleteConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) { deleteExpense(deleteId); toast.success('Deleted'); setDeleteId(null); } }} itemName="Expense" />
    </div>
  );
}
