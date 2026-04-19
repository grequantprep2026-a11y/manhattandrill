import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const ManhattanDrillLogo = () => (
  <svg width="180" height="44" viewBox="0 0 220 52" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 42V8L18 28L30 8V42" stroke="#1a1a18" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
    <text x="50" y="24" fontFamily="Inter, -apple-system, sans-serif" fontSize="20" fontWeight="800" fill="#1a1a18" letterSpacing="-0.4">Manhattan</text>
    <text x="50" y="40" fontFamily="Inter, -apple-system, sans-serif" fontSize="12" fontWeight="600" fill="#2d6a4f" letterSpacing="3">DRILL</text>
  </svg>
);

export const metadata: Metadata = {
  title: 'ManhattanDRILL — GRE Quant Prep',
  description:
    'Master GRE Quantitative Reasoning with 754+ Manhattan 5LB practice questions, timed mocks, and a 30-day study schedule.',
  metadataBase: new URL('https://manhattandrill.vercel.app'),
  openGraph: {
    title: 'ManhattanDRILL — GRE Quant Prep',
    description: 'Crack GRE Quant in 30 days with Manhattan 5LB drilling.',
    url: 'https://manhattandrill.vercel.app',
    siteName: 'ManhattanDRILL',
    type: 'website',
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          name="google-site-verification"
          content="fsuB0os2zhe1ez8vT85opTjmU4nqLdUZA4BLA1qBeTI"
        />

        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', {
                  page_path: window.location.pathname,
                });
              `}
            </Script>
          </>
        )}

        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (typeof window !== 'undefined' && localStorage.getItem('gre_theme') === 'dark') {
                  document.documentElement.classList.add('dark');
                }
              } catch(_) {}
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}