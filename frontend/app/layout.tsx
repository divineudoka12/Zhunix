import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import Navbar from '@/components/ui/Navbar';

export const metadata: Metadata = {
  title: 'Zhunix - AI Data Licensing Protocol',
  description: 'Create consent-first data licenses managed by autonomous agents and settled on-chain.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="app-shell">
            <Navbar />
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
