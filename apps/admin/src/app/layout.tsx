import type { ReactNode } from 'react';
import './globals.css';
import { AuthGate } from '../components/AuthGate';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { AdminLocaleProvider } from '../lib/locale-context';
import { AdminThemeProvider } from '../lib/theme-context';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uk">
      <body className="bg-white text-leaf-900 dark:bg-leaf-900 dark:text-white">
        <AdminThemeProvider>
          <AdminLocaleProvider>
            <AuthGate>
              <div className="flex min-h-screen flex-col">
                <Header />
                <div className="flex flex-1">
                  <Sidebar />
                  <main className="flex-1 p-6">{children}</main>
                </div>
              </div>
            </AuthGate>
          </AdminLocaleProvider>
        </AdminThemeProvider>
      </body>
    </html>
  );
}
