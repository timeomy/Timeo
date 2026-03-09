import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - Timeo",
  description: "Timeo terms of service — the rules and guidelines for using our platform.",
};

export default function TermsOfServicePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-zinc-300">
      <h1 className="mb-8 text-3xl font-bold text-white">Terms of Service</h1>
      <p className="mb-4 text-sm text-zinc-500">Last updated: 6 March 2026</p>

      <section className="space-y-6 leading-relaxed">
        <div>
          <h2 className="mb-3 text-xl font-semibold text-white">1. Acceptance of Terms</h2>
          <p>
            By accessing or using Timeo (&quot;the Platform&quot;), you agree to be bound by these
            Terms of Service. If you do not agree to these terms, please do not use the Platform.
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-semibold text-white">2. Description of Service</h2>
          <p>
            Timeo is a multi-tenant business operating system that connects customers with
            service-based and retail businesses. The Platform enables appointment booking, product
            browsing, payment processing, loyalty rewards, and membership management.
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-semibold text-white">3. User Accounts</h2>
          <ul className="ml-6 list-disc space-y-1">
            <li>You must provide accurate and complete registration information</li>
            <li>You are responsible for maintaining the security of your account credentials</li>
            <li>You must be at least 18 years old to create an account</li>
            <li>One person may not maintain more than one account</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-semibold text-white">4. Bookings and Orders</h2>
          <p>
            When you make a booking or place an order through Timeo, you enter into a direct
            arrangement with the business providing the service or product. Timeo acts as an
            intermediary platform and is not a party to the transaction between you and the business.
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-semibold text-white">5. Payments</h2>
          <p>
            Payments are processed through Revenue Monster, a licensed payment gateway. By making a
            payment, you agree to the payment processor&apos;s terms of service. All prices are
            displayed in Malaysian Ringgit (MYR) unless otherwise stated.
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-semibold text-white">6. Cancellations and Refunds</h2>
          <p>
            Cancellation and refund policies are set by individual businesses on the Platform. Please
            review the specific business&apos;s policy before making a booking or purchase. Timeo is
            not responsible for refund disputes between customers and businesses.
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-semibold text-white">7. Prohibited Activities</h2>
          <ul className="ml-6 list-disc space-y-1">
            <li>Using the Platform for any unlawful purpose</li>
            <li>Attempting to gain unauthorised access to any part of the Platform</li>
            <li>Interfering with the proper functioning of the Platform</li>
            <li>Creating fake accounts or providing false information</li>
            <li>Harassing businesses or other users through the Platform</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-semibold text-white">8. Limitation of Liability</h2>
          <p>
            Timeo provides the Platform on an &quot;as is&quot; basis. We do not guarantee the quality,
            suitability, or availability of services offered by businesses on the Platform. Our
            liability is limited to the maximum extent permitted by Malaysian law.
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-semibold text-white">9. Governing Law</h2>
          <p>
            These Terms are governed by the laws of Malaysia. Any disputes shall be subject to the
            exclusive jurisdiction of the courts of Malaysia.
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-semibold text-white">10. Contact</h2>
          <p>
            For questions about these Terms, contact us at{" "}
            <a href="mailto:legal@timeo.my" className="text-amber-500 hover:underline">
              legal@timeo.my
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
