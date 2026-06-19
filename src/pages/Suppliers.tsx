import { useState, useEffect } from 'react';
import { useSupplierStore } from '@/stores/supplierStore';
import { useToast } from '@/hooks/useToast';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import DeleteConfirmModal from '@/components/shared/DeleteConfirmModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supplierSchema, type SupplierFormData } from '@/lib/validators';
import { Plus, Pencil, Trash2, Truck, Phone, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';

export default function Suppliers() {
  const { suppliers, purchases, loadData, addSupplier, updateSupplier, deleteSupplier } = useSupplierStore();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierFormData>({ name: '', phone: '', status: 'active' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => { loadData(); }, []);

  const filtered = suppliers.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.phone.includes(search));

  const openAdd = () => { setEditId(null); setForm({ name: '', contactPerson: '', phone: '', email: '', address: '', city: '', notes: '', status: 'active' }); setErrors({}); setModalOpen(true); };
  const openEdit = (s: typeof suppliers[0]) => { setEditId(s.id); setForm({ name: s.name, contactPerson: s.contactPerson, phone: s.phone, email: s.email, address: s.address, city: s.city, notes: s.notes, status: s.status }); setErrors({}); setModalOpen(true); };

  const handleSubmit = () => {
    const result = supplierSchema.safeParse(form);
    if (!result.success) { const errs: Record<string, string> = {}; result.error.issues.forEach(e => { errs[e.path[0] as string] = e.message; }); setErrors(errs); return; }
    if (editId) { updateSupplier(editId, form); toast.success('Supplier updated'); }
    else { addSupplier(form); toast.success('Supplier added'); }
    setModalOpen(false);
  };

  const handleDelete = () => { if (deleteId) { deleteSupplier(deleteId); toast.success('Supplier deleted'); setDeleteId(null); } };

  const getTotalPurchases = (supId: string) => purchases.filter(p => p.supplierId === supId).reduce((s, p) => s + p.grandTotal, 0);

  return (
    <div>
      <PageHeader title="Suppliers" actions={<Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={openAdd}><Plus className="w-4 h-4 mr-1" />Add Supplier</Button>} />

      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
        <div className="relative max-w-sm"><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suppliers..." className="pl-9" /><Truck className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /></div>
      </div>

      {filtered.length === 0 ? <EmptyState icon={<Truck className="w-12 h-12" />} title="No suppliers" action={<Button className="bg-orange-500" onClick={openAdd}><Plus className="w-4 h-4 mr-1" />Add</Button>} /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => (
            <div key={s.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">{s.name}</h3>
                  {s.contactPerson && <p className="text-sm text-gray-500">{s.contactPerson}</p>}
                </div>
                <div className="flex gap-1"><button onClick={() => openEdit(s)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Pencil className="w-4 h-4" /></button><button onClick={() => setDeleteId(s.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex items-center gap-2 text-sm text-gray-600"><Phone className="w-3.5 h-3.5" />{s.phone}</div>
                {s.email && <div className="flex items-center gap-2 text-sm text-gray-600"><Mail className="w-3.5 h-3.5" />{s.email}</div>}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500">Total Purchases</span>
                <span className="text-sm font-semibold text-gray-800">{formatCurrency(getTotalPurchases(s.id))}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{editId ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Name *</Label><Input value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: '' }); }} className={errors.name ? 'border-red-500' : ''} />{errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}</div>
            <div><Label>Contact Person</Label><Input value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} /></div>
            <div><Label>Phone *</Label><Input value={form.phone} onChange={e => { setForm({ ...form, phone: e.target.value }); setErrors({ ...errors, phone: '' }); }} className={errors.phone ? 'border-red-500' : ''} />{errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}</div>
            <div className="col-span-2"><Label>Email</Label><Input value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div className="col-span-2"><Label>Address</Label><Textarea value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} rows={2} /></div>
            <div className="col-span-2"><Label>Notes</Label><Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4"><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button className="bg-orange-500 hover:bg-orange-600" onClick={handleSubmit}>{editId ? 'Update' : 'Save'}</Button></div>
        </DialogContent>
      </Dialog>
      <DeleteConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} itemName="Supplier" />
    </div>
  );
}
