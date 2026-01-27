import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Package, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DBMaterial, DBSupplier } from '@/hooks/useInventoryDataSupabase';
import { categories } from '@/types/inventory';
import { toast } from 'sonner';

const materialSchema = z.object({
  code: z.string().min(1, 'Material code is required').max(20, 'Code must be less than 20 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  category: z.enum(['Raw Material', 'Consumable', 'Tool', 'Safety Equipment']),
  unit: z.enum(['Kg', 'Liters', 'Pieces', 'Meters', 'Boxes', 'Pairs', 'Sets']),
  opening_stock: z.number().min(0, 'Opening stock must be 0 or greater'),
  current_stock: z.number().min(0, 'Current stock must be 0 or greater'),
  min_stock: z.number().min(0, 'Minimum stock must be 0 or greater'),
  supplier_id: z.string().nullable(),
  purchase_price: z.number().min(0, 'Purchase price must be 0 or greater'),
});

type MaterialFormData = z.infer<typeof materialSchema>;

interface MaterialFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material?: DBMaterial | null;
  suppliers: DBSupplier[];
  onSubmit: (data: Omit<DBMaterial, 'id' | 'created_at' | 'updated_at'>) => Promise<DBMaterial | void>;
  onUpdate?: (id: string, data: Partial<DBMaterial>) => Promise<DBMaterial | void>;
}

export function MaterialForm({
  open,
  onOpenChange,
  material,
  suppliers,
  onSubmit,
  onUpdate,
}: MaterialFormProps) {
  const isEditing = !!material;
  const [loading, setLoading] = useState(false);

  const form = useForm<MaterialFormData>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      code: '',
      name: '',
      unit: 'NOS',
      current_stock: 0,
      min_stock: 0,
      supplier_id: null,
      purchase_price: 0,
    },
  });

  useEffect(() => {
    if (material) {
      form.reset({
        code: material.code,
        name: material.name,
        unit: material.unit as 'KG' | 'NOS' | 'METER' | 'LITER' | 'PCS',
        current_stock: material.current_stock,
        min_stock: material.min_stock || 0,
        supplier_id: material.supplier_id,
        purchase_price: material.purchase_price || 0,
      });
    } else {
      form.reset({
        code: '',
        name: '',
        category: 'Raw Material',
        unit: 'Pieces',
        opening_stock: 0,
        current_stock: 0,
        min_stock: 0,
        supplier_id: null,
        purchase_price: 0,
      });
    }
  }, [material, form]);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      const submitData = {
        code: data.code,
        name: data.name,
        category: data.category,
        unit: data.unit,
        opening_stock: data.opening_stock,
        current_stock: data.current_stock,
        min_stock: data.min_stock,
        supplier_id: data.supplier_id,
        purchase_price: data.purchase_price,
      };
      if (isEditing && onUpdate) {
        await onUpdate(material.id, submitData);
        toast.success('Material updated successfully');
      } else {
        await onSubmit(submitData);
        toast.success('Material added successfully');
      }
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save material');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border/50 max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <DialogTitle>{isEditing ? 'Edit Material' : 'Add New Material'}</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Material Code *</Label>
              <Input
                id="code"
                placeholder="e.g., MAT-AL-001"
                {...form.register('code')}
                className="bg-accent/50 border-border/50"
              />
              {form.formState.errors.code && (
                <p className="text-xs text-critical">{form.formState.errors.code.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Material name"
                {...form.register('name')}
                className="bg-accent/50 border-border/50"
              />
              {form.formState.errors.name && (
                <p className="text-xs text-critical">{form.formState.errors.name.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={form.watch('category')}
                onValueChange={(val) => form.setValue('category', val as any)}
              >
                <SelectTrigger className="bg-accent/50 border-border/50">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="glass border-border/50">
                  <SelectItem value="Raw Material">Raw Material</SelectItem>
                  <SelectItem value="Consumable">Consumable</SelectItem>
                  <SelectItem value="Tool">Tool</SelectItem>
                  <SelectItem value="Safety Equipment">Safety Equipment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unit *</Label>
              <Select
                value={form.watch('unit')}
                onValueChange={(val) => form.setValue('unit', val as any)}
              >
                <SelectTrigger className="bg-accent/50 border-border/50">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent className="glass border-border/50">
                  <SelectItem value="Kg">Kg</SelectItem>
                  <SelectItem value="Liters">Liters</SelectItem>
                  <SelectItem value="Pieces">Pieces</SelectItem>
                  <SelectItem value="Meters">Meters</SelectItem>
                  <SelectItem value="Boxes">Boxes</SelectItem>
                  <SelectItem value="Pairs">Pairs</SelectItem>
                  <SelectItem value="Sets">Sets</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="opening_stock">Opening Stock</Label>
              <Input
                id="opening_stock"
                type="number"
                step="0.01"
                {...form.register('opening_stock', { valueAsNumber: true })}
                className="bg-accent/50 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current_stock">Current Stock</Label>
              <Input
                id="current_stock"
                type="number"
                step="0.01"
                {...form.register('current_stock', { valueAsNumber: true })}
                className="bg-accent/50 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min_stock">Min Stock</Label>
              <Input
                id="min_stock"
                type="number"
                step="0.01"
                {...form.register('min_stock', { valueAsNumber: true })}
                className="bg-accent/50 border-border/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select
                value={form.watch('supplier_id') || 'none'}
                onValueChange={(val) => form.setValue('supplier_id', val === 'none' ? null : val)}
              >
                <SelectTrigger className="bg-accent/50 border-border/50">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent className="glass border-border/50">
                  <SelectItem value="none">No Supplier</SelectItem>
                  {suppliers.filter(sup => sup.id && sup.id.trim() !== '').map((sup) => (
                    <SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase_price">Purchase Price (₹)</Label>
              <Input
                id="purchase_price"
                type="number"
                step="0.01"
                {...form.register('purchase_price', { valueAsNumber: true })}
                className="bg-accent/50 border-border/50"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border/50"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90">
              {loading ? 'Saving...' : isEditing ? 'Update Material' : 'Add Material'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
