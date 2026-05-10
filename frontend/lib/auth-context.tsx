'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SiweMessage } from 'siwe';
import { auth } from '@/lib/api';

interface AuthState {
  address: string | null;
  token: string | null;
  isConnected: boolean;
  isLoading: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const AuthContext = createContext<AuthState>({
  address: null, token: null, isConnected: false, isLoading: false,
  connect: async () => { }, disconnect: () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('zhunix_token');
    const savedAddress = localStorage.getItem('zhunix_address');
    if (savedToken && savedAddress) {
      setToken(savedToken);
      setAddress(savedAddress);
    }
  }, []);

  const connect = async () => {
    setIsLoading(true);
    try {
      if (!window.ethereum) throw new Error('No wallet found. Install MetaMask.');

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      const addr = accounts[0];
      const { ethers } = await import('ethers');
      const checksumAddr = ethers.getAddress(addr);

      const { nonce } = await auth.getNonce(addr.toLowerCase());

      const domain = window.location.host;
      const origin = window.location.origin;

      const messageObj = new SiweMessage({
        domain,
        address: checksumAddr,
        statement: 'Sign in to Zhunix Data Marketplace',
        uri: origin,
        version: '1',
        chainId: 1,
        nonce,
      });

      const siweMessage = messageObj.prepareMessage();

      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [siweMessage, addr],
      }) as string;

      const result = await auth.verify(siweMessage, signature);
      localStorage.setItem('zhunix_token', result.token);
      localStorage.setItem('zhunix_address', result.address);
      setToken(result.token);
      setAddress(result.address);
    } catch (err) {
      console.error('Connect failed:', err);
      alert(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    localStorage.removeItem('zhunix_token');
    localStorage.removeItem('zhunix_address');
    setToken(null);
    setAddress(null);
  };

  return (
    <AuthContext.Provider value={{ address, token, isConnected: !!token, isLoading, connect, disconnect }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}
