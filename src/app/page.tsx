'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  Download,
  CheckCircle2,
  Users,
  Building2,
  UserCircle,
  Menu,
  X,
  Sparkles,
  Loader2,
  Upload,
  Wand2,
  FileCheck,
  Camera,
  Tags,
  FileX,
  Clock,
  SearchX,
  CircleDollarSign,
  Briefcase,
  Rocket,
  Calculator,
  ChevronDown,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SignInButton from '@/components/SignInButton';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import HeroRitual from '@/components/landing/HeroRitual';

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<'monthly' | 'yearly' | null>(null);
  const [ctaEmail, setCtaEmail] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
              <Image src="/logo.svg" alt="TaxClip" width={36} height={36} priority />
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
              <SignInButton />
              <Link href="/upload" className="gradient-btn text-white px-6 py-2 rounded-lg font-semibold shadow-md flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Receipt
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
                <SignInButton />
                <Link href="/upload" className="gradient-btn text-white px-6 py-2 rounded-lg font-semibold shadow-md flex items-center gap-2 justify-center">
                  <Upload className="w-4 h-4" />
                  Upload Receipt
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
                  Done with your weekly receipts in 5 minutes
                </h1>

                {/* Subheadline */}
                <p className="text-lg sm:text-xl text-slate-600 mb-8 leading-relaxed">
                  Don't spend your weekend wrestling with receipts.<br />
                  Just snap a photo, and let TaxClip's system handle the rest.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6">
                  <Link href="/sign-up">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="gradient-btn text-white px-8 py-4 rounded-lg font-semibold text-lg shadow-lg w-full"
                    >
                      Start your 5-minute ritual
                    </motion.button>
                  </Link>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setDemoModalOpen(true)}
                    className="border-2 border-cyan-400 hover:border-cyan-500 text-cyan-700 hover:bg-cyan-50 px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
                  >
                    Watch Demo
                  </motion.button>
                </div>

                {/* Checklist */}
                <div className="flex flex-col sm:flex-row gap-4 text-sm text-slate-600">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    No credit card required
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Free forever for individuals
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Export to QuickBooks & Excel
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Right side - Interactive 5-Minute Flow Animation */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex justify-center lg:justify-end"
            >
              <HeroRitual />
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
              Manual Receipt Tracking is Broken
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                icon: FileX,
                title: 'Paper fades, emails get buried',
                desc: 'Receipts disappear when you need them most',
                bg: 'bg-red-100',
                color: 'text-red-600',
              },
              {
                icon: Clock,
                title: 'Manual entry wastes hours',
                desc: 'Tedious data entry takes away from actual work',
                bg: 'bg-orange-100',
                color: 'text-orange-600',
              },
              {
                icon: SearchX,
                title: 'Last-minute panic during month-end',
                desc: 'Searching through months of documents creates anxiety',
                bg: 'bg-rose-100',
                color: 'text-rose-600',
              },
              {
                icon: CircleDollarSign,
                title: 'Lost receipts = Lost reimbursements',
                desc: 'Missing documentation means money left on the table',
                bg: 'bg-amber-100',
                color: 'text-amber-600',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="group relative"
              >
                {/* Hover glow effect */}
                <div
                  className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-orange-200 via-amber-100 to-orange-200 opacity-0 group-hover:opacity-60 blur-xl transition-opacity duration-500"
                  style={{ transform: 'translateZ(0)' }}
                />
                <Card className="relative h-full border-slate-200 bg-white/90 backdrop-blur-sm transition-all duration-300 group-hover:border-orange-200/50">
                  <CardContent className="p-6 sm:p-8">
                    <div className={`inline-flex p-3 rounded-xl ${item.bg} mb-5`}>
                      <item.icon className={`w-6 h-6 ${item.color}`} strokeWidth={1.5} />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FEATURES SECTION */}
      <section id="features" className="py-20 sm:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              Enjoy Your Weekends, Leave the Ritual to Us
            </h2>
            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
              Turn messy paperwork into a 5-minute habit and keep your free time for what matters most.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                icon: Wand2,
                title: 'Forget Manual Entry',
                desc: 'Our system automatically sorts every detail. No more typing dates or amounts by hand.',
                color: 'text-violet-600',
                bg: 'bg-violet-100',
                gradient: 'from-violet-400 via-purple-400 to-indigo-400',
              },
              {
                icon: FileCheck,
                title: 'Tax-Ready in One Click',
                desc: 'Generate perfect reports for your accountant. One button, and your tax prep for the month is done.',
                color: 'text-emerald-600',
                bg: 'bg-emerald-100',
                gradient: 'from-emerald-400 via-teal-400 to-cyan-400',
              },
              {
                icon: Camera,
                title: 'Snap, Forward, or Drag',
                desc: 'Paper receipts, email invoices, or digital files—everything flows into one organized system.',
                color: 'text-cyan-600',
                bg: 'bg-cyan-100',
                gradient: 'from-cyan-400 via-sky-400 to-blue-400',
              },
              {
                icon: Tags,
                title: 'Auto-Categorized for You',
                desc: 'Meals, travel, or office supplies? The system learns your business and categorizes everything instantly.',
                color: 'text-amber-600',
                bg: 'bg-amber-100',
                gradient: 'from-amber-400 via-orange-400 to-yellow-400',
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="group relative"
                style={{ transform: 'translateZ(0)' }}
              >
                {/* Animated border gradient */}
                <div className="absolute -inset-[1px] rounded-xl overflow-hidden">
                  <motion.div
                    className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-100`}
                    animate={{
                      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                    style={{
                      backgroundSize: '200% 200%',
                    }}
                  />
                </div>

                {/* Mesh gradient background on hover */}
                <div
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 overflow-hidden"
                  style={{ transform: 'translateZ(0)' }}
                >
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      background: 'radial-gradient(circle at 20% 20%, rgba(147, 197, 253, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(196, 181, 253, 0.15) 0%, transparent 50%), radial-gradient(circle at 40% 60%, rgba(167, 243, 208, 0.1) 0%, transparent 40%)',
                    }}
                    animate={{
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, 0],
                    }}
                    transition={{
                      duration: 8,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                </div>

                <Card className="relative h-full bg-white border-slate-200 group-hover:border-transparent group-hover:shadow-xl transition-all duration-500">
                  <CardContent className="p-6 sm:p-8 relative z-10">
                    <div className={`inline-flex p-3 rounded-xl ${feature.bg} mb-5 transition-transform duration-300 group-hover:scale-110`}>
                      <feature.icon className={`w-6 h-6 ${feature.color}`} strokeWidth={1.5} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed text-[15px]">
                      {feature.desc}
                    </p>
                  </CardContent>
                </Card>
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
                avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
              },
              {
                quote: 'My clients finally send me data I can import, not blurry photos.',
                name: 'Mia',
                role: 'Accountant',
                avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
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
                <div className="flex items-center justify-between mb-4">
                  <div className="text-4xl text-cyan-600">"</div>
                  <div className="text-yellow-400 text-lg">⭐⭐⭐⭐⭐</div>
                </div>
                <p className="text-slate-700 mb-6 leading-relaxed text-lg">
                  {testimonial.quote}
                </p>
                <div className="flex items-center gap-3">
                  <Image
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    width={48}
                    height={48}
                    className="rounded-full object-cover shadow-md"
                  />
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

      {/* BRIDGE TO PRICING - Tools & CTA */}
      <section className="py-12 sm:py-16 bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Works with tools */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <p className="text-sm text-slate-500 uppercase tracking-wider mb-4">
              Compatible with your favorite tools
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8">
              <span className="font-semibold text-slate-400/60">QuickBooks</span>
              <span className="font-semibold text-slate-400/60">Excel</span>
              <span className="font-semibold text-slate-400/60">Google Sheets</span>
              <span className="font-semibold text-slate-400/60">Xero</span>
              <span className="font-semibold text-slate-400/60">Wave</span>
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Download IRS-ready CSV and PDF files that work everywhere.
            </p>
          </motion.div>

          {/* Bridge Headline */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-center mt-16"
          >
            <h3 className="text-3xl font-bold text-slate-900">
              Ready to{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-sky-600">
                reclaim your weekends
              </span>
              ?
            </h3>
            <p className="text-lg text-slate-500 mt-2">
              Join 500+ users who turned spreadsheet chaos into a 5-minute ritual.
            </p>
          </motion.div>
        </div>
      </section>

      {/* 11. PRICING SECTION */}
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
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-slate-600">
              Try all Pro features free for 7 days. No credit card required.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto items-start">
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
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" strokeWidth={2} />
                    </div>
                    <span className="text-slate-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href="/sign-up">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full border-2 border-slate-300 text-slate-600 hover:bg-slate-50 px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Start Free
                </motion.button>
              </Link>
            </motion.div>

            {/* PRO PLAN */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="bg-white rounded-2xl shadow-md border border-slate-200 p-8"
            >
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-4">PRO</h3>
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
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-100 flex items-center justify-center mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" strokeWidth={2} />
                    </div>
                    <span className="text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <motion.button
                onClick={() => handleCheckout('monthly')}
                disabled={checkoutLoading !== null}
                whileHover={{ scale: checkoutLoading ? 1 : 1.03 }}
                whileTap={{ scale: checkoutLoading ? 1 : 0.98 }}
                className="w-full border-2 border-cyan-500 text-cyan-600 hover:bg-cyan-50 px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
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

            {/* ANNUAL PLAN - HIGHLIGHTED */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative group"
              style={{ transform: 'translateZ(0)' }}
            >
              {/* Premium Animated gradient border - flowing effect */}
              <div className="absolute -inset-[2px] rounded-2xl overflow-hidden">
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(90deg, rgba(6,182,212,0.3), rgba(14,165,233,0.8), rgba(56,189,248,0.8), rgba(14,165,233,0.8), rgba(6,182,212,0.3))',
                    backgroundSize: '300% 100%',
                  }}
                  animate={{
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />
              </div>

              {/* Best Value Badge - Premium Design */}
              <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 z-10">
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-sky-400 rounded-xl blur-md opacity-60" />
                  <span className="relative inline-flex flex-col items-center bg-gradient-to-r from-cyan-500 via-sky-500 to-cyan-500 text-white px-5 py-2 rounded-xl text-center font-bold shadow-lg">
                    <span className="flex items-center gap-1.5 text-xs">
                      <Sparkles className="w-3.5 h-3.5" />
                      Best Value
                    </span>
                    <span className="text-sm font-bold">Save 20%</span>
                  </span>
                </motion.div>
              </div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="relative bg-white rounded-2xl p-8 pt-10"
                style={{
                  boxShadow: '0 25px 50px -12px rgba(6, 182, 212, 0.25), 0 12px 24px -8px rgba(0, 0, 0, 0.15)',
                }}
              >
                {/* Start with 7-day free trial badge */}
                <div className="bg-cyan-50 text-cyan-700 px-4 py-2 rounded-lg border border-cyan-200 mb-4 text-center">
                  <p className="text-sm font-semibold">Start with a 7-day free trial</p>
                </div>

                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">ANNUAL</h3>
                  <div className="mb-3">
                    <div className="flex items-baseline justify-center gap-3">
                      <span className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-sky-600">$99</span>
                      <div className="flex flex-col items-start">
                        <span className="text-lg text-slate-400 line-through">$119.88</span>
                        <span className="text-slate-600 text-sm">/year</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-lg font-semibold text-cyan-600">
                    = $8.25/month
                  </p>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-semibold text-slate-700 mb-4">All Pro features, plus:</p>
                </div>

                <ul className="space-y-4 mb-8">
                  {[
                    'Priority chat support',
                    'Early access to features',
                    'Accountant collaboration',
                    'Data export & API access',
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-100 flex items-center justify-center mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" strokeWidth={2} />
                      </div>
                      <span className="text-slate-700 font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Premium CTA Button with Shine Effect */}
                <div className="relative">
                  <motion.button
                    onClick={() => handleCheckout('yearly')}
                    disabled={checkoutLoading !== null}
                    whileHover={{ scale: checkoutLoading ? 1 : 1.03 }}
                    whileTap={{ scale: checkoutLoading ? 1 : 0.98 }}
                    className="relative w-full overflow-hidden gradient-btn text-white px-6 py-4 rounded-xl font-bold text-lg shadow-lg disabled:opacity-70 flex items-center justify-center gap-2 transition-all"
                  >
                    {/* Shine effect overlay */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12"
                      animate={{
                        x: ['-200%', '200%'],
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        repeatDelay: 1,
                        ease: 'easeInOut',
                      }}
                    />
                    <span className="relative z-10 flex items-center gap-2">
                      {checkoutLoading === 'yearly' ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Start 7-Day Free Trial'
                      )}
                    </span>
                  </motion.button>
                </div>

                {/* Cancel anytime safety text */}
                <div className="text-xs text-slate-400 text-center mt-4">
                  <p>Cancel anytime during trial.</p>
                  <p>We'll remind you before it ends.</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 11. FAQ SECTION */}
      <section id="faq" className="py-20 sm:py-32 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
              Frequently Asked Questions
            </h2>
          </motion.div>

          <div className="space-y-3 sm:space-y-4">
            {[
              {
                q: 'What format do you export?',
                a: `We deliver accounting-ready CSV files with everything you need: Date, Vendor, Amount, Category, Business Purpose, Payment Method, and Receipt Image URL. Works seamlessly with QuickBooks, Xero, Wave, FreshBooks, Excel, Google Sheets — any software that accepts CSV. Your accountant will love you.`,
              },
              {
                q: 'Is my data secure?',
                a: 'Absolutely. We use bank-level encryption — TLS 1.3 in transit and AES-256 at rest. Row-level security ensures only you can access your data. We never sell or share your information. Your receipts are safer with us than in your desk drawer.',
              },
              {
                q: 'Can I try it for free?',
                a: 'Yes! Start with our Free plan (10 receipts/month) or try Pro with a 7-day free trial. No-risk, cancel anytime — no questions asked. You only pay if you love it.',
              },
              {
                q: 'What types of receipts can I upload?',
                a: 'Everything. Photos, PDFs, screenshots, email receipts, invoices — our AI handles them all. If it proves you paid for something, we can extract the data.',
              },
              {
                q: 'Do you file taxes for me?',
                a: `We handle the hardest part — organizing and exporting your receipts in tax-ready format. For actual filing, work with your accountant. They'll thank you for the clean data.`,
              },
              {
                q: 'Who is TaxClip for?',
                a: 'Freelancers, small business owners, and accountants. Whether you need to organize client expenses, track SaaS subscriptions, or receive clean data from clients instead of messy PDFs — TaxClip saves hours of manual work.',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="bg-slate-50 rounded-2xl border border-slate-200/80 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 sm:p-6 text-left hover:bg-slate-100/50 transition-colors"
                >
                  <h3 className="text-sm sm:text-lg font-semibold text-slate-900 pr-4">{item.q}</h3>
                  <motion.div
                    animate={{ rotate: openFaq === i ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0"
                  >
                    <ChevronDown className="w-5 h-5 text-slate-500" />
                  </motion.div>
                </button>
                <motion.div
                  initial={false}
                  animate={{
                    height: openFaq === i ? 'auto' : 0,
                    opacity: openFaq === i ? 1 : 0,
                  }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <p className="text-xs sm:text-base text-slate-600 leading-relaxed px-4 sm:px-6 pb-4 sm:pb-6">
                    {item.a}
                  </p>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 12. FINAL CTA */}
      <section className="py-20 sm:py-32 bg-gradient-to-br from-cyan-500 to-sky-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              Join 500+ users saving 4 hours every weekend.
            </h2>
            <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
              Try TaxClip free for 7 days. Save 20% when you choose annual.
            </p>

            {/* Email input form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                router.push(`/sign-up${ctaEmail ? `?email=${encodeURIComponent(ctaEmail)}` : ''}`);
              }}
              className="max-w-lg mx-auto mb-4"
            >
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={ctaEmail}
                  onChange={(e) => setCtaEmail(e.target.value)}
                  className="flex-1 h-12 bg-white/20 text-white placeholder-white/70 border-white/30 text-base"
                />
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white text-cyan-600 hover:bg-slate-50 h-12 px-6 sm:px-8 rounded-lg font-semibold text-base shadow-xl transition-colors whitespace-nowrap"
                >
                  Start Free Trial
                </motion.button>
              </div>
            </form>

            <p className="text-blue-100 text-sm">
              No credit card required • Cancel anytime
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
                <Image src="/logo.svg" alt="TaxClip" width={36} height={36} />
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
              </nav>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <nav className="flex flex-col gap-3 text-sm">
                <a href="/contact" className="hover:text-white transition-colors">Contact</a>
              </nav>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <nav className="flex flex-col gap-3 text-sm">
                <a href="/terms" className="hover:text-white transition-colors">Terms</a>
                <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
                <a href="/refund" className="hover:text-white transition-colors">Refund Policy</a>
                <a href="/security" className="hover:text-white transition-colors">Security</a>
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
            className="bg-black rounded-2xl shadow-2xl max-w-4xl w-full relative overflow-hidden"
          >
            {/* Close button */}
            <button
              onClick={() => setDemoModalOpen(false)}
              className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* YouTube Video */}
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src="https://www.youtube.com/embed/fsadkGHAaW8?autoplay=1&rel=0"
                title="TaxClip Demo"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
