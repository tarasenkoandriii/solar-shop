import type { ReactNode } from 'react';
import Script from 'next/script';
import './globals.css';
import { TelegramProvider } from '../components/TelegramProvider';
import { DevPanel } from '../components/DevPanel';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uk">
      <body className="min-h-screen pb-20 text-leaf-900">
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <TelegramProvider>
          {children}
          <DevPanel />
        </TelegramProvider>
      </body>
    </html>
  );
}
