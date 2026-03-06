import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Timeo",
  description: "Timeo privacy policy — how we collect, use, and protect your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-zinc-300">
      <h1 className="mb-8 text-3xl font-bold text-white">Privacy Policy</h1>
      <p className="mb-4 text-sm text-zinc-500">Last updated: 6 March 2026</p>

      <section className="space-y-6 leading-relaxed">
        <div>
          <h2 className="mb-3 text-xl font-semibold text-white">1. Introduction</h2>
          <p>
            Timeo (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the timeo.my website and Timeo
            mobile applications. This Privacy Policy explains how we collect, use, disclose, and
            safeguard your information when you use our platform.
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-semibold text-white">2. Information We Collect</h2>
          <p className="mb-2">We collect information you provide directly:</p>
          <ul className="ml-6 list-disc space-y-1">
            <li>Account information (name, email address, phone number)</li>
            <li>Profile information (profile picture, preferences)</li>
            <li>Booking and appointment details</li>
            <li>Transaction and payment records</li>
            <li>Communications with businesses through the platform</li>
          </ul>
          <p className="mt-3 mb-2">We automatically collect:</p>
          <ul className="ml-6 list-disc space-y-1">
            <li>Device information (device type, operating system, unique identifiers)</li>
            <li>Usage data (pages visited, features used, time spent)</li>
            <li>Location data (with your permission, for finding nearby businesses)</li>
            <li>Log data (IP address, browser type, access times)</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-semibold text-white">3. How We Use Your Information</h2>
          <ul className="ml-6 list-disc space-y-1">
            <li>To provide and maintain our services</li>
            <li>To process bookings, orders, and payments</li>
            <li>To manage your loyalty rewards and memberships</li>
            <li>To send booking confirmations and reminders</li>
            <li>To improve and personalise your experience</li>
            <li>To communicate service updates and promotions (with your consent)</li>
            <li>To ensure platform security and prevent fraud</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-semibold text-white">4. Information Sharing</h2>
          <p>
            We share your information with businesses on our platform only as necessary to fulfil your
            bookings and orders. We do not sell your personal information to third parties. We may share
            data with service providers who assist in operating our platform (payment processors,
            hosting providers, analytics services).
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-semibold text-white">5. Payment Security</h2>
          <p>
            Payment processing is handled by Revenue Monster, a licensed payment gateway in Malaysia.
            We do not store your full credit card or bank account numbers. All payment transactions are
            encrypted using industry-standard TLS encryption.
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-semibold text-white">6. Data Retention</h2>
          <p>
            We retain your personal information for as long as your account is active or as needed to
            provide services. You may request deletion of your account and associated data at any time
            by contacting us.
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-semibold text-white">7. Your Rights</h2>
          <p>Under the Personal Data Protection Act 2010 (PDPA) of Malaysia, you have the right to:</p>
          <ul className="ml-6 list-disc space-y-1">
            <li>Access your personal data</li>
            <li>Correct inaccurate personal data</li>
            <li>Withdraw consent for data processing</li>
            <li>Request deletion of your personal data</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-semibold text-white">8. Children&apos;s Privacy</h2>
          <p>
            Our services are not directed to individuals under the age of 18. We do not knowingly
            collect personal information from children.
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-semibold text-white">9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes by
            posting the new policy on this page and updating the &quot;Last updated&quot; date.
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-semibold text-white">10. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us at{" "}
            <a href="mailto:privacy@timeo.my" className="text-amber-500 hover:underline">
              privacy@timeo.my
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
