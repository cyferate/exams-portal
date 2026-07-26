import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/app/components/ThemeProvider';
import { Analytics } from '@vercel/analytics/react'; // <-- NEW
import { SpeedInsights } from '@vercel/speed-insights/next'; // <-- NEW

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'EXAMS. | The Vault',
  description: 'The exclusive, peer-curated academic intelligence hub for Gurugram University. Access previous year questions, semester notes, and assignments.',
  keywords: ['Gurugram University', 'EXAMS', 'Notes', 'PYQ', 'Engineering', 'BTech', 'Student Portal'],
  openGraph: {
    title: 'EXAMS. | The Vault',
    description: 'The exclusive, peer-curated academic intelligence hub for Gurugram University. Engineered for students.',
    url: 'https://exams-community.vercel.app',
    siteName: 'EXAMS. The Vault',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=1200&auto=format&fit=crop',
        width: 1200,
        height: 630,
        alt: 'EXAMS Vault Preview Interface',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EXAMS. | The Vault',
    description: 'The exclusive, peer-curated academic intelligence hub for Gurugram University.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: '#1a1a1a',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
              }
            }}
          />
          {children}
        </ThemeProvider>

        {/* VERCEL TELEMETRY INJECTED HERE */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}