import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'TaxClip Terms of Service - Learn about the terms and conditions for using our AI-powered receipt scanner and expense management service.',
  alternates: {
    canonical: 'https://taxclip.co/terms',
  },
  openGraph: {
    title: 'Terms of Service | TaxClip',
    description: 'TaxClip Terms of Service - Terms and conditions for using our AI-powered receipt scanner.',
    url: 'https://taxclip.co/terms',
  },
}

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
