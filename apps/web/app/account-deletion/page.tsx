import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Delete Account - Timeo",
  description: "Request deletion of your Timeo account and associated data.",
};

export default function AccountDeletionPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-zinc-300">
      <h1 className="mb-8 text-3xl font-bold text-white">Account & Data Deletion</h1>

      <section className="space-y-6 leading-relaxed">
        <p>
          You can request deletion of your Timeo account and all associated personal data. Once
          processed, this action is irreversible.
        </p>

        <div>
          <h2 className="mb-3 text-xl font-semibold text-white">What Gets Deleted</h2>
          <ul className="ml-6 list-disc space-y-1">
            <li>Your account profile and login credentials</li>
            <li>Booking and appointment history</li>
            <li>Order and transaction records</li>
            <li>Loyalty points and membership data</li>
            <li>Saved preferences and settings</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-semibold text-white">What May Be Retained</h2>
          <p>
            We may retain certain data as required by Malaysian law, including transaction records for
            tax and accounting purposes (up to 7 years as required by the Income Tax Act 1967).
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-semibold text-white">How to Request Deletion</h2>
          <div className="space-y-3">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <h3 className="mb-2 font-medium text-white">Option 1: In-App</h3>
              <p>Go to Settings → Account → Delete Account in the Timeo mobile app.</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <h3 className="mb-2 font-medium text-white">Option 2: Email</h3>
              <p>
                Send an email to{" "}
                <a href="mailto:privacy@timeo.my" className="text-amber-500 hover:underline">
                  privacy@timeo.my
                </a>{" "}
                with the subject line &quot;Account Deletion Request&quot; from the email address
                associated with your account.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-semibold text-white">Processing Time</h2>
          <p>
            Account deletion requests are processed within 30 days. You will receive an email
            confirmation once your account and data have been deleted.
          </p>
        </div>
      </section>
    </main>
  );
}
