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
  Sparkles,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <header className="glass-nav sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary glow-yellow-sm">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">Timeo</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
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
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:brightness-110 glow-yellow-sm"
            >
              Get Started
            </Link>
          </nav>
          <div className="flex items-center gap-3 md:hidden">
            <Link
              href="/sign-in"
              className="text-sm font-medium text-muted-foreground"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 mesh-gradient" />
          <div className="absolute inset-0 -z-10 grid-pattern" />
          <div className="mx-auto max-w-7xl px-4 py-28 sm:px-6 sm:py-36 lg:px-8 lg:py-44">
            <div className="mx-auto max-w-3xl text-center">
              <div className="glass-button mb-8 inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                All-in-one business platform
              </div>
              <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
                Your Business,{" "}
                <span className="bg-gradient-to-r from-primary via-yellow-300 to-primary bg-clip-text text-transparent text-glow">
                  Simplified
                </span>
              </h1>
              <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                Manage bookings, sell products, and run your operations from a
                single platform. Built for modern service businesses.
              </p>
              <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/sign-up"
                  className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground shadow-lg transition-all hover:brightness-110 glow-yellow sm:w-auto"
                >
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="#features"
                  className="glass-button inline-flex h-13 w-full items-center justify-center gap-2 text-base font-semibold text-foreground sm:w-auto"
                >
                  Learn More
                </Link>
              </div>
            </div>
          </div>

          {/* Fade divider */}
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </section>

        {/* Features Section */}
        <section id="features" className="relative py-28 sm:py-36">
          <div className="absolute inset-0 -z-10 mesh-gradient opacity-50" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Everything you need
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                From scheduling to sales, Timeo brings all your operations
                together.
              </p>
            </div>
            <div className="mx-auto mt-16 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* Feature 1 */}
              <div className="glass-card p-8">
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Booking Management</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Let customers book appointments online. Manage schedules,
                  confirmations, and reminders automatically.
                </p>
                <ul className="mt-5 space-y-2.5">
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-primary" />
                    Online self-service booking
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-primary" />
                    Automated confirmations
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-primary" />
                    Calendar integration
                  </li>
                </ul>
              </div>

              {/* Feature 2 */}
              <div className="glass-card p-8">
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                  <ShoppingBag className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Product Commerce</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Sell products alongside your services. Manage inventory,
                  orders, and fulfillment in one place.
                </p>
                <ul className="mt-5 space-y-2.5">
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-primary" />
                    Product catalog
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-primary" />
                    Order management
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-primary" />
                    Real-time tracking
                  </li>
                </ul>
              </div>

              {/* Feature 3 */}
              <div className="glass-card p-8 sm:col-span-2 lg:col-span-1">
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Team Management</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Invite team members, assign roles, and manage permissions with
                  built-in RBAC.
                </p>
                <ul className="mt-5 space-y-2.5">
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-primary" />
                    Role-based access control
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-primary" />
                    Multi-tenant isolation
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-primary" />
                    Activity audit logs
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </section>

        {/* Stats Section */}
        <section id="stats" className="relative py-28 sm:py-36">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Trusted by growing businesses
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Join businesses that rely on Timeo to streamline their operations.
              </p>
            </div>
            <div className="mx-auto mt-16 grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { value: "500+", label: "Active Businesses" },
                { value: "50K+", label: "Bookings Managed" },
                { value: "99.9%", label: "Uptime" },
                { value: "24/7", label: "Real-time Sync" },
              ].map((stat) => (
                <div key={stat.label} className="glass-card p-6 text-center">
                  <div className="text-4xl font-bold text-primary text-glow">
                    {stat.value}
                  </div>
                  <div className="mt-2 text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Benefits */}
            <div className="mx-auto mt-20 grid max-w-4xl gap-6 sm:grid-cols-3">
              <div className="glass-card flex items-start gap-4 p-6">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Save 10+ hours/week</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Automate repetitive admin tasks and focus on what matters.
                  </p>
                </div>
              </div>
              <div className="glass-card flex items-start gap-4 p-6">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Enterprise security</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Multi-tenant isolation with role-based access control.
                  </p>
                </div>
              </div>
              <div className="glass-card flex items-start gap-4 p-6">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Real-time everything</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Live updates across all devices. Never miss a booking.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </section>

        {/* CTA Section */}
        <section className="relative py-28 sm:py-36">
          <div className="absolute inset-0 -z-10 mesh-gradient" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="glass mx-auto max-w-2xl p-12 text-center sm:p-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Ready to simplify your business?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Start for free. No credit card required. Set up in minutes.
              </p>
              <div className="mt-10">
                <Link
                  href="/sign-up"
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-primary px-10 text-base font-semibold text-primary-foreground shadow-lg transition-all hover:brightness-110 glow-yellow"
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
      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Zap className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold tracking-tight">Timeo</span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                The all-in-one platform for bookings, commerce, and team
                management.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Product</h4>
              <ul className="mt-4 space-y-3">
                <li>
                  <Link href="#features" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                    Integrations
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Company</h4>
              <ul className="mt-4 space-y-3">
                <li>
                  <Link href="#" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Legal</h4>
              <ul className="mt-4 space-y-3">
                <li>
                  <Link href="#" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-white/[0.06] pt-8 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Timeo. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
