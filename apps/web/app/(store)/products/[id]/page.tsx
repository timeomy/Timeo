"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@timeo/api";
import { formatPrice } from "@timeo/shared";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Skeleton,
  Separator,
} from "@timeo/ui/web";
import {
  ArrowLeft,
  ShoppingBag,
  Minus,
  Plus,
  ShoppingCart,
} from "lucide-react";

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;
  const [quantity, setQuantity] = useState(1);

  const product = useQuery(api.products.getById, {
    productId: productId as any,
  });

  const isLoading = product === undefined;

  const handleAddToCart = () => {
    alert(
      `Added ${quantity}x ${product?.name} to cart.\n\nNote: Full cart functionality is available in the mobile app.`
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-32" />
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="text-xl font-semibold">Product not found</h2>
        <p className="mt-2 text-muted-foreground">
          The product you are looking for does not exist or has been removed.
        </p>
        <Link href="/products">
          <Button variant="outline" className="mt-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Products
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/products"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Products
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Product Image */}
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border bg-muted/30">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <ShoppingBag className="h-24 w-24 text-muted-foreground/20" />
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-col">
          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <div className="mt-3">
              <span className="text-3xl font-bold text-primary">
                {formatPrice(product.price, product.currency)}
              </span>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="flex-1">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Description
            </h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          </div>

          <Separator className="my-6" />

          {/* Quantity Selector */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Quantity</span>
              <div className="flex items-center rounded-lg border">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-accent"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="flex h-10 w-12 items-center justify-center border-x text-sm font-medium">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-accent"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Subtotal */}
            <Card>
              <CardContent className="flex items-center justify-between py-3">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-lg font-bold">
                  {formatPrice(product.price * quantity, product.currency)}
                </span>
              </CardContent>
            </Card>

            <Button
              className="w-full gap-2"
              size="lg"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-5 w-5" />
              Add to Cart
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Full cart and checkout experience is available in the Timeo mobile
              app.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
