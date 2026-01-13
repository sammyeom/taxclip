'use client';

import { motion } from 'framer-motion';
import {
  Camera,
  Tags,
  Download,
  CheckCircle2,
  Zap,
  Shield,
  TrendingUp,
  Users,
  Building2,
  UserCircle,
  Menu,
  X,
  Sparkles,
  FileText,
  Loader2
} from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SignInButton from '@/components/SignInButton';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<'monthly' | 'yearly' | null>(null);

  const router = useRouter();
  const { user } = useAuth();
  const { createCheckout } = useSubscription();

  const handleCheckout = async (plan: 'monthly' | 'yearly') => {
    if (!user) {
      // Store intended plan and redirect to sign-up
      localStorage.setItem('checkout_plan', plan);
      router.push('/sign-up?redirect=checkout');
      return;
    }

    setCheckoutLoading(plan);
    try {
      const checkoutUrl = await createCheckout(plan);
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } finally {
      setCheckoutLoading(null);
    }
  };

  // Check for pending checkout after login
  useEffect(() => {
    const pendingPlan = localStorage.getItem('checkout_plan');
    if (user && pendingPlan) {
      localStorage.removeItem('checkout_plan');
      handleCheckout(pendingPlan as 'monthly' | 'yearly');
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-white">
      {/* 1. NAVIGATION BAR (sticky) */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="TaxClip" width={36} height={36} />
              <span className="text-xl font-bold"><span className="text-slate-900">Tax</span><span className="text-cyan-500">Clip</span></span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-slate-600 hover:text-slate-900 transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-slate-600 hover:text-slate-900 transition-colors">
                Pricing
              </a>
              <Link href="/upload" className="text-slate-600 hover:text-slate-900 transition-colors">
                Upload
              </Link>
              <SignInButton />
              <Link href="/sign-up" className="gradient-btn text-white px-6 py-2 rounded-lg font-semibold shadow-md">
                Start free
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-slate-900" />
              ) : (
                <Menu className="w-6 h-6 text-slate-900" />
              )}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:hidden py-4 border-t border-slate-200"
            >
              <div className="flex flex-col gap-4">
                <a href="#features" className="text-slate-600 hover:text-slate-900 transition-colors">
                  Features
                </a>
                <a href="#pricing" className="text-slate-600 hover:text-slate-900 transition-colors">
                  Pricing
                </a>
                <Link href="/upload" className="text-slate-600 hover:text-slate-900 transition-colors">
                  Upload
                </Link>
                <SignInButton />
                <Link href="/sign-up" className="gradient-btn text-white px-6 py-2 rounded-lg font-semibold shadow-md">
                  Start free
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #ECFEFF 0%, #FFFFFF 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Content */}
            <div className="text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                {/* AI-Powered badge */}
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-100 to-sky-100 text-cyan-700 px-4 py-2 rounded-full text-sm font-semibold mb-4 border border-cyan-200">
                  <Sparkles className="w-4 h-4" />
                  <span>AI-Powered Receipt Management</span>
                </div>

                {/* Main headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
                  Stop Overpaying Taxes from Receipts, Save Thousands
                </h1>

                {/* Subheadline */}
                <p className="text-lg sm:text-xl text-slate-600 mb-8 leading-relaxed">
                  Snap a photo, and AI automatically extracts, categorizes, and prepares your receipts for export to QuickBooks and other tools. Works with receipts, invoices, screenshots, and any proof of payment.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6">
                  <Link href="/sign-up">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="gradient-btn text-white px-8 py-4 rounded-lg font-semibold text-lg shadow-lg w-full"
                    >
                      Start for free
                    </motion.button>
                  </Link>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setDemoModalOpen(true)}
                    className="border-2 border-cyan-400 hover:border-cyan-500 text-cyan-700 hover:bg-cyan-50 px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
                  >
                    Watch demo
                  </motion.button>
                </div>

                {/* Small text */}
                <p className="text-sm text-slate-500">
                  No credit card required • Free forever
                </p>
              </motion.div>
            </div>

            {/* Right side - Visual */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-8">
                <div className="grid gap-6">
                  {/* Upload area */}
                  <div className="border-2 border-dashed border-cyan-300 rounded-xl p-8 bg-gradient-to-br from-cyan-50 to-sky-50 text-center">
                    <Camera className="w-12 h-12 text-cyan-600 mx-auto mb-4" />
                    <p className="text-sm font-medium text-slate-700">Drop receipt or click to upload</p>
                  </div>

                  {/* Extracted data preview */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm text-slate-500">Vendor</span>
                      <span className="text-sm font-semibold text-slate-900">Coffee Shop Inc.</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm text-slate-500">Date</span>
                      <span className="text-sm font-semibold text-slate-900">Jan 6, 2026</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm text-slate-500">Total</span>
                      <span className="text-sm font-semibold text-slate-900">$12.50</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                      <span className="text-sm text-slate-500">Category</span>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-700">
                        <Sparkles className="w-4 h-4" />
                        Meals & Entertainment
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="absolute -top-4 -right-4 bg-gradient-to-r from-cyan-500 to-sky-500 text-white px-4 py-2 rounded-full shadow-lg text-sm font-semibold"
              >
                <span className="flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  AI in 3 seconds
                </span>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 -z-10 w-96 h-96 bg-cyan-200 rounded-full filter blur-3xl opacity-30"></div>
        <div className="absolute bottom-0 left-0 -z-10 w-96 h-96 bg-sky-300 rounded-full filter blur-3xl opacity-30"></div>
      </section>

      {/* 3. TRUST BAR */}
      <section className="bg-slate-50 py-12 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-slate-600 mb-8 font-medium">
            Trusted by thousands of founders, freelancers, and finance teams
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-12 opacity-60">
            <div className="flex items-center gap-2 text-slate-700">
              <Building2 className="w-5 h-5" />
              <span className="font-semibold">Startups</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <Users className="w-5 h-5" />
              <span className="font-semibold">Freelancers</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <UserCircle className="w-5 h-5" />
              <span className="font-semibold">Accountants</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PROBLEM SECTION */}
      <section className="py-20 sm:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
              Tax Season Shouldn't Take Late Nights
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Manual receipt tracking is broken. Here's why:
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: '📄', title: 'Receipts pile up in wallets and inboxes', desc: 'Paper fades, emails get buried, and digital clutter becomes overwhelming' },
              { icon: '⏰', title: 'You waste hours typing data into spreadsheets', desc: 'Manual data entry is tedious, error-prone, and takes away from actual work' },
              { icon: '😰', title: 'Tax season becomes a stressful scramble', desc: 'Last-minute searches through months of documents create unnecessary anxiety' },
              { icon: '💸', title: 'Important expenses slip through the cracks', desc: 'Missing receipts mean thousands in unclaimed deductions and lost money' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="bg-gradient-to-br from-cyan-50 to-sky-50 border border-cyan-100 rounded-xl p-6"
              >
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. FEATURES SECTION */}
      <section id="features" className="py-20 sm:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
              Let AI Do the Boring Work
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Snap, categorize, export—all in 3 seconds.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: <Camera className="w-8 h-8" />,
                emoji: '📸',
                title: 'Instant Receipt Capture',
                subtitle: 'Snap a photo, AI does the rest',
                desc: 'Upload any receipt, invoice, or screenshot. Advanced AI OCR reads vendor, date, total, tax, and currency in seconds.',
              },
              {
                icon: <Sparkles className="w-8 h-8" />,
                emoji: '🤖',
                title: 'AI Smart Categorization',
                subtitle: 'Intelligent AI learns your patterns',
                desc: 'AI auto-categorizes expenses into meals, transport, software, and more. Learns from your adjustments to get smarter over time.',
              },
              {
                icon: <FileText className="w-8 h-8" />,
                emoji: '📄',
                title: 'IRS-Ready Reports',
                subtitle: 'Schedule C automatically generated',
                desc: 'Schedule C automatically generated from your receipts. Export to PDF, CSV, or share with your accountant instantly. No manual calculations needed.',
              },
              {
                icon: <Download className="w-8 h-8" />,
                emoji: '📊',
                title: 'Export to Your Tools',
                subtitle: 'One-click export to accounting tools',
                desc: 'Download clean CSVs or sync directly with QuickBooks. Your accountant gets structured data, not messy image files.',
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                whileHover={{ y: -8, boxShadow: '0 20px 40px -10px rgba(6, 182, 212, 0.2)' }}
                className="bg-white rounded-xl shadow-md border border-slate-100 p-8 hover:shadow-xl transition-all relative overflow-hidden group"
              >
                {/* Gradient border effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-100 via-transparent to-sky-100 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-cyan-100 to-sky-100 text-cyan-600">
                      {feature.icon}
                    </div>
                    <span className="text-3xl">{feature.emoji}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm font-semibold text-cyan-600 mb-3">
                    {feature.subtitle}
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. EVERYTHING YOU NEED SECTION */}
      <section className="py-20 sm:py-32" style={{ background: 'linear-gradient(135deg, #ECFEFF 0%, #F0F9FF 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
              Everything You Need to Save on Taxes
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              [
                'Receipt OCR & AI Parsing',
                'Multi-Currency Support',
                'Expense Categories',
              ],
              [
                'CSV & Excel Export',
                'QuickBooks Integration',
                'Team Collaboration',
              ],
              [
                'Mobile App (iOS & Android)',
                'Email Receipt Forwarding',
                'Unlimited Storage',
              ],
            ].map((column, colIdx) => (
              <motion.div
                key={colIdx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: colIdx * 0.1 }}
                className="space-y-4"
              >
                {column.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700 font-medium">{feature}</span>
                  </div>
                ))}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. HOW IT WORKS */}
      <section className="py-20 sm:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
              From Photo to Report in Under a Minute
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { num: '1', title: 'Upload a receipt', desc: 'Drag and drop, take a photo, or forward an email. Invoices and screenshots work too.' },
              { num: '2', title: 'AI extracts and categorizes', desc: 'OCR + AI parsing reads all details and suggests smart categories.' },
              { num: '3', title: 'Review and export', desc: 'Quick review table, then export to CSV or sync with accounting tools.' },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full gradient-btn text-white text-2xl font-bold mb-4 shadow-lg">
                  {step.num}
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-slate-600">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. USE CASES */}
      <section className="py-20 sm:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
              Built for Modern Finance Workflows
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Zap className="w-6 h-6" />,
                title: 'Solo Founders & Indie Hackers',
                desc: 'Keep SaaS, ads, and travel receipts organized without spreadsheets.',
              },
              {
                icon: <Users className="w-6 h-6" />,
                title: 'Agencies & Freelancers',
                desc: 'Group receipts by client or project and stay ready for invoicing.',
              },
              {
                icon: <Shield className="w-6 h-6" />,
                title: 'Accountants & Bookkeepers',
                desc: 'Receive clean, structured data instead of folders full of PDFs.',
              },
            ].map((useCase, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="bg-white rounded-xl shadow-md border-t-4 border-t-cyan-500 border-slate-100 p-8"
              >
                <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-cyan-100 to-sky-100 text-cyan-600 mb-4">
                  {useCase.icon}
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  {useCase.title}
                </h3>
                <p className="text-slate-600">
                  {useCase.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. SOCIAL PROOF / TESTIMONIALS */}
      <section className="py-20 sm:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
              Stop Chasing Receipts at Tax Time
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              {
                quote: "I used to spend an entire weekend on receipts. With TaxClip I'm done in under an hour.",
                name: 'Alex',
                role: 'SaaS Founder',
              },
              {
                quote: 'My clients finally send me data I can import, not blurry photos.',
                name: 'Mia',
                role: 'Accountant',
              },
            ].map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="bg-gradient-to-br from-cyan-50 to-sky-50 rounded-xl border border-cyan-100 p-8"
              >
                <div className="text-4xl text-cyan-600 mb-4">"</div>
                <p className="text-slate-700 mb-6 leading-relaxed text-lg">
                  {testimonial.quote}
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full gradient-btn flex items-center justify-center text-white font-bold text-lg shadow-md">
                    {testimonial.name[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{testimonial.name}</div>
                    <div className="text-sm text-slate-600">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <p className="text-center mt-12 text-slate-600 italic">
            Designed by a founder who hates bookkeeping as much as you do.
          </p>
        </div>
      </section>

      {/* 10. PRICING SECTION */}
      <section id="pricing" className="py-20 sm:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
              Simple Pricing. No Hidden Fees.
            </h2>
            <p className="text-xl text-slate-600">
              Start free, upgrade when you're ready
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* FREE PLAN */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              whileHover={{ scale: 1.02 }}
              className="bg-white rounded-2xl shadow-md border border-slate-200 p-8"
            >
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-4">FREE</h3>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-bold text-slate-900">$0</span>
                  <span className="text-slate-600">/month</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {[
                  '10 receipts/month',
                  'Basic AI categorization',
                  'Web dashboard',
                  'Manual data entry',
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href="/sign-up">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full border-2 border-cyan-500 text-cyan-600 hover:bg-cyan-50 px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Start Free
                </motion.button>
              </Link>
            </motion.div>

            {/* PRO PLAN - HIGHLIGHTED */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="bg-white rounded-2xl shadow-2xl border-2 border-cyan-500 p-8 relative md:scale-105"
            >
              {/* Most Popular Badge */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="gradient-btn text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg">
                  Most Popular
                </span>
              </div>

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-4">PRO ⭐</h3>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-bold text-slate-900">$9.99</span>
                  <span className="text-slate-600">/month</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {[
                  'Unlimited receipts',
                  'AI tax tips & insights',
                  'IRS Schedule C reports',
                  'Email-to-receipt upload',
                  'Multi-device sync',
                  'Priority email support',
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700 font-medium">{feature}</span>
                  </li>
                ))}
              </ul>

              <motion.button
                onClick={() => handleCheckout('monthly')}
                disabled={checkoutLoading !== null}
                whileHover={{ scale: checkoutLoading ? 1 : 1.05 }}
                whileTap={{ scale: checkoutLoading ? 1 : 0.95 }}
                className="w-full gradient-btn text-white px-6 py-4 rounded-lg font-bold text-lg shadow-lg disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {checkoutLoading === 'monthly' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Start 7-Day Trial'
                )}
              </motion.button>
            </motion.div>

            {/* ANNUAL PLAN */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              whileHover={{ scale: 1.02 }}
              className="bg-white rounded-2xl shadow-md border border-slate-200 p-8 relative"
            >
              {/* Gift Badge */}
              <div className="absolute -top-3 -right-3">
                <span className="inline-flex items-center gap-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">
                  🎁 2 MONTHS FREE
                </span>
              </div>

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-4">ANNUAL</h3>
                <div className="mb-3">
                  <div className="flex items-baseline justify-center gap-2 mb-1">
                    <span className="text-2xl text-slate-400 line-through">$119.88</span>
                    <span className="text-sm text-slate-500">/year</span>
                  </div>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-5xl font-bold text-slate-900">$99</span>
                    <span className="text-slate-600">/year</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-center">
                  <p className="text-lg font-semibold text-cyan-600">
                    = $8.25/month
                  </p>
                  <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg">
                    <p className="text-lg font-bold">Save $20/year</p>
                    <p className="text-xs">12 months for the price of 10</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-semibold text-slate-700 mb-4">All Pro features, plus:</p>
              </div>

              <ul className="space-y-4 mb-8">
                {[
                  '2 months free (best value)',
                  'Priority chat support',
                  'Early access to features',
                  'Accountant collaboration',
                  'Data export & API access',
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <motion.button
                onClick={() => handleCheckout('yearly')}
                disabled={checkoutLoading !== null}
                whileHover={{ scale: checkoutLoading ? 1 : 1.05 }}
                whileTap={{ scale: checkoutLoading ? 1 : 0.95 }}
                className="w-full border-2 border-cyan-500 text-cyan-600 hover:bg-cyan-50 px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {checkoutLoading === 'yearly' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Start Annual Trial'
                )}
              </motion.button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 11. FINAL CTA */}
      <section className="py-20 sm:py-32 bg-gradient-to-br from-cyan-500 to-sky-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              Ready to Simplify Your Bookkeeping?
            </h2>
            <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
              Join thousands of founders saving time and taxes.
            </p>

            {/* Email input form */}
            <div className="max-w-md mx-auto mb-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-6 py-4 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-white"
                />
                <Link href="/sign-up">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-white text-cyan-600 hover:bg-slate-50 px-8 py-4 rounded-lg font-semibold text-lg shadow-xl transition-colors whitespace-nowrap"
                  >
                    Get started free
                  </motion.button>
                </Link>
              </div>
            </div>

            <p className="text-blue-100 text-sm">
              Free forever • No credit card required
            </p>
          </motion.div>
        </div>
      </section>

      {/* 12. DISCLAIMER */}
      <section className="py-8 bg-slate-100 border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs text-slate-500 text-center leading-relaxed">
            <span className="font-semibold text-slate-600">Disclaimer:</span> TaxClip helps you scan, organize, and export your receipts for bookkeeping and tax preparation purposes. We do not provide tax advice, prepare or file tax returns, or act as your accountant or tax advisor. All tax-related decisions should be made with a qualified, licensed professional.
          </p>
        </div>
      </section>

      {/* 13. FOOTER */}
      <footer className="bg-slate-900 text-slate-300 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src="/logo.svg" alt="TaxClip" width={36} height={36} />
                <span className="text-xl font-bold"><span className="text-white">Tax</span><span className="text-cyan-500">Clip</span></span>
              </div>
              <p className="text-sm text-slate-400 italic">
                AI-Powered Receipt Management
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <nav className="flex flex-col gap-3 text-sm">
                <a href="#features" className="hover:text-white transition-colors">Features</a>
                <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
                <a href="#" className="hover:text-white transition-colors">Integrations</a>
              </nav>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <nav className="flex flex-col gap-3 text-sm">
                <a href="#" className="hover:text-white transition-colors">About</a>
                <a href="#" className="hover:text-white transition-colors">Blog</a>
                <a href="#" className="hover:text-white transition-colors">Contact</a>
              </nav>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <nav className="flex flex-col gap-3 text-sm">
                <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                <Link href="/security" className="hover:text-white transition-colors">Security</Link>
              </nav>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-500">
              © 2026 TaxClip. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* WATCH DEMO MODAL */}
      {demoModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setDemoModalOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative"
          >
            {/* Close button */}
            <button
              onClick={() => setDemoModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Content */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-100 to-sky-100 rounded-full mb-6">
                <Sparkles className="w-8 h-8 text-cyan-600" />
              </div>

              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                Demo Coming Soon!
              </h3>

              <p className="text-slate-600 mb-6">
                We're preparing an amazing demo video. Leave your email to be notified when it's ready.
              </p>

              {/* Email form */}
              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full gradient-btn text-white px-6 py-3 rounded-lg font-semibold shadow-lg"
                >
                  Notify me when ready
                </motion.button>
              </div>

              <p className="text-xs text-slate-500 mt-4">
                We'll only email you about the demo. No spam.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
