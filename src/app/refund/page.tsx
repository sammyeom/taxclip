'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, CheckCircle, XCircle, Clock, CreditCard, Mail } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
                Refund Policy
              </h1>
              <p className="text-slate-500">Last updated: February 10, 2026</p>
            </div>

            {/* Intro */}
            <div className="mb-10">
              <p className="text-slate-600 leading-relaxed">
                At TaxClip, we want you to be satisfied with our service. Since we provide a digital SaaS product, our refund policy is designed to be fair to both our users and our business.
              </p>
            </div>

            {/* Refund Policy Content */}
            <div className="space-y-10">
              {/* Section 1: Free Trial Period */}
              <section>
                <h2 className="text-xl font-bold text-slate-900 mb-4">1. Free Trial Period</h2>
                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-cyan-800 mb-2">7-Day Free Trial for New Users</h3>
                </div>
                <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                  <li>All new Pro subscribers receive a 7-day free trial period</li>
                  <li>You can cancel anytime during the trial period with no charges</li>
                  <li>The free trial is available once per account</li>
                  <li>After the trial ends, you will be charged according to your selected plan (monthly or annual)</li>
                  <li>To avoid charges, cancel at least 24 hours before the trial period ends</li>
                </ul>
              </section>

              {/* Section 2: Subscription Cancellations */}
              <section>
                <h2 className="text-xl font-bold text-slate-900 mb-4">2. Subscription Cancellations</h2>
                <p className="text-slate-600 mb-3">You can cancel your subscription at any time through:</p>
                <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4 mb-4">
                  <li><span className="font-medium text-slate-900">In-App:</span> Settings → Subscription → Change or Cancel Plan</li>
                  <li><span className="font-medium text-slate-900">Apple App Store:</span> Settings → [Your Name] → Subscriptions → TaxClip → Cancel Subscription</li>
                </ul>
                <p className="text-slate-600">
                  Upon cancellation, you will continue to have access to the paid features until the end of your current billing cycle. No further charges will be made after cancellation.
                </p>
              </section>

              {/* Section 3: Refund Eligibility */}
              <section>
                <h2 className="text-xl font-bold text-slate-900 mb-4">3. Refund Eligibility</h2>

                {/* Money-Back Guarantee */}
                <Alert className="bg-green-50 border-green-200 mb-6">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <AlertTitle className="text-green-800 font-semibold">14-Day Money-Back Guarantee</AlertTitle>
                  <AlertDescription className="text-green-700 mt-2">
                    <ul className="list-disc list-inside space-y-1">
                      <li>If you are a new subscriber (after the free trial) and are not satisfied with TaxClip, you may request a full refund within 14 days of your initial paid purchase</li>
                      <li>Upon refund approval, you will receive a full refund AND continue to have access to Pro features until the end of your current billing period</li>
                      <li>This applies to both monthly and annual subscriptions</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-slate-600">
                    <span className="font-medium text-slate-900">Example:</span> If you subscribed on February 1 and request a refund on February 10, you'll maintain Pro access until February 28/29 (for monthly) or until your annual expiration date.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Technical Issues</h3>
                    <ul className="list-disc list-inside text-slate-600 space-y-1 ml-4">
                      <li>If you experience a technical error that prevents you from using the core features of TaxClip and our support team is unable to resolve it, you may be eligible for a refund</li>
                      <li>You will retain access to Pro features during the investigation period</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Duplicate Charges</h3>
                    <p className="text-slate-600">
                      In the event of a billing error or duplicate charge, we will issue a full refund for the erroneous transaction immediately.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Subscription Downgrades</h3>
                    <ul className="list-disc list-inside text-slate-600 space-y-1 ml-4">
                      <li><span className="font-medium text-slate-900">Annual to Monthly:</span> The unused portion of your annual subscription will be converted to account credits that automatically apply to future monthly payments. You will retain Pro access during this entire period (no cash refunds)</li>
                      <li><span className="font-medium text-slate-900">Annual to Free:</span> No refunds will be issued, but you will retain Pro features until your annual subscription expires</li>
                      <li><span className="font-medium text-slate-900">Monthly to Free:</span> No refunds for the current billing cycle, but you will retain Pro features until the end of the period</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 4: Non-Refundable Circumstances */}
              <section>
                <h2 className="text-xl font-bold text-slate-900 mb-4">4. Non-Refundable Circumstances</h2>
                <p className="text-slate-600 mb-3">Refunds will generally not be provided in the following cases:</p>
                <Alert className="bg-red-50 border-red-200">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <AlertDescription className="text-red-700 mt-2">
                    <ul className="list-disc list-inside space-y-1">
                      <li>Requests made after the 14-day money-back guarantee window</li>
                      <li>Partial months of service (no pro-rated refunds for mid-month cancellations)</li>
                      <li>If you simply no longer need the service but forgot to cancel before the renewal date</li>
                      <li>Accounts that have been suspended or terminated due to a violation of our Terms of Service</li>
                      <li>Refunds for annual subscriptions downgraded to monthly (credits will be issued instead)</li>
                      <li>Second or subsequent free trial requests (one trial per account)</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </section>

              {/* Section 5: How to Request a Refund */}
              <section>
                <h2 className="text-xl font-bold text-slate-900 mb-4">5. How to Request a Refund</h2>
                <p className="text-slate-600 mb-3">
                  To request a refund, please email us at <a href="mailto:support@taxclip.co" className="text-cyan-600 font-medium hover:underline">support@taxclip.co</a> with the following information:
                </p>
                <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4 mb-4">
                  <li>Your account email address</li>
                  <li>The date of the transaction</li>
                  <li>The reason for your refund request</li>
                  <li>Any relevant screenshots or documentation (for technical issues)</li>
                </ul>
                <p className="text-slate-600">
                  We will review your request within <span className="font-medium text-slate-900">2 business days</span> and notify you of the decision.
                </p>
              </section>

              {/* Section 6: Processing Refunds */}
              <section>
                <h2 className="text-xl font-bold text-slate-900 mb-4">6. Processing Refunds</h2>
                <p className="text-slate-600 mb-4">
                  Once approved, refunds will be processed back to the original payment method used at the time of purchase:
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                  <div className="flex justify-between items-center p-4 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-600">Credit/Debit Card</span>
                    </div>
                    <span className="font-medium text-slate-900">5-10 business days</span>
                  </div>
                  <div className="flex justify-between items-center p-4 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                      </svg>
                      <span className="text-slate-600">Apple In-App Purchase</span>
                    </div>
                    <span className="font-medium text-slate-900">7-14 business days</span>
                  </div>
                  <div className="flex justify-between items-center p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-600">Account Credits (for downgrades)</span>
                    </div>
                    <span className="font-medium text-slate-900">Applied immediately</span>
                  </div>
                </div>
                <p className="text-sm text-slate-500 mt-4 italic">
                  Please note that processing times may vary depending on your bank or payment provider.
                </p>
              </section>

              {/* Section 7: Account Credits */}
              <section>
                <h2 className="text-xl font-bold text-slate-900 mb-4">7. Account Credits</h2>
                <h3 className="font-semibold text-slate-900 mb-3">What are Account Credits?</h3>
                <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4 mb-6">
                  <li>When you downgrade from an annual plan to a monthly plan, the unused portion of your annual subscription is converted to credits</li>
                  <li>Credits automatically apply to your future monthly subscription payments</li>
                  <li>Credits do not expire as long as your account remains active</li>
                  <li>Credits cannot be transferred or redeemed for cash</li>
                </ul>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                  <h4 className="font-semibold text-slate-900 mb-3">Example Calculation:</h4>
                  <div className="text-sm text-slate-600 space-y-1 mb-4">
                    <p>Annual Plan: $99/year</p>
                    <p>Subscribed: January 1, 2026</p>
                    <p>Downgrade Request: March 1, 2026 (2 months used)</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-3 font-mono text-sm mb-4">
                    <p className="text-slate-600">Used: $99 ÷ 12 × 2 = $16.50</p>
                    <p className="text-slate-600">Remaining: $99 - $16.50 = $82.50</p>
                    <p className="text-slate-900 font-semibold">Credit: $82.50</p>
                  </div>
                  <div className="text-sm text-slate-600 space-y-1 mb-4">
                    <p>Monthly Plan: $9.99/month</p>
                    <p>Free Months: $82.50 ÷ $9.99 = 8 months</p>
                    <p>Remaining Credit: $2.58</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="font-semibold text-green-800 mb-1">Result:</p>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• You'll get 8 free months of Pro</li>
                      <li>• Next charge: November 1, 2026 ($9.99)</li>
                      <li>• $2.58 credit applied to November payment</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 8: Refund Timeline Summary */}
              <section>
                <h2 className="text-xl font-bold text-slate-900 mb-4">8. Refund Timeline Summary</h2>
                <div className="overflow-x-auto">
                  <table className="w-full border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="text-left p-3 text-sm font-semibold text-slate-900">Scenario</th>
                        <th className="text-left p-3 text-sm font-semibold text-slate-900">Refund</th>
                        <th className="text-left p-3 text-sm font-semibold text-slate-900">Access</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="p-3 text-sm text-slate-600">Cancel during 7-day trial</td>
                        <td className="p-3 text-sm text-slate-600">No charge</td>
                        <td className="p-3 text-sm text-slate-600">Ends immediately</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-sm text-slate-600">Refund request within 14 days</td>
                        <td className="p-3 text-sm text-green-600 font-medium">Full refund</td>
                        <td className="p-3 text-sm text-slate-600">Until end of billing period</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-sm text-slate-600">Annual → Monthly downgrade</td>
                        <td className="p-3 text-sm text-slate-600">No refund (credits issued)</td>
                        <td className="p-3 text-sm text-slate-600">Until credits exhausted</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-sm text-slate-600">Annual → Free downgrade</td>
                        <td className="p-3 text-sm text-red-600 font-medium">No refund</td>
                        <td className="p-3 text-sm text-slate-600">Until annual expiration</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-sm text-slate-600">Monthly → Free cancellation</td>
                        <td className="p-3 text-sm text-red-600 font-medium">No refund</td>
                        <td className="p-3 text-sm text-slate-600">Until next billing date</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-sm text-slate-600">Refund request after 14 days</td>
                        <td className="p-3 text-sm text-red-600 font-medium">Not eligible</td>
                        <td className="p-3 text-sm text-slate-600">N/A</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Section 9: Questions or Concerns */}
              <section>
                <h2 className="text-xl font-bold text-slate-900 mb-4">9. Questions or Concerns?</h2>
                <p className="text-slate-600 mb-4">
                  If you have any questions about our refund policy, please contact us at:
                </p>
                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Mail className="w-5 h-5 text-cyan-600" />
                    <div>
                      <p className="text-xs text-cyan-600 uppercase font-medium">Email</p>
                      <a href="mailto:support@taxclip.co" className="text-cyan-700 font-semibold hover:underline">support@taxclip.co</a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-cyan-600" />
                    <div>
                      <p className="text-xs text-cyan-600 uppercase font-medium">Support Hours</p>
                      <p className="text-cyan-700 font-semibold">Monday-Friday, 9 AM - 6 PM EST</p>
                    </div>
                  </div>
                </div>
                <p className="text-center text-slate-600 mt-6">
                  We're here to help!
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
