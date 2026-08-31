import type { Metadata } from 'next';
import './globals.css';
import IdleWatcher from '../components/IdleWatcher';

export const metadata: Metadata = {
  title: 'MediKiosk — Patient Intake',
  description:
    'AI-powered clinical history and patient intake platform. Complete your medical history before your consultation.',
  keywords: ['medical', 'kiosk', 'patient intake', 'clinical history', 'OPD'],
  robots: 'noindex, nofollow', // Kiosk UI — not for public indexing
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hi" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#0F1117" />
        {/* Preconnect for Google Fonts (loaded in CSS) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {/* Inactivity watcher: warns, abandons the session and resets the kiosk */}
        <IdleWatcher />
        {children}
      </body>
    </html>
  );
}
