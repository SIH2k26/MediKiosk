import type { Metadata } from 'next';
import './globals.css';
import IdleWatcher from '../components/IdleWatcher';
import { Bodoni_Moda, Cormorant_Garamond } from 'next/font/google';


const bodoni = Bodoni_Moda({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-bodoni', display: 'swap' });
const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500', '600', '700'], style: ['normal', 'italic'], variable: '--font-cormorant', display: 'swap' });

export const metadata: Metadata = {
  title: 'MediKiosk',
  description: 'AI-powered clinical history and patient intake platform.',
  robots: 'noindex, nofollow',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hi" suppressHydrationWarning className={cormorant.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#F5F8F8" />
      </head>
      <body className="bg-gradient-page text-ink-primary font-sans antialiased min-h-screen">
        {/* Inactivity watcher: warns, abandons the session and resets the kiosk */}
        <IdleWatcher />
        {children}
      </body>
    </html>
  );
}



