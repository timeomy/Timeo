"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useOrders, useCreateStripePayment } from "@timeo/api-client";
import { useTimeoWebAuthContext } from "@timeo/auth/web";
import { formatPrice } from "@timeo/shared";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Skeleton,
  Separator,
} from "@timeo/ui/web";
import {
  CreditCard,
  ShoppingBag,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

type CheckoutState = "loading" | "ready" | "processing" | "success" | "error";

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const { activeTenantId, isSignedIn } = useTimeoWebAuthContext();

  // Handle return from redirect-based payment methods (FPX, GrabPay)
  const paymentStatus = searchParams.get("payment_status");
  const redirectStatus = searchParams.get("redirect_status");

  const [checkoutState, setCheckoutState] = useState<CheckoutState>(
    paymentStatus === "success" || redirectStatus === "succeeded"
      ? "success"
      : "loading"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const { data: orders, isLoading: ordersLoading } = useOrders(activeTenantId ?? "");
  const order = orders?.find((o) => o.id === orderId);

  const { mutateAsync: createPaymentIntent } = useCreateStripePayment(activeTenantId ?? "");

  // Initialize payment intent when order is loaded
  useEffect(() => {
    if (!order || !activeTenantId || clientSecret) return;

    async function initPayment() {
      try {
        const result = await createPaymentIntent({
          orderId: order!.id,
          amount: order!.totalAmount,
          currency: order!.currency,
          customerId: order!.customerId,
        });
        setClientSecret(result.clientSecret);
        setCheckoutState("ready");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to initialize payment";
        setErrorMessage(message);
        setCheckoutState("error");
      }
    }

    initPayment();
  }, [order, activeTenantId, clientSecret, createPaymentIntent]);

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <CreditCard className="h-12 w-12 text-muted-foreground/50" />
        <h2 className="mt-4 text-xl font-semibold">Sign in to checkout</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You need to be signed in to complete your purchase.
        </p>
        <Link href="/sign-in">
          <Button className="mt-4">Sign In</Button>
        </Link>
      </div>
    );
  }

  if (!orderId) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <ShoppingBag className="h-12 w-12 text-muted-foreground/50" />
        <h2 className="mt-4 text-xl font-semibold">No order found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No order ID was provided. Please start from the product page.
        </p>
        <Link href="/products">
          <Button variant="outline" className="mt-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Browse Products
          </Button>
        </Link>
      </div>
    );
  }

  if (checkoutState === "success") {
    return (
      <div className="mx-auto max-w-lg py-16">
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <h2 className="mt-4 text-2xl font-bold">Payment Successful</h2>
            <p className="mt-2 text-center text-muted-foreground">
              Your order has been confirmed. Thank you for your purchase!
            </p>
            <div className="mt-6 flex gap-3">
              <Link href="/orders">
                <Button>View My Orders</Button>
              </Link>
              <Link href="/products">
                <Button variant="outline">Continue Shopping</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Checkout</h1>
      </div>

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {!order ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{item.snapshotName}</span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      x{item.quantity}
                    </span>
                  </div>
                  <span className="font-medium">
                    {formatPrice(
                      (item.snapshotPrice ?? 0) * item.quantity,
                      order.currency
                    )}
                  </span>
                </div>
              ))}
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">Total</span>
                <span className="text-lg font-bold text-primary">
                  {formatPrice(order.totalAmount, order.currency)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Pay securely with FPX online banking, credit/debit card, or GrabPay.
          </p>
        </CardHeader>
        <CardContent>
          {checkoutState === "loading" && (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Preparing payment...
              </p>
            </div>
          )}

          {checkoutState === "error" && (
            <div className="flex flex-col items-center py-8">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <p className="mt-3 text-sm text-destructive">{errorMessage}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setCheckoutState("loading");
                  setClientSecret(null);
                  setErrorMessage("");
                }}
              >
                Try Again
              </Button>
            </div>
          )}

          {checkoutState === "ready" && clientSecret && (
            <div className="space-y-4">
              <StripePaymentForm
                clientSecret={clientSecret}
                onSuccess={() => setCheckoutState("success")}
                onError={(msg) => {
                  setErrorMessage(msg);
                  setCheckoutState("error");
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StripePaymentForm({
  clientSecret,
  onSuccess,
  onError,
}: {
  clientSecret: string;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const [processing, setProcessing] = useState(false);
  const [stripeLoaded, setStripeLoaded] = useState(false);
  const [stripe, setStripe] = useState<any>(null);
  const [elements, setElements] = useState<any>(null);

  // Dynamically load Stripe.js
  useEffect(() => {
    async function loadStripe() {
      try {
        const { loadStripe: loadStripeFn } = await import("@stripe/stripe-js");
        const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
        if (!publishableKey) {
          onError("Stripe publishable key is not configured");
          return;
        }
        const stripeInstance = await loadStripeFn(publishableKey);
        if (!stripeInstance) {
          onError("Failed to load Stripe");
          return;
        }
        setStripe(stripeInstance);

        const elementsInstance = stripeInstance.elements({
          clientSecret,
          appearance: {
            theme: "stripe",
            variables: {
              colorPrimary: "#1a56db",
              borderRadius: "8px",
            },
          },
        });
        setElements(elementsInstance);
        setStripeLoaded(true);
      } catch {
        onError("Failed to initialize payment form");
      }
    }

    loadStripe();
  }, [clientSecret, onError]);

  // Mount Stripe Payment Element
  useEffect(() => {
    if (!elements || !stripeLoaded) return;

    const paymentElement = elements.create("payment");
    const container = document.getElementById("stripe-payment-element");
    if (container) {
      paymentElement.mount(container);
    }

    return () => {
      paymentElement.unmount();
    };
  }, [elements, stripeLoaded]);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;

    setProcessing(true);

    // FPX and GrabPay require redirect, so always redirect after confirmation.
    // For card-only payments, Stripe will skip the redirect if not needed.
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url:
          window.location.origin +
          "/checkout?orderId=" +
          new URLSearchParams(window.location.search).get("orderId") +
          "&payment_status=success",
      },
      redirect: "if_required",
    });

    if (error) {
      onError(error.message ?? "Payment failed");
      setProcessing(false);
    } else {
      onSuccess();
    }
  };

  if (!stripeLoaded) {
    return (
      <div className="flex flex-col items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          Loading payment form...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div id="stripe-payment-element" />

      {/* Payment method info */}
      <div className="flex flex-wrap items-center justify-center gap-3 rounded-lg border border-dashed p-3">
        <span className="text-xs text-muted-foreground">Accepted:</span>
        <span className="rounded bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">
          FPX Online Banking
        </span>
        <span className="rounded bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
          GrabPay
        </span>
        <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          Visa / Mastercard
        </span>
      </div>

      <Button
        className="w-full gap-2"
        size="lg"
        onClick={handleSubmit}
        disabled={processing || !stripe}
      >
        {processing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4" />
            Pay Now
          </>
        )}
      </Button>
    </div>
  );
}
