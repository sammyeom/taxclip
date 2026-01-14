'use client';

import Link from 'next/link';
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
              <img src="/logo.svg" alt="TaxClip" width={40} height={40} />
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
              At TaxClip, we strive to provide a valuable service to help you manage your receipts and expenses efficiently. We want you to be completely satisfied with your purchase. Please read our refund policy carefully before making a purchase.
            </p>
          </div>

          {/* Refund Policy Content */}
          <div className="space-y-10">
            {/* Section 1 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">1. Free Trial</h2>
              <p className="text-slate-600 mb-4">
                TaxClip offers a free tier that allows you to try our service before committing to a paid subscription. We encourage all users to fully explore our free features to ensure TaxClip meets your needs before upgrading to a paid plan.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">2. Subscription Refunds</h2>
              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 mb-4">
                <p className="text-cyan-800 font-medium">
                  We offer a 7-day money-back guarantee for all new paid subscriptions.
                </p>
              </div>
              <p className="text-slate-600 mb-4">
                If you are not satisfied with your paid subscription, you may request a full refund within 7 days of your initial purchase. After the 7-day period, subscription fees are non-refundable.
              </p>
              <p className="text-slate-600 mb-3">To be eligible for a refund:</p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>The refund request must be made within 7 days of the initial subscription purchase,</li>
                <li>This is your first paid subscription with TaxClip,</li>
                <li>You have not previously received a refund from TaxClip.</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">3. Renewal Refunds</h2>
              <p className="text-slate-600 mb-4">
                Subscription renewals (monthly or annual) are not eligible for refunds. If you do not wish to continue your subscription, please cancel before the renewal date to avoid being charged.
              </p>
              <p className="text-slate-600">
                You can cancel your subscription at any time from your account settings. Your access will continue until the end of your current billing period.
              </p>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">4. How to Request a Refund</h2>
              <p className="text-slate-600 mb-3">To request a refund, please:</p>
              <ol className="list-decimal list-inside text-slate-600 space-y-2 ml-4">
                <li>Email us at <span className="text-cyan-600 font-medium">support@taxclip.co</span></li>
                <li>Include your account email address and the reason for your refund request</li>
                <li>We will process your request within 5-7 business days</li>
              </ol>
              <p className="text-slate-600 mt-4">
                Refunds will be credited to the original payment method used for the purchase.
              </p>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">5. Exceptions</h2>
              <p className="text-slate-600 mb-3">Refunds may not be granted in the following circumstances:</p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>Violation of our Terms of Service,</li>
                <li>Fraudulent or abusive use of the refund policy,</li>
                <li>Requests made after the 7-day refund period,</li>
                <li>Subscription renewals (monthly or annual).</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">6. Changes to This Policy</h2>
              <p className="text-slate-600">
                We reserve the right to modify this refund policy at any time. Changes will be effective immediately upon posting to this page. Your continued use of the Service after any changes indicates your acceptance of the updated policy.
              </p>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">7. Contact Us</h2>
              <p className="text-slate-600">
                If you have any questions about our refund policy, please contact us at:
              </p>
              <p className="text-cyan-600 font-medium mt-2">
                support@taxclip.co
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
