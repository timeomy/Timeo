"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@timeo/api";
import { useTimeoWebAuthContext } from "@timeo/auth/web";
import { formatPrice } from "@timeo/shared";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Input,
  Button,
  Badge,
  Skeleton,
} from "@timeo/ui/web";
import { Search, ShoppingBag, ArrowRight, Package } from "lucide-react";

export default function ProductsPage() {
  const { activeTenantId } = useTimeoWebAuthContext();
  const [searchQuery, setSearchQuery] = useState("");

  const products = useQuery(
    api.products.list,
    activeTenantId ? { tenantId: activeTenantId as any } : "skip"
  );

  const isLoading = products === undefined;

  const filteredProducts = products?.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <p className="mt-2 text-muted-foreground">
          Browse our product catalog and find what you need.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="p-0">
                <Skeleton className="aspect-square w-full rounded-t-lg" />
              </CardHeader>
              <CardContent className="pt-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="mt-2 h-4 w-1/2" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredProducts?.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Package className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No products found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchQuery
              ? "Try adjusting your search terms."
              : "No products are available at the moment."}
          </p>
          {searchQuery && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setSearchQuery("")}
            >
              Clear search
            </Button>
          )}
        </div>
      )}

      {/* No tenant selected */}
      {!activeTenantId && !isLoading && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <ShoppingBag className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No business selected</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Please sign in and select a business to view products.
          </p>
        </div>
      )}

      {/* Product Grid */}
      {filteredProducts && filteredProducts.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <Card
              key={product._id}
              className="group flex flex-col overflow-hidden transition-shadow hover:shadow-md"
            >
              {/* Image Placeholder */}
              <div className="flex aspect-square items-center justify-center bg-muted/30">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ShoppingBag className="h-16 w-16 text-muted-foreground/20" />
                )}
              </div>

              <CardContent className="flex flex-1 flex-col pt-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-tight">
                    {product.name}
                  </h3>
                  <Badge variant="secondary" className="flex-shrink-0">
                    {formatPrice(product.price, product.currency)}
                  </Badge>
                </div>
                <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted-foreground">
                  {product.description}
                </p>
              </CardContent>
              <CardFooter>
                <Link href={`/products/${product._id}`} className="w-full">
                  <Button
                    variant="outline"
                    className="w-full gap-2 transition-all group-hover:gap-3"
                  >
                    View Details
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
