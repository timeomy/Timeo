import { useState, useEffect } from 'react';
import { GymLayout } from '@/components/layout/GymLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, 
  Package, Droplet, Dumbbell, Search, Crown, Settings, Edit2, PlusCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminPlanCheckout } from '@/components/admin/AdminPlanCheckout';

interface Product {
  id: string;
  name: string;
  price: number;
  category: 'drinks' | 'supplements' | 'gear' | 'snacks';
}

interface CartItem extends Product {
  quantity: number;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  drinks: <Droplet className="h-6 w-6" />,
  supplements: <Package className="h-6 w-6" />,
  gear: <Dumbbell className="h-6 w-6" />,
  snacks: <Package className="h-6 w-6" />,
};

const DEFAULT_PRODUCTS: Product[] = [
  { id: '1', name: 'Mineral Water', price: 2.50, category: 'drinks' },
  { id: '2', name: 'Protein Shake', price: 12.00, category: 'drinks' },
  { id: '3', name: 'Sports Drink', price: 5.00, category: 'drinks' },
  { id: '4', name: 'Whey Protein (1kg)', price: 120.00, category: 'supplements' },
  { id: '5', name: 'BCAA', price: 85.00, category: 'supplements' },
  { id: '6', name: 'Pre-Workout', price: 95.00, category: 'supplements' },
  { id: '7', name: 'Gym Gloves', price: 45.00, category: 'gear' },
  { id: '8', name: 'Resistance Band', price: 25.00, category: 'gear' },
  { id: '9', name: 'Gym Towel', price: 15.00, category: 'gear' },
  { id: '10', name: 'Protein Bar', price: 8.00, category: 'snacks' },
  { id: '11', name: 'Energy Bar', price: 6.00, category: 'snacks' },
  { id: '12', name: 'Mixed Nuts', price: 10.00, category: 'snacks' },
];

const CATEGORIES = ['all', 'drinks', 'supplements', 'gear', 'snacks'] as const;

const STORAGE_KEY = 'pos_products';

function loadProducts(): Product[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_PRODUCTS;
}

function saveProducts(products: Product[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

export default function PointOfSale() {
  const [products, setProducts] = useState<Product[]>(loadProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [category, setCategory] = useState<typeof CATEGORIES[number]>('all');
  const [search, setSearch] = useState('');
  const [cashReceived, setCashReceived] = useState('');

  // Product management
  const [manageOpen, setManageOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({ name: '', price: '', category: 'drinks' as Product['category'] });

  useEffect(() => {
    saveProducts(products);
  }, [products]);

  const filteredProducts = products.filter(p => {
    const matchesCategory = category === 'all' || p.category === category;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item)
        .filter(item => item.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(item => item.id !== id));

  const clearCart = () => { setCart([]); setCashReceived(''); };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.06;
  const total = subtotal + tax;
  const cashReceivedNum = parseFloat(cashReceived) || 0;
  const change = cashReceivedNum - total;

  const handleCheckout = (method: 'cash' | 'card') => {
    if (cart.length === 0) { toast.error('Cart is empty'); return; }
    if (method === 'cash' && cashReceivedNum < total) { toast.error('Cash received is less than total'); return; }
    toast.success(`Payment of RM ${total.toFixed(2)} received via ${method}${method === 'cash' ? ` — Change: RM ${change.toFixed(2)}` : ''}`);
    clearCart();
  };

  // Product CRUD
  const openAddProduct = () => {
    setEditProduct(null);
    setProductForm({ name: '', price: '', category: 'drinks' });
    setManageOpen(true);
  };

  const openEditProduct = (product: Product) => {
    setEditProduct(product);
    setProductForm({ name: product.name, price: product.price.toString(), category: product.category });
    setManageOpen(true);
  };

  const handleSaveProduct = () => {
    const name = productForm.name.trim();
    const price = parseFloat(productForm.price);
    if (!name) { toast.error('Product name is required'); return; }
    if (isNaN(price) || price <= 0) { toast.error('Enter a valid price'); return; }

    if (editProduct) {
      setProducts(prev => prev.map(p => p.id === editProduct.id ? { ...p, name, price, category: productForm.category } : p));
      toast.success('Product updated');
    } else {
      const newProduct: Product = { id: crypto.randomUUID(), name, price, category: productForm.category };
      setProducts(prev => [...prev, newProduct]);
      toast.success('Product added');
    }
    setManageOpen(false);
  };

  const handleDeleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    setCart(prev => prev.filter(item => item.id !== id));
    toast.success('Product removed');
  };

  return (
    <GymLayout title="Point of Sale" subtitle="Process transactions">
      <Tabs defaultValue="membership" className="space-y-4">
        <TabsList className="bg-muted/30">
          <TabsTrigger value="membership" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            Membership Checkout
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Products
          </TabsTrigger>
        </TabsList>

        <TabsContent value="membership" className="mt-0">
          <AdminPlanCheckout />
        </TabsContent>

        <TabsContent value="products" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-220px)]">
            {/* Products Grid */}
            <div className="lg:col-span-2 space-y-4 flex flex-col">
              <Card className="ios-card bg-card border-border/50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search products..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 bg-muted/30"
                      />
                    </div>
                    <Button variant="outline" size="sm" onClick={openAddProduct} className="gap-1">
                      <PlusCircle className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {CATEGORIES.map((cat) => (
                      <Button
                        key={cat}
                        variant={category === cat ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCategory(cat)}
                        className="capitalize"
                      >
                        {cat}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="ios-card bg-card border-border/50 flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {filteredProducts.map((product) => (
                        <div
                          key={product.id}
                          className="relative p-4 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/30 hover:border-primary/50 transition-all text-left group"
                        >
                          {/* Edit button */}
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditProduct(product); }}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted/60"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                          </button>
                          <button onClick={() => addToCart(product)} className="w-full text-left">
                            <div className="flex items-center justify-center h-12 mb-3 text-muted-foreground group-hover:text-primary transition-colors">
                              {CATEGORY_ICONS[product.category]}
                            </div>
                            <p className="font-medium text-sm text-foreground truncate">{product.name}</p>
                            <p className="text-primary font-display text-lg">RM {product.price.toFixed(2)}</p>
                          </button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </ScrollArea>
              </Card>
            </div>

            {/* Cart */}
            <Card className="ios-card bg-card border-border/50 flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  Cart
                  {cart.length > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {cart.reduce((sum, item) => sum + item.quantity, 0)} items
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col p-4 pt-0">
                <ScrollArea className="flex-1 -mx-4 px-4">
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                      <ShoppingCart className="h-12 w-12 mb-2 opacity-30" />
                      <p className="text-sm">Cart is empty</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cart.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/20">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">RM {item.price.toFixed(2)} each</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, -1)}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, 1)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeFromCart(item.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>RM {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">SST (6%)</span>
                    <span>RM {tax.toFixed(2)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between text-lg font-display">
                    <span>Total</span>
                    <span className="text-primary">RM {total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Cash Received (RM)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      className="bg-muted/30 text-lg font-display"
                      disabled={cart.length === 0}
                    />
                  </div>
                  {cashReceivedNum > 0 && cart.length > 0 && (
                    <div className={`flex justify-between text-lg font-display p-2 rounded-lg ${change >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'}`}>
                      <span>Change</span>
                      <span>RM {change.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button variant="outline" className="h-12" onClick={() => handleCheckout('cash')} disabled={cart.length === 0 || cashReceivedNum < total}>
                    <Banknote className="h-4 w-4 mr-2" />
                    Cash
                  </Button>
                  <Button variant="default" className="h-12" onClick={() => handleCheckout('card')} disabled={cart.length === 0}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Card
                  </Button>
                </div>

                {cart.length > 0 && (
                  <Button variant="ghost" className="mt-2 text-destructive hover:text-destructive" onClick={clearCart}>
                    Clear Cart
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add / Edit Product Dialog */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editProduct ? <Edit2 className="h-5 w-5 text-primary" /> : <PlusCircle className="h-5 w-5 text-primary" />}
              {editProduct ? 'Edit Product' : 'Add Product'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={productForm.name}
                onChange={(e) => setProductForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Product name"
              />
            </div>
            <div className="space-y-2">
              <Label>Price (RM) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={productForm.price}
                onChange={(e) => setProductForm(f => ({ ...f, price: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={productForm.category}
                onValueChange={(v: Product['category']) => setProductForm(f => ({ ...f, category: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="drinks">Drinks</SelectItem>
                  <SelectItem value="supplements">Supplements</SelectItem>
                  <SelectItem value="gear">Gear</SelectItem>
                  <SelectItem value="snacks">Snacks</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              {editProduct && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => { handleDeleteProduct(editProduct.id); setManageOpen(false); }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              )}
              <div className="flex-1" />
              <Button variant="outline" onClick={() => setManageOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveProduct}>
                {editProduct ? 'Save Changes' : 'Add Product'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </GymLayout>
  );
}
