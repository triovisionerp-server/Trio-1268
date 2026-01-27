import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShoppingCart, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { toast } from 'sonner';
import { format } from 'date-fns';

const purchaseSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  material_id: z.string().min(1, 'Material is required'),
  supplier_id: z.string().min(1, 'Supplier is required'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit_price: z.number().min(0, 'Unit price must be 0 or greater'),
  invoice_number: z.string().max(50, 'Invoice number must be less than 50 characters').nullable(),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

type PurchaseFormData = z.infer<typeof purchaseSchema>;

interface PurchaseEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materials: DBMaterial[];
  suppliers: DBSupplier[];
  onSubmit: (data: {
    date: string;
    material_id: string;
    supplier_id: string;
    quantity: number;
    unit_price: number;
    invoice_number: string | null;
    notes?: string;
    entered_by: string;
  }) => Promise<any>;
}

export function PurchaseEntryForm({
  open,
  onOpenChange,
  materials,
  suppliers,
  onSubmit,
}: PurchaseEntryFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      material_id: '',
      supplier_id: '',
      quantity: 0,
      unit_price: 0,
      invoice_number: null,
      notes: undefined,
    },
  });

  const selectedMaterial = materials.find(m => m.id === form.watch('material_id'));
  const totalAmount = (form.watch('quantity') || 0) * (form.watch('unit_price') || 0);

  const handleSubmit = async (data: PurchaseFormData) => {
    setLoading(true);
    try {
      await onSubmit({
        date: data.date,
        material_id: data.material_id,
        supplier_id: data.supplier_id,
        quantity: data.quantity,
        unit_price: data.unit_price,
        invoice_number: data.invoice_number || null,
        notes: data.notes,
        entered_by: 'Store Manager',
      });
      toast.success('Purchase entry added successfully');
      onOpenChange(false);
      form.reset({
        date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        material_id: '',
        supplier_id: '',
        quantity: 0,
        unit_price: 0,
        invoice_number: null,
        notes: undefined,
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to add purchase entry');
    } finally {
      setLoading(false);
    }
  };

  // Auto-fill unit price when material is selected
  const handleMaterialChange = (materialId: string) => {
    form.setValue('material_id', materialId);
    const material = materials.find(m => m.id === materialId);
    if (material) {
      form.setValue('unit_price', material.purchase_price || 0);
      if (material.supplier_id) {
        form.setValue('supplier_id', material.supplier_id);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border/50 max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-success" />
            <DialogTitle>Record Purchase Entry</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date & Time *</Label>
              <Input
                id="date"
                type="datetime-local"
                {...form.register('date')}
                className="bg-accent/50 border-border/50"
              />
              {form.formState.errors.date && (
                <p className="text-xs text-critical">{form.formState.errors.date.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice_number">Invoice Number</Label>
              <Input
                id="invoice_number"
                placeholder="e.g., INV-2024-001"
                {...form.register('invoice_number')}
                className="bg-accent/50 border-border/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Material *</Label>
            <Select
              value={form.watch('material_id')}
              onValueChange={handleMaterialChange}
            >
              <SelectTrigger className="bg-accent/50 border-border/50">
                <SelectValue placeholder="Select material" />
              </SelectTrigger>
              <SelectContent className="glass border-border/50">
                {materials.filter(mat => mat.id && mat.id.trim() !== '').map((mat) => (
                  <SelectItem key={mat.id} value={mat.id}>
                    {mat.code} - {mat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.material_id && (
              <p className="text-xs text-critical">{form.formState.errors.material_id.message}</p>
            )}
            {selectedMaterial && (
              <p className="text-xs text-muted-foreground">
                Current Stock: {selectedMaterial.current_stock} {selectedMaterial.unit}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Supplier *</Label>
            <Select
              value={form.watch('supplier_id')}
              onValueChange={(val) => form.setValue('supplier_id', val)}
            >
              <SelectTrigger className="bg-accent/50 border-border/50">
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent className="glass border-border/50">
                {suppliers.filter(sup => sup.id && sup.id.trim() !== '').map((sup) => (
                  <SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.supplier_id && (
              <p className="text-xs text-critical">{form.formState.errors.supplier_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                {...form.register('quantity', { valueAsNumber: true })}
                className="bg-accent/50 border-border/50"
              />
              {form.formState.errors.quantity && (
                <p className="text-xs text-critical">{form.formState.errors.quantity.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit_price">Unit Price (₹)</Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                {...form.register('unit_price', { valueAsNumber: true })}
                className="bg-accent/50 border-border/50"
              />
            </div>
          </div>

          <div className="bg-success/10 border border-success/30 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Amount</span>
              <span className="text-xl font-bold text-success">
                ₹{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              {...form.register('notes')}
              className="bg-accent/50 border-border/50 resize-none"
              rows={2}
            />
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
            <Button type="submit" disabled={loading} className="bg-success hover:bg-success/90">
              {loading ? 'Saving...' : 'Record Purchase'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
