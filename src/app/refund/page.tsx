'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-sky-50">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12">
          {/* Title */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Image src="/logo.svg" alt="TaxClip" width={40} height={40} priority />
              <span className="text-2xl font-bold">
                <span className="text-slate-900">Tax</span>
                <span className="text-cyan-500">Clip</span>
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
              Refund Policy
            </h1>
            <p className="text-slate-500">Last updated: January 14, 2026</p>
          </div>

          {/* Intro */}
          <div className="mb-10">
            <p className="text-slate-600 leading-relaxed">
              At TaxClip, we want you to be satisfied with our service. Since we provide a digital SaaS product, our refund policy is designed to be fair to both our users and our business.
            </p>
          </div>

          {/* Refund Policy Content */}
          <div className="space-y-10">
            {/* Section 1 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">1. Subscription Cancellations</h2>
              <p className="text-slate-600">
                You can cancel your subscription at any time through your account settings. Upon cancellation, you will continue to have access to the paid features until the end of your current billing cycle. No further charges will be made after cancellation.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">2. Refund Eligibility</h2>

              <div className="space-y-4">
                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                  <p className="text-cyan-800 font-medium mb-2">14-Day Money-Back Guarantee</p>
                  <p className="text-cyan-700">
                    If you are a new subscriber and are not satisfied with TaxClip, you may request a full refund within 14 days of your initial purchase.
                  </p>
                </div>

                <div>
                  <p className="text-slate-600 mb-2">
                    <span className="font-medium text-slate-900">Technical Issues:</span> If you experience a technical error that prevents you from using the core features of TaxClip (and our support team is unable to resolve it), you may be eligible for a refund.
                  </p>
                </div>

                <div>
                  <p className="text-slate-600">
                    <span className="font-medium text-slate-900">Duplicate Charges:</span> In the event of a billing error or duplicate charge, we will issue a full refund for the erroneous transaction.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">3. Non-Refundable Circumstances</h2>
              <p className="text-slate-600 mb-3">Refunds will generally not be provided in the following cases:</p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>Requests made after the 14-day window.</li>
                <li>Partial months of service (no pro-rated refunds for mid-month cancellations).</li>
                <li>If you simply no longer need the service but forgot to cancel before the renewal date.</li>
                <li>Accounts that have been suspended or terminated due to a violation of our Terms of Service.</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">4. How to Request a Refund</h2>
              <p className="text-slate-600 mb-3">
                To request a refund, please email us at <span className="text-cyan-600 font-medium">support@taxclip.co</span> with the following information:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>Your account email address</li>
                <li>The date of the transaction</li>
                <li>The reason for your refund request</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">5. Processing Refunds</h2>
              <p className="text-slate-600">
                Once approved, refunds will be processed back to the original payment method used at the time of purchase. Please note that it may take 5-10 business days for the refund to appear on your bank or credit card statement.
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-slate-500">
            © 2026 TaxClip. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
