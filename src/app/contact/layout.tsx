import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Contact TaxClip - Get in touch with our support team for questions about our AI receipt scanner, billing, or technical support.',
  alternates: {
    canonical: 'https://taxclip.co/contact',
  },
  openGraph: {
    title: 'Contact Us | TaxClip',
    description: 'Get in touch with TaxClip support team.',
    url: 'https://taxclip.co/contact',
  },
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
