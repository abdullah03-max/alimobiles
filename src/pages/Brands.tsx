import { useState, useEffect } from 'react';
import { useProductStore } from '@/stores/productStore';
import { useToast } from '@/hooks/useToast';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import DeleteConfirmModal from '@/components/shared/DeleteConfirmModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { brandSchema, type BrandFormData } from '@/lib/validators';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function Brands() {
  const { brands, products, loadData, addBrand, updateBrand, deleteBrand } = useProductStore();
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<BrandFormData>({ name: '', description: '', status: 'active' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => { loadData(); }, []);

  const openAdd = () => { setEditId(null); setForm({ name: '', description: '', status: 'active' }); setErrors({}); setModalOpen(true); };
  const openEdit = (b: typeof brands[0]) => { setEditId(b.id); setForm({ name: b.name, description: b.description || '', website: b.website, status: b.status }); setErrors({}); setModalOpen(true); };

  const handleSubmit = () => {
    const result = brandSchema.safeParse(form);
    if (!result.success) { const errs: Record<string, string> = {}; result.error.issues.forEach(e => { errs[e.path[0] as string] = e.message; }); setErrors(errs); return; }
    if (editId) { updateBrand(editId, form); toast.success('Brand updated'); }
    else { addBrand(form); toast.success('Brand created'); }
    setModalOpen(false);
  };

  const handleDelete = () => { if (deleteId) { deleteBrand(deleteId); toast.success('Brand deleted'); setDeleteId(null); } };
  const getProductCount = (brandId: string) => products.filter(p => p.brandId === brandId).length;

  return (
    <div>
      <PageHeader title="Brands" subtitle="Manage product brands" actions={<Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={openAdd}><Plus className="w-4 h-4 mr-1" />Add Brand</Button>} />
      {brands.length === 0 ? <EmptyState icon={<Tag className="w-12 h-12" />} title="No brands" description="Add your first brand" action={<Button className="bg-orange-500" onClick={openAdd}><Plus className="w-4 h-4 mr-1" />Add</Button>} /> : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 bg-gray-50"><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Description</th><th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Products</th><th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th><th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th></tr></thead>
            <tbody>{brands.map(b => (
              <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{b.name}</td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{b.description || '-'}</td>
                <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs">{getProductCount(b.id)} Products</span></td>
                <td className="px-4 py-3 text-center"><Switch checked={b.status === 'active'} onCheckedChange={v => updateBrand(b.id, { status: v ? 'active' : 'inactive' })} /></td>
                <td className="px-4 py-3 text-center"><div className="flex items-center justify-center gap-1"><button onClick={() => openEdit(b)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Pencil className="w-4 h-4" /></button><button onClick={() => setDeleteId(b.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>{editId ? 'Edit Brand' : 'Add Brand'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: '' }); }} className={errors.name ? 'border-red-500' : ''} />{errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}</div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={form.status === 'active'} onCheckedChange={v => setForm({ ...form, status: v ? 'active' : 'inactive' })} /></div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button className="bg-orange-500 hover:bg-orange-600" onClick={handleSubmit}>{editId ? 'Update' : 'Save'}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
      <DeleteConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} itemName="Brand" />
    </div>
  );
}
