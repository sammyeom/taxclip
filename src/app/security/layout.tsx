import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Security',
  description: 'TaxClip Security - Learn how we protect your financial data with enterprise-grade encryption and security measures.',
  alternates: {
    canonical: 'https://taxclip.co/security',
  },
  openGraph: {
    title: 'Security | TaxClip',
    description: 'TaxClip Security - Enterprise-grade protection for your financial data.',
    url: 'https://taxclip.co/security',
  },
}

export default function SecurityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
