'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
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
              TaxClip Privacy Policy
            </h1>
            <p className="text-slate-500">Last updated: January 13, 2026</p>
          </div>

          {/* Intro */}
          <div className="mb-10">
            <p className="text-slate-600 leading-relaxed mb-4">
              This Privacy Policy explains how TaxClip ("we", "us", or "our") collects, uses, stores, and protects your personal information when you use our website, mobile applications, and services (collectively, the "Service").
            </p>
            <p className="text-slate-600 leading-relaxed">
              By using TaxClip, you agree to the collection and use of information in accordance with this policy.
            </p>
          </div>

          {/* Privacy Content */}
          <div className="space-y-10">
            {/* Section 1 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">1. Information We Collect</h2>
              <p className="text-slate-600 mb-4">We collect the following types of information:</p>

              <h3 className="text-lg font-semibold text-slate-800 mb-3">A. Information You Provide Directly</h3>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4 mb-6">
                <li><strong>Account Information:</strong> Name, email address, password when you create an account.</li>
                <li><strong>Receipt Data:</strong> Images of receipts, invoices, and related documents you upload.</li>
                <li><strong>Extracted Data:</strong> Vendor names, dates, amounts, tax information, and other data extracted from your receipts via OCR and AI.</li>
                <li><strong>Payment Information:</strong> We use third-party payment processors (such as Stripe, Paddle, or Lemon Squeezy) to handle billing. We do not store your full credit card details on our servers.</li>
              </ul>

              <h3 className="text-lg font-semibold text-slate-800 mb-3">B. Information Collected Automatically</h3>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li><strong>Usage Data:</strong> Pages visited, features used, time spent, device type, browser type, IP address.</li>
                <li><strong>Cookies and Tracking Technologies:</strong> We use cookies and similar technologies to improve user experience and analyze usage patterns.</li>
              </ul>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">2. How We Use Your Information</h2>
              <p className="text-slate-600 mb-4">We use your information to:</p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>Provide, operate, and maintain the Service,</li>
                <li>Process your receipts using OCR and AI to extract data,</li>
                <li>Organize and categorize your expenses,</li>
                <li>Allow you to export your data in various formats (CSV, PDF, etc.),</li>
                <li>Communicate with you about your account, updates, and support requests,</li>
                <li>Improve and personalize the Service,</li>
                <li>Detect and prevent fraud or security issues,</li>
                <li>Comply with legal obligations.</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">3. How We Share Your Information</h2>
              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 mb-4">
                <p className="text-cyan-800 font-medium">
                  We do NOT sell your personal information to third parties.
                </p>
              </div>
              <p className="text-slate-600 mb-4">We may share your information in the following limited circumstances:</p>

              <h3 className="text-lg font-semibold text-slate-800 mb-3">A. Service Providers</h3>
              <p className="text-slate-600 mb-3">We work with trusted third-party providers to help operate the Service, including:</p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4 mb-4">
                <li>Cloud storage providers (to store your receipt images and data),</li>
                <li>OCR and AI processing services,</li>
                <li>Payment processors (Stripe, Paddle, Lemon Squeezy),</li>
                <li>Email and communication tools (for account notifications and support).</li>
              </ul>
              <p className="text-slate-600 mb-6">These providers are contractually obligated to protect your data and use it only for the purposes we specify.</p>

              <h3 className="text-lg font-semibold text-slate-800 mb-3">B. Legal Requirements</h3>
              <p className="text-slate-600 mb-6">We may disclose your information if required by law, court order, or governmental authority, or to protect the rights, property, or safety of TaxClip, our users, or others.</p>

              <h3 className="text-lg font-semibold text-slate-800 mb-3">C. Business Transfers</h3>
              <p className="text-slate-600">If TaxClip is acquired or merged with another company, your information may be transferred as part of that transaction. We will notify you if this occurs.</p>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">4. Data Retention</h2>
              <p className="text-slate-600 mb-4">We retain your personal information for as long as your account is active or as needed to provide the Service.</p>
              <p className="text-slate-600 mb-3">If you delete your account:</p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>Your receipt images and extracted data will be permanently deleted within 30 days.</li>
                <li>Some information (such as billing records) may be retained for legal or tax compliance purposes.</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">5. Your Rights and Choices</h2>
              <p className="text-slate-600 mb-4">Depending on your location, you may have the following rights:</p>

              <h3 className="text-lg font-semibold text-slate-800 mb-3">A. Access and Portability</h3>
              <p className="text-slate-600 mb-4">You can access, download, and export your data at any time through your account dashboard.</p>

              <h3 className="text-lg font-semibold text-slate-800 mb-3">B. Correction</h3>
              <p className="text-slate-600 mb-4">You can update or correct your account information and receipt data within the app.</p>

              <h3 className="text-lg font-semibold text-slate-800 mb-3">C. Deletion</h3>
              <p className="text-slate-600 mb-4">You can request deletion of your account and all associated data by contacting us at support@taxclip.co or using the account deletion feature in settings.</p>

              <h3 className="text-lg font-semibold text-slate-800 mb-3">D. Opt-Out of Marketing</h3>
              <p className="text-slate-600 mb-4">You can unsubscribe from promotional emails by clicking the "unsubscribe" link in any marketing email.</p>

              <h3 className="text-lg font-semibold text-slate-800 mb-3">E. Cookies</h3>
              <p className="text-slate-600">You can control or disable cookies through your browser settings. Note that disabling cookies may affect your ability to use certain features of the Service.</p>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">6. Data Security</h2>
              <p className="text-slate-600 mb-4">We take data security seriously and use industry-standard measures to protect your information, including:</p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4 mb-4">
                <li>Encryption of data in transit (TLS/SSL),</li>
                <li>Encryption of data at rest,</li>
                <li>Access controls and authentication,</li>
                <li>Regular security audits and monitoring.</li>
              </ul>
              <p className="text-slate-600">However, no system is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.</p>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">7. International Data Transfers</h2>
              <p className="text-slate-600 mb-4">TaxClip is based in the United States. If you access the Service from outside this country, your information may be transferred to, stored, and processed in servers located in other countries (such as the United States).</p>
              <p className="text-slate-600">By using the Service, you consent to such transfers. We ensure that appropriate safeguards (such as Standard Contractual Clauses) are in place to protect your data.</p>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">8. Children's Privacy</h2>
              <p className="text-slate-600">TaxClip is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected data from a child, we will delete it promptly.</p>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">9. Third-Party Links and Services</h2>
              <p className="text-slate-600">The Service may contain links to third-party websites or integrations (such as accounting software). We are not responsible for the privacy practices of these third parties. Please review their privacy policies before providing any information.</p>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">10. Changes to This Privacy Policy</h2>
              <p className="text-slate-600 mb-4">We may update this Privacy Policy from time to time. If we make significant changes, we will notify you via email or through a notice on the Service.</p>
              <p className="text-slate-600">Your continued use of the Service after changes are posted means you accept the updated policy.</p>
            </section>

            {/* Section 11 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">11. Contact Us</h2>
              <p className="text-slate-600 mb-4">If you have any questions about this Privacy Policy or how we handle your data, please contact us:</p>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-slate-600 mb-2">
                  <strong>Email:</strong>{' '}
                  <a href="mailto:support@taxclip.co" className="text-cyan-600 hover:text-cyan-700">support@taxclip.co</a>
                </p>
                <p className="text-slate-600">
                  <strong>Website:</strong>{' '}
                  <a href="https://taxclip.co" className="text-cyan-600 hover:text-cyan-700">https://taxclip.co</a>
                </p>
              </div>
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
