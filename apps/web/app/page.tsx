import Link from "next/link";
import {
  Calendar,
  ShoppingBag,
  Users,
  ArrowRight,
  CheckCircle2,
  Zap,
  Shield,
  Clock,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Timeo</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="#features"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </Link>
            <Link
              href="#stats"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Why Timeo
            </Link>
            <Link
              href="/sign-in"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              Get Started
            </Link>
          </nav>
          {/* Mobile: simple links */}
          <div className="flex items-center gap-3 md:hidden">
            <Link
              href="/sign-in"
              className="text-sm font-medium text-muted-foreground"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm font-medium text-muted-foreground">
                <Zap className="h-4 w-4 text-primary" />
                All-in-one business platform
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Your Business,{" "}
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Simplified
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
                Manage bookings, sell products, and run your operations from a
                single platform. Built for modern service businesses that want
                to grow without the complexity.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/sign-up"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-8 text-base font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:shadow-xl sm:w-auto"
                >
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="#features"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border bg-background px-8 text-base font-semibold transition-colors hover:bg-accent sm:w-auto"
                >
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="border-t bg-muted/30 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Everything you need to run your business
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                From appointment scheduling to product sales, Timeo brings all
                your operations together.
              </p>
            </div>
            <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {/* Feature 1: Booking Management */}
              <div className="group relative rounded-2xl border bg-card p-8 shadow-sm transition-all hover:shadow-md">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Booking Management</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Let customers book appointments online. Manage schedules,
                  confirmations, and reminders - all automated.
                </p>
                <ul className="mt-4 space-y-2">
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-secondary" />
                    Online self-service booking
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-secondary" />
                    Automated confirmations
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-secondary" />
                    Calendar integration
                  </li>
                </ul>
              </div>

              {/* Feature 2: Product Commerce */}
              <div className="group relative rounded-2xl border bg-card p-8 shadow-sm transition-all hover:shadow-md">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
                  <ShoppingBag className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="text-lg font-semibold">Product Commerce</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Sell products alongside your services. Manage inventory,
                  orders, and fulfillment in one place.
                </p>
                <ul className="mt-4 space-y-2">
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-secondary" />
                    Product catalog
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-secondary" />
                    Order management
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-secondary" />
                    Real-time tracking
                  </li>
                </ul>
              </div>

              {/* Feature 3: Team Management */}
              <div className="group relative rounded-2xl border bg-card p-8 shadow-sm transition-all hover:shadow-md sm:col-span-2 lg:col-span-1">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Team Management</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Invite team members, assign roles, and manage permissions.
                  Built-in RBAC keeps your data secure.
                </p>
                <ul className="mt-4 space-y-2">
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-secondary" />
                    Role-based access control
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-secondary" />
                    Multi-tenant isolation
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-secondary" />
                    Activity audit logs
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Stats / Social Proof Section */}
        <section id="stats" className="border-t py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Trusted by growing businesses
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Join businesses that rely on Timeo to streamline their
                operations every day.
              </p>
            </div>
            <div className="mx-auto mt-16 grid max-w-4xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">500+</div>
                <div className="mt-1 text-sm font-medium text-muted-foreground">
                  Active Businesses
                </div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">50K+</div>
                <div className="mt-1 text-sm font-medium text-muted-foreground">
                  Bookings Managed
                </div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">99.9%</div>
                <div className="mt-1 text-sm font-medium text-muted-foreground">
                  Uptime
                </div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">24/7</div>
                <div className="mt-1 text-sm font-medium text-muted-foreground">
                  Real-time Sync
                </div>
              </div>
            </div>

            {/* Additional benefits */}
            <div className="mx-auto mt-20 grid max-w-4xl gap-6 sm:grid-cols-3">
              <div className="flex items-start gap-3 rounded-xl border p-6">
                <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                <div>
                  <h3 className="font-semibold">Save 10+ hours/week</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Automate repetitive admin tasks and focus on what matters.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border p-6">
                <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                <div>
                  <h3 className="font-semibold">Enterprise-grade security</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Multi-tenant isolation with role-based access control.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border p-6">
                <Zap className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                <div>
                  <h3 className="font-semibold">Real-time everything</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Live updates across all devices. Never miss a booking.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t bg-primary/5 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Ready to simplify your business?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Start for free. No credit card required. Set up in minutes.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/sign-up"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-8 text-base font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:shadow-xl sm:w-auto"
                >
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Zap className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold">Timeo</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                The all-in-one platform for bookings, commerce, and team
                management.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold">Product</h4>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link
                    href="#features"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Integrations
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold">Company</h4>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link
                    href="#"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Blog
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold">Legal</h4>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link
                    href="#"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t pt-8 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Timeo. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
