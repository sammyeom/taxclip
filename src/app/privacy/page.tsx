'use client';

import Link from 'next/link';
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
              <img src="/logo.svg" alt="TaxClip" width={40} height={40} />
              <span className="text-2xl font-bold">
                <span className="text-slate-900">Tax</span>
                <span className="text-cyan-500">Clip</span>
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
              Privacy Policy
            </h1>
            <p className="text-slate-500">Last updated: 01. 13. 2026</p>
          </div>

          {/* Intro */}
          <div className="mb-10">
            <p className="text-slate-600 leading-relaxed">
              At TaxClip, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.
            </p>
          </div>

          {/* Privacy Content */}
          <div className="space-y-10">
            {/* Section 1 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">1. Information We Collect</h2>
              <p className="text-slate-600 mb-4">We collect information that you provide directly to us:</p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li><strong>Account Information:</strong> Email address, name, and password when you create an account</li>
                <li><strong>Receipt Data:</strong> Images of receipts and documents you upload, and extracted data (vendor, date, amount, category, etc.)</li>
                <li><strong>Payment Information:</strong> Billing details processed securely through our payment provider (Lemon Squeezy)</li>
                <li><strong>Usage Data:</strong> How you interact with our Service, including features used and actions taken</li>
              </ul>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">2. How We Use Your Information</h2>
              <p className="text-slate-600 mb-4">We use the information we collect to:</p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>Provide, maintain, and improve the Service</li>
                <li>Process and extract data from your uploaded receipts</li>
                <li>Process payments and manage your subscription</li>
                <li>Send you technical notices, updates, and support messages</li>
                <li>Respond to your comments and questions</li>
                <li>Analyze usage patterns to improve user experience</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">3. Data Storage and Security</h2>
              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 mb-4">
                <p className="text-cyan-800 font-medium">
                  Your data is stored securely using industry-standard encryption and security practices.
                </p>
              </div>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>All data is encrypted in transit (TLS/SSL) and at rest</li>
                <li>We use Supabase for secure database and file storage</li>
                <li>Access to user data is strictly limited to authorized personnel</li>
                <li>We regularly review and update our security practices</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">4. Data Sharing</h2>
              <p className="text-slate-600 mb-4">We do not sell your personal information. We may share your information only in the following circumstances:</p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li><strong>Service Providers:</strong> With third-party vendors who help us operate our Service (e.g., cloud hosting, payment processing, AI/OCR processing)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                <li><strong>With Your Consent:</strong> When you explicitly authorize us to share your information</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">5. Third-Party Services</h2>
              <p className="text-slate-600 mb-4">We use the following third-party services to operate TaxClip:</p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li><strong>Supabase:</strong> Database and authentication</li>
                <li><strong>OpenAI / Google Cloud Vision:</strong> AI-powered OCR and data extraction</li>
                <li><strong>Lemon Squeezy:</strong> Payment processing</li>
                <li><strong>Vercel:</strong> Website hosting</li>
              </ul>
              <p className="text-slate-600 mt-4">
                Each of these services has their own privacy policies governing the use of your information.
              </p>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">6. Your Rights</h2>
              <p className="text-slate-600 mb-4">You have the right to:</p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
                <li><strong>Correction:</strong> Request correction of inaccurate personal data</li>
                <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
                <li><strong>Export:</strong> Download your data in a portable format</li>
                <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
              </ul>
              <p className="text-slate-600 mt-4">
                To exercise these rights, please contact us at support@taxclip.co.
              </p>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">7. Data Retention</h2>
              <p className="text-slate-600 mb-4">
                We retain your data for as long as your account is active or as needed to provide the Service. If you delete your account:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>Your data will be deleted within 30 days</li>
                <li>Some data may be retained longer if required by law</li>
                <li>Anonymized, aggregated data may be retained for analytics</li>
              </ul>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">8. Cookies and Tracking</h2>
              <p className="text-slate-600 mb-4">
                We use cookies and similar technologies to:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>Keep you signed in</li>
                <li>Remember your preferences</li>
                <li>Understand how you use our Service</li>
                <li>Improve our Service based on usage patterns</li>
              </ul>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">9. Children's Privacy</h2>
              <p className="text-slate-600">
                TaxClip is not intended for use by children under the age of 18. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
              </p>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">10. Changes to This Policy</h2>
              <p className="text-slate-600">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date. Your continued use of the Service after such changes constitutes acceptance of the updated policy.
              </p>
            </section>

            {/* Section 11 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">11. Contact Us</h2>
              <p className="text-slate-600">
                If you have any questions about this Privacy Policy, please contact us at:
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
