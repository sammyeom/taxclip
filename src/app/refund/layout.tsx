import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: 'TaxClip Refund Policy - 14-day money-back guarantee. Learn about our subscription cancellation and refund eligibility.',
  alternates: {
    canonical: 'https://taxclip.co/refund',
  },
  openGraph: {
    title: 'Refund Policy | TaxClip',
    description: 'TaxClip Refund Policy - 14-day money-back guarantee for new subscribers.',
    url: 'https://taxclip.co/refund',
  },
}

export default function RefundLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
