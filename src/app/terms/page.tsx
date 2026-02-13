'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function TermsPage() {
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <Card className="shadow-xl">
          <CardContent className="p-6 sm:p-8 lg:p-12">
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
              TaxClip Terms of Service
            </h1>
            <p className="text-slate-500">Last updated: February 13, 2026</p>
          </div>

          {/* Intro */}
          <div className="mb-10">
            <p className="text-slate-600 leading-relaxed">
              Welcome to TaxClip. These Terms of Service ("Terms") govern your access to and use of the TaxClip website, apps, and related services (collectively, the "Service"). By using TaxClip, you agree to these Terms.
            </p>
          </div>

          {/* Terms Content */}
          <div className="space-y-10">
            {/* Section 1 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">1. Description of Service</h2>
              <p className="text-slate-600 mb-4">
                TaxClip is a software-as-a-service (SaaS) tool that helps users digitize, organize, and export receipt and expense data.
              </p>
              <p className="text-slate-600 mb-3">The Service includes:</p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>Scanning receipts and documents using OCR technology,</li>
                <li>Extracting basic data such as date, amount, vendor, tax, and currency,</li>
                <li>Categorizing expenses,</li>
                <li>Providing dashboards and export options (CSV, Excel, PDF, and integrations with accounting tools).</li>
              </ul>
              <p className="text-slate-600 mt-4 font-medium">
                TaxClip is a data management and bookkeeping assistance tool only.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">2. No Tax, Legal, or Financial Advice</h2>
              <Alert className="bg-amber-50 border-amber-200 mb-4">
                <AlertDescription>
                  <p className="text-amber-800 font-medium mb-3">TaxClip does NOT provide:</p>
                  <ul className="list-disc list-inside text-amber-800 space-y-1 ml-2">
                    <li>Tax advice or recommendations,</li>
                    <li>Legal advice,</li>
                    <li>Accounting services,</li>
                    <li>Tax preparation or filing services,</li>
                    <li>Financial planning or investment advice.</li>
                  </ul>
                </AlertDescription>
              </Alert>
              <p className="text-slate-600 mb-4">
                Any information provided within the Service (including tips, examples, or educational content) is for general informational purposes only and should not be considered tax, legal, or financial advice.
              </p>
              <p className="text-slate-600 mb-4">
                You are solely responsible for your own tax filings, compliance, and financial decisions.
              </p>
              <p className="text-slate-600 font-medium">
                You should always consult a qualified and licensed tax professional, accountant, or financial advisor for advice specific to your situation.
              </p>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">3. User Responsibilities</h2>
              <p className="text-slate-600 mb-3">You are responsible for:</p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>The accuracy and completeness of any data or documents you upload,</li>
                <li>Reviewing all data before using it for bookkeeping or tax purposes,</li>
                <li>Complying with all applicable tax laws and regulations in your jurisdiction.</li>
              </ul>
              <p className="text-slate-600 mt-4">
                TaxClip is not responsible for any penalties, losses, or damages arising from your use of the Service or from inaccurate or incomplete data.
              </p>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">4. Account and Access</h2>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>You must provide accurate information when creating an account.</li>
                <li>You are responsible for maintaining the security of your login credentials.</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">5. Subscription and Billing</h2>

              <h3 className="text-lg font-semibold text-slate-800 mb-3">5.1 Plans and Billing</h3>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4 mb-6">
                <li>Paid plans are billed on a recurring basis (monthly or annually) until cancelled.</li>
                <li>Annual subscriptions are billed upfront for a 12-month period.</li>
              </ul>

              <h3 className="text-lg font-semibold text-slate-800 mb-3">5.2 Annual Subscription Refund Policy</h3>
              <Alert className="bg-amber-50 border-amber-200 mb-4">
                <AlertDescription>
                  <p className="text-amber-800 font-medium">Annual subscriptions are non-refundable.</p>
                  <p className="text-amber-700 mt-2">If you cancel your subscription, you will retain access to Pro features until the end of your current billing period.</p>
                </AlertDescription>
              </Alert>

              <h3 className="text-lg font-semibold text-slate-800 mb-3">5.3 Cancellation</h3>
              <p className="text-slate-600 mb-3">You may cancel your subscription at any time through:</p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4 mb-4">
                <li><span className="font-medium text-slate-700">iOS:</span> Settings → Apple ID → Subscriptions</li>
                <li><span className="font-medium text-slate-700">Android:</span> Google Play → Subscriptions</li>
                <li><span className="font-medium text-slate-700">Web:</span> Account Settings → Manage Subscription</li>
              </ul>
              <p className="text-slate-600 mb-3">Upon cancellation:</p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4 mb-6">
                <li>No further charges will be made</li>
                <li>Pro access continues until the end of your paid period</li>
                <li>Your data remains accessible</li>
                <li>You may resubscribe at any time</li>
              </ul>

              <h3 className="text-lg font-semibold text-slate-800 mb-3">5.4 Billing Cycle Changes</h3>
              <p className="text-slate-600 mb-3">If you change from Annual to Monthly:</p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>The change takes effect at the end of your current Annual period</li>
                <li>No refund or credit is provided for the remaining time</li>
                <li>You continue to enjoy Annual benefits until your period ends</li>
                <li>Monthly billing ($9.99/month) starts automatically after your Annual period expires</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">6. Limitation of Liability</h2>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>TaxClip is provided "as is" without warranties of any kind.</li>
                <li>To the maximum extent permitted by law, TaxClip is not liable for indirect, incidental, or consequential damages.</li>
              </ul>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">7. Changes to the Service and Terms</h2>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>We may update the Service or these Terms from time to time.</li>
                <li>Continued use of the Service after changes means you accept the updated Terms.</li>
              </ul>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">8. Contact</h2>
              <p className="text-slate-600">
                If you have any questions about these Terms, you can contact us at:
              </p>
              <p className="text-cyan-600 font-medium mt-2">
                support@taxclip.co
              </p>
            </section>
          </div>
          </CardContent>
        </Card>
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
