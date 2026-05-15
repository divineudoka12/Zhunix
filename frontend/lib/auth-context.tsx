'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SiweMessage } from 'siwe';
import { Eip1193Provider, assert0GNetwork, auth, ensure0GNetwork } from '@/lib/api';

const SIWE_CHAIN_ID = Number(process.env.NEXT_PUBLIC_OG_CHAIN_ID || '16602');

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

  const getInjectedProvider = (): Eip1193Provider | null => {
    if (!window.ethereum) return null;
    return window.ethereum as Eip1193Provider;
  };

  const getErrorMessage = (err: unknown) => {
    if (err instanceof Error && err.message) return err.message;
    if (typeof err === 'object' && err && 'message' in err) {
      return String((err as { message?: unknown }).message || 'Connection failed');
    }
    return 'Connection failed. Check that your wallet supports 0G Galileo Testnet.';
  };

  const connect = async () => {
    setIsLoading(true);
    try {
      const provider = getInjectedProvider();
      if (!provider) {
        throw new Error('No wallet found. Install MetaMask or another injected browser wallet.');
      }

      const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[];
      const addr = accounts[0];
      if (!addr) throw new Error('No wallet account selected.');

      await ensure0GNetwork(provider);
      await assert0GNetwork(provider);

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
        chainId: SIWE_CHAIN_ID,
        nonce,
      });

      const siweMessage = messageObj.prepareMessage();

      const signature = await provider.request({
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
      alert(getErrorMessage(err));
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
