'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Shield, Lock, Server, Eye, Key, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SecurityPage() {
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
              Security at TaxClip
            </h1>
            <p className="text-slate-500">Last updated: January 13, 2026</p>
          </div>

          {/* Intro */}
          <div className="mb-10">
            <Alert className="bg-cyan-50 border-cyan-200">
              <Shield className="w-6 h-6 text-cyan-600" />
              <AlertTitle className="text-lg font-bold text-slate-900">Your Data Security is Our Priority</AlertTitle>
              <AlertDescription className="text-slate-600 mt-2">
                At TaxClip, we understand that you're trusting us with sensitive financial information. We take this responsibility seriously and implement industry-leading security measures to protect your data.
              </AlertDescription>
            </Alert>
          </div>

          {/* Security Content */}
          <div className="space-y-10">
            {/* Section 1 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <Lock className="w-6 h-6 text-cyan-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">1. Encryption</h2>
              </div>
              <p className="text-slate-600 mb-4">All data is encrypted both in transit and at rest:</p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600"><strong>In Transit:</strong> All communications between your browser and our servers are encrypted using TLS 1.3 (Transport Layer Security).</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600"><strong>At Rest:</strong> Your receipt images and extracted data are encrypted using AES-256 encryption in our database and storage systems.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600"><strong>Passwords:</strong> User passwords are hashed using bcrypt with salt, ensuring they cannot be reversed or decrypted.</span>
                </li>
              </ul>
            </section>

            {/* Section 2 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <Server className="w-6 h-6 text-cyan-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">2. Infrastructure Security</h2>
              </div>
              <p className="text-slate-600 mb-4">We use trusted, enterprise-grade infrastructure providers:</p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600"><strong>Cloud Hosting:</strong> Our application is hosted on Vercel with automatic DDoS protection and global CDN.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600"><strong>Database:</strong> We use Supabase (built on AWS) with automated backups, point-in-time recovery, and row-level security.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600"><strong>File Storage:</strong> Receipt images are stored in isolated, encrypted storage buckets with strict access controls.</span>
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <Key className="w-6 h-6 text-cyan-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">3. Authentication & Access Control</h2>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600"><strong>Secure Authentication:</strong> We support email/password and Google OAuth for secure sign-in.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600"><strong>Session Management:</strong> Sessions are securely managed with automatic expiration and secure cookie handling.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600"><strong>Row-Level Security:</strong> Database policies ensure users can only access their own data—no exceptions.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600"><strong>API Security:</strong> All API endpoints are authenticated and rate-limited to prevent abuse.</span>
                </li>
              </ul>
            </section>

            {/* Section 4 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <Eye className="w-6 h-6 text-cyan-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">4. Data Privacy</h2>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600"><strong>Data Isolation:</strong> Each user's data is logically separated and inaccessible to other users.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600"><strong>No Data Selling:</strong> We never sell your personal information or receipt data to third parties.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600"><strong>Minimal Access:</strong> Only essential personnel have access to production systems, and all access is logged.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600"><strong>AI Processing:</strong> Receipt data sent to AI services for OCR is processed in real-time and not stored by third-party providers.</span>
                </li>
              </ul>
            </section>

            {/* Section 5 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <RefreshCw className="w-6 h-6 text-cyan-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">5. Backup & Recovery</h2>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600"><strong>Automated Backups:</strong> Your data is automatically backed up daily with point-in-time recovery capability.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600"><strong>Geographic Redundancy:</strong> Backups are stored in multiple geographic locations to ensure data durability.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600"><strong>Disaster Recovery:</strong> We have documented procedures to restore service quickly in case of any incident.</span>
                </li>
              </ul>
            </section>

            {/* Section 6 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-cyan-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">6. Security Monitoring</h2>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600"><strong>24/7 Monitoring:</strong> Our infrastructure is continuously monitored for security threats and anomalies.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600"><strong>Logging:</strong> All system access and API calls are logged and retained for security analysis.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600"><strong>Incident Response:</strong> We have established procedures to respond to and communicate about any security incidents.</span>
                </li>
              </ul>
            </section>

            {/* Section 7 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <Shield className="w-6 h-6 text-cyan-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">7. Payment Security</h2>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600"><strong>PCI Compliance:</strong> All payment processing is handled by PCI-DSS compliant providers (Lemon Squeezy, Stripe).</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600"><strong>No Card Storage:</strong> We never store your full credit card numbers on our servers.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600"><strong>Secure Checkout:</strong> All payment pages are served over HTTPS with additional fraud prevention measures.</span>
                </li>
              </ul>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">8. Your Security Responsibilities</h2>
              <p className="text-slate-600 mb-4">To help keep your account secure, we recommend:</p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600">Use a strong, unique password for your TaxClip account</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600">Don't share your login credentials with others</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600">Log out when using shared or public computers</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600">Keep your browser and devices updated with the latest security patches</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600">Report any suspicious activity to us immediately</span>
                </li>
              </ul>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">9. Reporting Security Issues</h2>
              <p className="text-slate-600 mb-4">
                If you discover a security vulnerability or have concerns about the security of TaxClip, please contact us immediately:
              </p>
              <Card className="bg-slate-50">
                <CardContent className="p-4">
                  <p className="text-slate-600 mb-2">
                    <strong>Email:</strong>{' '}
                    <a href="mailto:security@taxclip.co" className="text-cyan-600 hover:text-cyan-700">security@taxclip.co</a>
                  </p>
                  <p className="text-slate-600">
                    We take all security reports seriously and will respond promptly.
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">10. Questions?</h2>
              <p className="text-slate-600 mb-4">
                If you have any questions about our security practices, please don't hesitate to reach out:
              </p>
              <Card className="bg-slate-50">
                <CardContent className="p-4">
                  <p className="text-slate-600 mb-2">
                    <strong>General Support:</strong>{' '}
                    <a href="mailto:support@taxclip.co" className="text-cyan-600 hover:text-cyan-700">support@taxclip.co</a>
                  </p>
                  <p className="text-slate-600">
                    <strong>Website:</strong>{' '}
                    <a href="https://taxclip.co" className="text-cyan-600 hover:text-cyan-700">https://taxclip.co</a>
                  </p>
                </CardContent>
              </Card>
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
