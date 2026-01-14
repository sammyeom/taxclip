import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'TaxClip - AI Receipt Scanner for Freelancers'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #ecfeff 0%, #e0f2fe 50%, #f0f9ff 100%)',
        }}
      >
        {/* Logo and Title */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            marginBottom: '40px',
          }}
        >
          {/* Logo Icon */}
          <div
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '24px',
              background: '#06B6D4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="72"
              height="72"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
              <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
              <path d="M12 17.5v-11" />
            </svg>
          </div>
          {/* Title */}
          <div style={{ display: 'flex', fontSize: '80px', fontWeight: 'bold' }}>
            <span style={{ color: '#0f172a' }}>Tax</span>
            <span style={{ color: '#06B6D4' }}>Clip</span>
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: '36px',
            color: '#475569',
            textAlign: 'center',
            maxWidth: '900px',
            lineHeight: 1.4,
          }}
        >
          AI-Powered Receipt Scanner & Tax Management for Freelancers
        </div>

        {/* Features */}
        <div
          style={{
            display: 'flex',
            gap: '48px',
            marginTop: '48px',
          }}
        >
          {['Snap & Scan', 'AI OCR', 'QuickBooks Export'].map((feature) => (
            <div
              key={feature}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '24px',
                color: '#0891b2',
                fontWeight: 600,
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#06B6D4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              {feature}
            </div>
          ))}
        </div>

        {/* URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            fontSize: '24px',
            color: '#94a3b8',
          }}
        >
          taxclip.co
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
