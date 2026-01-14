import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to TaxClip - Access your AI-powered receipt scanner and expense management dashboard.',
  alternates: {
    canonical: 'https://taxclip.co/sign-in',
  },
  openGraph: {
    title: 'Sign In | TaxClip',
    description: 'Sign in to your TaxClip account.',
    url: 'https://taxclip.co/sign-in',
  },
}

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
