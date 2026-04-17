import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GRE Quant Prep — Manhattan Style',
  description:
    'Master GRE Quantitative Reasoning with Manhattan-style practice questions.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inline script avoids FOUC on dark mode */}
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