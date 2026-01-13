'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

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
              Terms of Service
            </h1>
            <p className="text-slate-500">Last updated: January 13, 2026</p>
          </div>

          {/* Terms Content */}
          <div className="prose prose-slate max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-slate-600 mb-4">
                By accessing or using TaxClip ("Service"), you agree to be bound by these Terms of Service ("Terms").
                If you do not agree to these Terms, please do not use the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">2. Description of Service</h2>
              <p className="text-slate-600 mb-4">
                TaxClip is an AI-powered receipt management platform that helps users scan, organize, and export
                receipts for bookkeeping and tax preparation purposes. The Service includes:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>Receipt scanning and OCR (Optical Character Recognition)</li>
                <li>AI-powered expense categorization</li>
                <li>Data export in various formats (CSV, PDF)</li>
                <li>Integration with accounting software</li>
                <li>Cloud storage for receipt images and data</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">3. Not Tax or Legal Advice</h2>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-amber-800 font-medium">
                  TaxClip does NOT provide tax advice, prepare or file tax returns, or act as your accountant
                  or tax advisor. All tax-related decisions should be made with a qualified, licensed professional.
                </p>
              </div>
              <p className="text-slate-600">
                The categorization suggestions, reports, and any other information provided by the Service are
                for organizational purposes only and should not be construed as professional tax or financial advice.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">4. User Accounts</h2>
              <p className="text-slate-600 mb-4">To use certain features of the Service, you must:</p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>Create an account with accurate and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Promptly notify us of any unauthorized access</li>
                <li>Be responsible for all activities under your account</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">5. Subscription and Billing</h2>
              <p className="text-slate-600 mb-4">
                TaxClip offers both free and paid subscription plans:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li><strong>Free Plan:</strong> Limited to 10 receipts per month with basic features</li>
                <li><strong>Pro Plan:</strong> Unlimited receipts with advanced features, billed monthly or annually</li>
              </ul>
              <p className="text-slate-600 mt-4">
                Paid subscriptions will automatically renew unless cancelled before the renewal date.
                You may cancel your subscription at any time through your account settings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">6. Refund Policy</h2>
              <p className="text-slate-600 mb-4">
                We offer a 7-day free trial for new Pro subscribers. After the trial period, payments are non-refundable
                except as required by law. If you cancel during the trial period, you will not be charged.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">7. User Content and Data</h2>
              <p className="text-slate-600 mb-4">
                You retain ownership of all receipts, images, and data you upload to TaxClip ("User Content").
                By using the Service, you grant us a limited license to:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>Store and process your User Content to provide the Service</li>
                <li>Create backups for data protection</li>
                <li>Use anonymized, aggregated data to improve our AI and services</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">8. Prohibited Uses</h2>
              <p className="text-slate-600 mb-4">You agree not to:</p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>Use the Service for any illegal purpose</li>
                <li>Upload fraudulent or falsified receipts</li>
                <li>Attempt to gain unauthorized access to the Service</li>
                <li>Interfere with or disrupt the Service</li>
                <li>Reverse engineer or attempt to extract the source code</li>
                <li>Use automated systems to access the Service without permission</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">9. Intellectual Property</h2>
              <p className="text-slate-600">
                The Service, including its original content, features, and functionality, is owned by TaxClip
                and is protected by international copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">10. Disclaimer of Warranties</h2>
              <p className="text-slate-600 mb-4">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
                EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>Accuracy of OCR or AI categorization</li>
                <li>Uninterrupted or error-free operation</li>
                <li>Fitness for a particular purpose</li>
                <li>Security or availability of data</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">11. Limitation of Liability</h2>
              <p className="text-slate-600">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, TAXCLIP SHALL NOT BE LIABLE FOR ANY INDIRECT,
                INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO
                LOSS OF PROFITS, DATA, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR USE OF THE SERVICE.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">12. Data Retention</h2>
              <p className="text-slate-600">
                We retain your data for as long as your account is active or as needed to provide the Service.
                You may request deletion of your account and associated data at any time. Upon account deletion,
                we will remove your data within 30 days, except as required by law.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">13. Changes to Terms</h2>
              <p className="text-slate-600">
                We reserve the right to modify these Terms at any time. We will notify you of material changes
                by posting the updated Terms on this page and updating the "Last updated" date. Your continued
                use of the Service after such changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">14. Termination</h2>
              <p className="text-slate-600">
                We may terminate or suspend your account and access to the Service immediately, without prior
                notice, for conduct that we believe violates these Terms or is harmful to other users, us,
                or third parties, or for any other reason at our sole discretion.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">15. Governing Law</h2>
              <p className="text-slate-600">
                These Terms shall be governed by and construed in accordance with the laws of the State of California,
                United States, without regard to its conflict of law provisions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">16. Contact Us</h2>
              <p className="text-slate-600">
                If you have any questions about these Terms, please contact us at:
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
