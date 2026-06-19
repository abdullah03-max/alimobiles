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
import { categorySchema, type CategoryFormData } from '@/lib/validators';
import { Plus, Pencil, Trash2, Layers } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

export default function Categories() {
  const { categories, products, loadData, addCategory, updateCategory, deleteCategory } = useProductStore();
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryFormData>({ name: '', description: '', displayOrder: 0, status: 'active', showInPos: true });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => { loadData(); }, []);

  const openAdd = () => {
    setEditId(null);
    setForm({ name: '', description: '', displayOrder: 0, status: 'active', showInPos: true });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (cat: typeof categories[0]) => {
    setEditId(cat.id);
    setForm({ name: cat.name, description: cat.description || '', parentId: cat.parentId, displayOrder: cat.displayOrder, status: cat.status, showInPos: cat.showInPos });
    setErrors({});
    setModalOpen(true);
  };

  const handleSubmit = () => {
    const result = categorySchema.safeParse(form);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach(e => { errs[e.path[0] as string] = e.message; });
      setErrors(errs);
      return;
    }

    if (editId) {
      updateCategory(editId, form);
      toast.success('Category updated');
    } else {
      addCategory(form);
      toast.success('Category created');
    }
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteCategory(deleteId);
      toast.success('Category deleted');
      setDeleteId(null);
    }
  };

  const getProductCount = (catId: string) => products.filter(p => p.categoryId === catId).length;

  return (
    <div>
      <PageHeader title="Categories" subtitle="Manage product categories" actions={<Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={openAdd}><Plus className="w-4 h-4 mr-1" />Add Category</Button>} />

      {categories.length === 0 ? (
        <EmptyState icon={<Layers className="w-12 h-12" />} title="No categories" description="Create your first category" action={<Button className="bg-orange-500" onClick={openAdd}><Plus className="w-4 h-4 mr-1" />Add</Button>} />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 bg-gray-50"><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Description</th><th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Products</th><th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th><th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th></tr></thead>
            <tbody>
              {categories.map(cat => (
                <tr key={cat.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{cat.name}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{cat.description || '-'}</td>
                  <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs">{getProductCount(cat.id)} Products</span></td>
                  <td className="px-4 py-3 text-center"><Switch checked={cat.status === 'active'} onCheckedChange={v => updateCategory(cat.id, { status: v ? 'active' : 'inactive' })} /></td>
                  <td className="px-4 py-3 text-center"><div className="flex items-center justify-center gap-1"><button onClick={() => openEdit(cat)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Pencil className="w-4 h-4" /></button><button onClick={() => setDeleteId(cat.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>{editId ? 'Edit Category' : 'Add Category'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: '' }); }} className={errors.name ? 'border-red-500' : ''} />{errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}</div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={form.status === 'active'} onCheckedChange={v => setForm({ ...form, status: v ? 'active' : 'inactive' })} /></div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button className="bg-orange-500 hover:bg-orange-600" onClick={handleSubmit}>{editId ? 'Update' : 'Save'}</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} itemName="Category" message="Products in this category will become uncategorized." />
    </div>
  );
}
