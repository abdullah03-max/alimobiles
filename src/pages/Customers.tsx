import { useState, useEffect } from 'react';
import { useCustomerStore } from '@/stores/customerStore';
import { useSaleStore } from '@/stores/saleStore';
import { useToast } from '@/hooks/useToast';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import DeleteConfirmModal from '@/components/shared/DeleteConfirmModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { customerSchema, type CustomerFormData } from '@/lib/validators';
import { formatCurrency } from '@/lib/utils';
import { Plus, Pencil, Trash2, Users, Search, Phone, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function Customers() {
  const { customers, loadData: loadCustomers, addCustomer, updateCustomer, deleteCustomer } = useCustomerStore();
  const { sales } = useSaleStore();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewCustomer, setViewCustomer] = useState<typeof customers[0] | null>(null);
  const [form, setForm] = useState<CustomerFormData>({ name: '', phone: '', status: 'active' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => { loadCustomers(); }, []);

  const filtered = customers.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));

  const openAdd = () => { setEditId(null); setForm({ name: '', phone: '', email: '', address: '', city: '', notes: '', status: 'active' }); setErrors({}); setModalOpen(true); };
  const openEdit = (c: typeof customers[0]) => { setEditId(c.id); setForm({ name: c.name, phone: c.phone, email: c.email, address: c.address, city: c.city, notes: c.notes, status: c.status }); setErrors({}); setModalOpen(true); };

  const handleSubmit = () => {
    const result = customerSchema.safeParse(form);
    if (!result.success) { const errs: Record<string, string> = {}; result.error.issues.forEach(e => { errs[e.path[0] as string] = e.message; }); setErrors(errs); return; }
    if (editId) { updateCustomer(editId, form); toast.success('Customer updated'); }
    else { addCustomer(form); toast.success('Customer added'); }
    setModalOpen(false);
  };

  const getCustomerSales = (custId: string) => sales.filter(s => s.customerId === custId && s.status !== 'cancelled');
  const getTotalSpent = (custId: string) => getCustomerSales(custId).reduce((s, sa) => s + sa.grandTotal, 0);

  return (
    <div>
      <PageHeader title="Customers" actions={<Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={openAdd}><Plus className="w-4 h-4 mr-1" />Add Customer</Button>} />

      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
        <div className="relative max-w-sm"><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..." className="pl-9" /><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /></div>
      </div>

      {filtered.length === 0 ? <EmptyState icon={<Users className="w-12 h-12" />} title="No customers" action={<Button className="bg-orange-500" onClick={openAdd}><Plus className="w-4 h-4 mr-1" />Add</Button>} /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <div key={c.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewCustomer(c)}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-semibold text-sm">{c.name.charAt(0)}</div>
                  <div><h3 className="font-semibold text-gray-800">{c.name}</h3><p className="text-xs text-gray-500">{getCustomerSales(c.id).length} purchases</p></div>
                </div>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => setDeleteId(c.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex items-center gap-2 text-sm text-gray-600"><Phone className="w-3.5 h-3.5" />{c.phone}</div>
                {c.email && <div className="flex items-center gap-2 text-sm text-gray-600"><Mail className="w-3.5 h-3.5" />{c.email}</div>}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500">Total Spent</span>
                <span className="text-sm font-semibold text-gray-800">{formatCurrency(getTotalSpent(c.id))}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>{editId ? 'Edit Customer' : 'Add Customer'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: '' }); }} className={errors.name ? 'border-red-500' : ''} />{errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}</div>
            <div><Label>Phone *</Label><Input value={form.phone} onChange={e => { setForm({ ...form, phone: e.target.value }); setErrors({ ...errors, phone: '' }); }} className={errors.phone ? 'border-red-500' : ''} />{errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}</div>
            <div><Label>Email</Label><Input value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Address</Label><Textarea value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} rows={2} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4"><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button className="bg-orange-500 hover:bg-orange-600" onClick={handleSubmit}>{editId ? 'Update' : 'Save'}</Button></div>
        </DialogContent>
      </Dialog>

      {/* View Customer */}
      <Dialog open={!!viewCustomer} onOpenChange={() => setViewCustomer(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{viewCustomer?.name}</DialogTitle></DialogHeader>
          {viewCustomer && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm"><span className="text-gray-500">Phone:</span><span>{viewCustomer.phone}</span>{viewCustomer.email && <><span className="text-gray-500">Email:</span><span>{viewCustomer.email}</span></>}{viewCustomer.address && <><span className="text-gray-500">Address:</span><span>{viewCustomer.address}</span></>}</div>
              <div className="border-t pt-3"><h4 className="font-medium text-sm mb-2">Purchase History</h4>
                {getCustomerSales(viewCustomer.id).length === 0 ? <p className="text-sm text-gray-500">No purchases yet</p> : (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {getCustomerSales(viewCustomer.id).slice(0, 10).map(s => (
                      <div key={s.id} className="flex justify-between text-sm py-1 border-b border-gray-50"><span className="text-blue-600 font-mono">{s.invoiceNumber}</span><span>{formatCurrency(s.grandTotal)}</span></div>
                    ))}
                  </div>
                )}
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold"><span>Total Spent</span><span className="text-orange-500">{formatCurrency(getTotalSpent(viewCustomer.id))}</span></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DeleteConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) { deleteCustomer(deleteId); toast.success('Deleted'); setDeleteId(null); } }} itemName="Customer" />
    </div>
  );
}
