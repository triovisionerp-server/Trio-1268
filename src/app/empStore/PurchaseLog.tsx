import { format } from 'date-fns';
import { ShoppingCart, FileText } from 'lucide-react';
import { DBPurchaseEntry, DBMaterial, DBSupplier } from '@/hooks/useInventoryDataSupabase';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface PurchaseLogProps {
  purchases: DBPurchaseEntry[];
  materials: DBMaterial[];
  suppliers: DBSupplier[];
}

export function PurchaseLog({ purchases, materials, suppliers }: PurchaseLogProps) {
  const getMaterialName = (materialId: string) => {
    const material = materials.find(m => m.id === materialId);
    return material ? `${material.code} - ${material.name}` : 'Unknown';
  };

  const getMaterialUnit = (materialId: string) => {
    const material = materials.find(m => m.id === materialId);
    return material?.unit || '';
  };

  const getSupplierName = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.name || 'Unknown';
  };

  if (purchases.length === 0) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Purchase Entries Yet</h3>
        <p className="text-muted-foreground">
          Record your first purchase entry to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl overflow-hidden animate-slide-up">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            <TableHead className="text-muted-foreground font-semibold">Date</TableHead>
            <TableHead className="text-muted-foreground font-semibold">Material</TableHead>
            <TableHead className="text-muted-foreground font-semibold">Supplier</TableHead>
            <TableHead className="text-muted-foreground font-semibold text-right">Qty</TableHead>
            <TableHead className="text-muted-foreground font-semibold text-right">Unit Price</TableHead>
            <TableHead className="text-muted-foreground font-semibold text-right">Total</TableHead>
            <TableHead className="text-muted-foreground font-semibold">Invoice</TableHead>
            <TableHead className="text-muted-foreground font-semibold">Entered By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {purchases.map((purchase) => (
            <TableRow
              key={purchase.id}
              className="border-border/30 transition-colors hover:bg-accent/30"
            >
              <TableCell className="text-muted-foreground">
                {format(new Date(purchase.date), 'dd MMM yyyy, HH:mm')}
              </TableCell>
              <TableCell className="font-medium">
                {getMaterialName(purchase.material_id)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {getSupplierName(purchase.supplier_id)}
              </TableCell>
              <TableCell className="text-right font-semibold">
                {purchase.quantity.toLocaleString()}{' '}
                <span className="text-xs text-muted-foreground">
                  {getMaterialUnit(purchase.material_id)}
                </span>
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                ₹{purchase.unit_price.toLocaleString()}
              </TableCell>
              <TableCell className="text-right font-semibold text-success">
                ₹{(purchase.quantity * purchase.unit_price).toLocaleString()}
              </TableCell>
              <TableCell>
                {purchase.invoice_number ? (
                  <Badge variant="outline" className="gap-1 font-mono text-xs">
                    <FileText className="h-3 w-3" />
                    {purchase.invoice_number}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {purchase.entered_by}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
