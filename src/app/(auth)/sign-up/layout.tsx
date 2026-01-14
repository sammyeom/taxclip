import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Create your free TaxClip account - Start scanning receipts with AI-powered OCR. Free forever for basic features.',
  alternates: {
    canonical: 'https://taxclip.co/sign-up',
  },
  openGraph: {
    title: 'Sign Up | TaxClip',
    description: 'Create your free TaxClip account and start scanning receipts.',
    url: 'https://taxclip.co/sign-up',
  },
}

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
