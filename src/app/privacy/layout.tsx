import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'TaxClip Privacy Policy - Learn how we collect, use, and protect your personal information when using our receipt scanner service.',
  alternates: {
    canonical: 'https://taxclip.co/privacy',
  },
  openGraph: {
    title: 'Privacy Policy | TaxClip',
    description: 'TaxClip Privacy Policy - How we protect your data and privacy.',
    url: 'https://taxclip.co/privacy',
  },
}

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
