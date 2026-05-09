import type { Metadata } from 'next';
import './globals.css';
import { SolanaWalletProvider } from '@/components/wallet/WalletProvider';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { ToastProvider } from '@/components/shared/Toast';
import { RoleProvider } from '@/context/RoleContext';
import { RealtimeProvider } from '@/context/RealtimeContext';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/layout/Navbar';

import { ReactNode } from 'react';
import BrowserFixer from '@/components/shared/BrowserFixer';

export const metadata: Metadata = {
  title: 'SolanaEstate | Tokenized Real World Assets',
  description:
    'Invest in premium real estate worldwide through fractional ownership on the Solana blockchain. Secure, transparent, and accessible.',
  keywords: ['RWA', 'real estate', 'tokenization', 'Solana', 'blockchain', 'fractional ownership'],
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const origError = console.error;
                console.error = function(...args) {
                  const msg = args[0] ? args[0].toString() : "";
                  if (msg.includes("MetaMask") || msg.includes("nkbihfbeogaeaoehlefnkodbefgpgknn")) return;
                  origError.apply(console, args);
                };
                window.addEventListener("unhandledrejection", function(e) {
                  if (e.reason && e.reason.message && e.reason.message.includes("MetaMask")) {
                    e.preventDefault();
                  }
                });
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-surface-950 font-sans antialiased text-white">
        <BrowserFixer />
        <SolanaWalletProvider>
          <AuthProvider>
            <RealtimeProvider>
              <CurrencyProvider>
              <RoleProvider>
                <ToastProvider>
                  <div className="min-h-screen relative overflow-x-hidden">
                    <Navbar />
                    <main className="pt-28 px-4 lg:px-8">
                       {children}
                    </main>
                  </div>
                </ToastProvider>
              </RoleProvider>
            </CurrencyProvider>
          </RealtimeProvider>
        </AuthProvider>
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
