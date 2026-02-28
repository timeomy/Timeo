"use client";

import { useState } from "react";
import Image from "next/image";
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from "@timeo/api-client";
import { useTenantId } from "@/hooks/use-tenant-id";
import { formatPrice } from "@timeo/shared";
import {
  Card,
  CardContent,
  Button,
  Input,
  Select,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  cn,
} from "@timeo/ui/web";
import {
  Plus,
  Search,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Package,
  LayoutGrid,
  List,
  ImageIcon,
} from "lucide-react";

const CURRENCY_OPTIONS = [
  { label: "MYR (RM)", value: "MYR" },
  { label: "USD ($)", value: "USD" },
  { label: "SGD (S$)", value: "SGD" },
];

interface ProductForm {
  name: string;
  description: string;
  price: string;
  currency: string;
}

const EMPTY_FORM: ProductForm = {
  name: "",
  description: "",
  price: "",
  currency: "MYR",
};

type ViewMode = "grid" | "table";

export default function ProductsPage() {
  const { tenantId } = useTenantId();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("grid");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data: products, isLoading } = useProducts(tenantId ?? "");

  const { mutateAsync: createProduct } = useCreateProduct(tenantId ?? "");
  const { mutateAsync: updateProduct } = useUpdateProduct(tenantId ?? "");
  const { mutateAsync: deleteProduct } = useDeleteProduct(tenantId ?? "");

  const filtered =
    products?.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()),
    ) ?? [];

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(product: NonNullable<typeof products>[number]) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description ?? "",
      price: String(product.price),
      currency: product.currency ?? "MYR",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.price) return;
    if (!editingId && !tenantId) return;
    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        currency: form.currency,
      };
      if (editingId) {
        await updateProduct({ id: editingId, ...data });
      } else {
        await createProduct(data);
      }
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
    } catch (err) {
      console.error("Failed to save product:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(productId: string) {
    if (!tenantId) return;
    setTogglingId(productId);
    try {
      await deleteProduct(productId);
    } catch (err) {
      console.error("Failed to toggle product:", err);
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Products
          </h1>
          <p className="text-sm text-white/50">
            {isLoading
              ? "Loading..."
              : `${products?.length ?? 0} product${(products?.length ?? 0) !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Search + View Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] p-1">
          <button
            onClick={() => setView("grid")}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              view === "grid"
                ? "bg-primary/15 text-primary"
                : "text-white/40 hover:text-white/60",
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("table")}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              view === "table"
                ? "bg-primary/15 text-primary"
                : "text-white/40 hover:text-white/60",
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSkeleton view={view} />
      ) : filtered.length === 0 ? (
        <EmptyState hasProducts={(products?.length ?? 0) > 0} onAdd={openCreate} />
      ) : view === "grid" ? (
        <GridView
          products={filtered}
          onEdit={openEdit}
          onToggle={handleToggle}
          togglingId={togglingId}
        />
      ) : (
        <TableView
          products={filtered}
          onEdit={openEdit}
          onToggle={handleToggle}
          togglingId={togglingId}
        />
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Product" : "Add Product"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update the details for this product."
                : "Create a new product for your store."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              label="Product Name"
              placeholder="e.g., Shampoo, Hair Oil"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <div className="w-full">
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Description
              </label>
              <textarea
                placeholder="Describe the product..."
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
                className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Price"
                type="number"
                placeholder="0.00"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
              <Select
                label="Currency"
                options={CURRENCY_OPTIONS}
                value={form.currency}
                onChange={(value) => setForm({ ...form, currency: value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name.trim() || !form.price}
            >
              {saving ? "Saving..." : editingId ? "Save Changes" : "Create Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Grid View ──────────────────────────────────────────── */

function GridView({
  products,
  onEdit,
  onToggle,
  togglingId,
}: {
  products: Array<{ id: string; name: string; description?: string; price: number; currency?: string; isActive: boolean; imageUrl?: string; createdAt?: string | number }>;
  onEdit: (p: any) => void;
  onToggle: (id: string) => void;
  togglingId: string | null;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <Card key={product.id} className="glass-card group">
          <CardContent className="p-0">
            {/* Image area */}
            <div className="relative flex h-40 items-center justify-center rounded-t-2xl bg-white/[0.02] border-b border-white/[0.06]">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  className="rounded-t-2xl object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              ) : (
                <ImageIcon className="h-10 w-10 text-white/10" />
              )}
              <Badge
                variant={product.isActive ? "default" : "secondary"}
                className={cn(
                  "absolute top-3 right-3 text-xs",
                  product.isActive
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : "bg-white/[0.06] text-white/40 border-white/[0.08]",
                )}
              >
                {product.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>

            {/* Details */}
            <div className="p-4 space-y-3">
              <div>
                <h3 className="font-medium text-white">{product.name}</h3>
                {product.description && (
                  <p className="mt-0.5 text-xs text-white/40 line-clamp-2">
                    {product.description}
                  </p>
                )}
              </div>

              <p className="text-lg font-bold text-white">
                {formatPrice(product.price, product.currency ?? "MYR")}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 flex-1 text-white/60 hover:bg-white/[0.06] hover:text-white"
                  onClick={() => onEdit(product)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn(
                    "h-7 gap-1 flex-1",
                    product.isActive
                      ? "text-yellow-400 hover:bg-yellow-500/10 hover:text-yellow-300"
                      : "text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300",
                  )}
                  disabled={togglingId === product.id}
                  onClick={() => onToggle(product.id)}
                >
                  {product.isActive ? (
                    <>
                      <ToggleRight className="h-3.5 w-3.5" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="h-3.5 w-3.5" />
                      Activate
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ── Table View ─────────────────────────────────────────── */

function TableView({
  products,
  onEdit,
  onToggle,
  togglingId,
}: {
  products: Array<{ id: string; name: string; description?: string; price: number; currency?: string; isActive: boolean; imageUrl?: string; createdAt?: string | number }>;
  onEdit: (p: any) => void;
  onToggle: (id: string) => void;
  togglingId: string | null;
}) {
  return (
    <Card className="glass-card">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableHead className="text-white/50">Product</TableHead>
              <TableHead className="text-white/50">Price</TableHead>
              <TableHead className="text-white/50">Status</TableHead>
              <TableHead className="text-right text-white/50">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow
                key={product.id}
                className="border-white/[0.06] hover:bg-white/[0.02]"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03]">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          className="rounded-lg object-cover"
                          sizes="40px"
                        />
                      ) : (
                        <Package className="h-4 w-4 text-white/20" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-white">{product.name}</p>
                      {product.description && (
                        <p className="mt-0.5 text-xs text-white/40 line-clamp-1">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-medium text-white">
                  {formatPrice(product.price, product.currency ?? "MYR")}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={product.isActive ? "default" : "secondary"}
                    className={cn(
                      "text-xs",
                      product.isActive
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : "bg-white/[0.06] text-white/40 border-white/[0.08]",
                    )}
                  >
                    {product.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 text-white/60 hover:bg-white/[0.06] hover:text-white"
                      onClick={() => onEdit(product)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={cn(
                        "h-7 gap-1",
                        product.isActive
                          ? "text-yellow-400 hover:bg-yellow-500/10 hover:text-yellow-300"
                          : "text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300",
                      )}
                      disabled={togglingId === product.id}
                      onClick={() => onToggle(product.id)}
                    >
                      {product.isActive ? (
                        <>
                          <ToggleRight className="h-3.5 w-3.5" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-3.5 w-3.5" />
                          Activate
                        </>
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ── Loading & Empty ────────────────────────────────────── */

function LoadingSkeleton({ view }: { view: ViewMode }) {
  if (view === "grid") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="glass-card">
            <CardContent className="p-0">
              <Skeleton className="h-40 rounded-t-2xl bg-white/[0.06]" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4 bg-white/[0.06]" />
                <Skeleton className="h-3 w-1/2 bg-white/[0.06]" />
                <Skeleton className="h-6 w-20 bg-white/[0.06]" />
                <div className="flex gap-2 pt-1">
                  <Skeleton className="h-7 flex-1 bg-white/[0.06]" />
                  <Skeleton className="h-7 flex-1 bg-white/[0.06]" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Card className="glass-card">
      <CardContent className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-lg bg-white/[0.06]" />
            <Skeleton className="h-4 w-32 bg-white/[0.06]" />
            <Skeleton className="h-4 w-20 bg-white/[0.06]" />
            <Skeleton className="h-5 w-16 rounded-full bg-white/[0.06]" />
            <Skeleton className="h-7 w-28 ml-auto bg-white/[0.06]" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EmptyState({
  hasProducts,
  onAdd,
}: {
  hasProducts: boolean;
  onAdd: () => void;
}) {
  return (
    <Card className="glass-card">
      <CardContent>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-white/[0.04] p-3 mb-3">
            {hasProducts ? (
              <Search className="h-6 w-6 text-white/30" />
            ) : (
              <Package className="h-6 w-6 text-white/30" />
            )}
          </div>
          <p className="text-sm font-medium text-white/50">
            {hasProducts ? "No products match your search" : "No products yet"}
          </p>
          <p className="text-xs text-white/30 mt-1 max-w-xs">
            {hasProducts
              ? "Try adjusting your search query."
              : "Add your first product to start selling."}
          </p>
          {!hasProducts && (
            <Button size="sm" className="mt-4 gap-2" onClick={onAdd}>
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
