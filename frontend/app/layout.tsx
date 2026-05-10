import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import Navbar from '@/components/ui/Navbar';

export const metadata: Metadata = {
  title: 'Zhunix — Privacy-Preserving Data Marketplace',
  description: 'Buy, sell, and validate datasets with on-chain transparency and AI-powered quality scoring.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="noise-overlay">
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
