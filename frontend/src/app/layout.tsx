import type { Metadata } from 'next';
import './globals.css';
import { SolanaWalletProvider } from '@/components/wallet/WalletProvider';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { ToastProvider } from '@/components/shared/Toast';
import { RoleProvider } from '@/context/RoleContext';
import Navbar from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'SolanaEstate | Tokenized Real World Assets',
  description:
    'Invest in premium real estate worldwide through fractional ownership on the Solana blockchain. Secure, transparent, and accessible.',
  keywords: ['RWA', 'real estate', 'tokenization', 'Solana', 'blockchain', 'fractional ownership'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-surface-950 font-sans antialiased text-white">
        <SolanaWalletProvider>
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
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
