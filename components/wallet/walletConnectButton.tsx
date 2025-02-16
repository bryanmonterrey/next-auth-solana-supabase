'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import { Button } from "@/next-auth-solana-supabase/components/ui/button";
import { getCsrfToken, signIn, signOut, useSession } from "next-auth/react";
import * as Dropdown from '@/next-auth-solana-supabase/components/ui/dropdown';
import * as Drawer from '@/next-auth-solana-supabase/components/ui/drawer';
import PowerButton from '@/next-auth-solana-supabase/components/ui/powerButton';
import { Connection, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { toast } from 'sonner';
import bs58 from 'bs58';
import { TextMorph } from '@/next-auth-solana-supabase/components/ui/text-morph';
import { useWalletModal, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { SigninMessage } from "@/next-auth-solana-supabase/utils/SigninMessage";
import { shortenWalletAddress, copyToClipboard } from '@/next-auth-solana-supabase/lib/functions';

const RPC_URL = 'https://mainnet.helius-rpc.com/?api-key=89acb127-21f1-48fd-a752-77abb2a7fd78';

const WalletConnectButton = () => {
  const { wallet, connect, connected, connecting, disconnecting, disconnect, select, publicKey, signMessage } = useWallet();
  const walletModal = useWalletModal();
  const { status, data: session, update } = useSession();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [usdBalance, setUsdBalance] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isHovered2, setIsHovered2] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (connected && status === "unauthenticated" && !isSigningIn) {
      handleSignIn();
    }
    if (!connected && status === "authenticated") {
      handleWalletDisconnect();
    }
  }, [connected, status, isSigningIn]);

  useEffect(() => {
    const getBalanceAndValue = async () => {
      if (publicKey) {
        try {
          // Get SOL balance using Helius RPC
          const connection = new Connection(RPC_URL);
          const balance = await connection.getBalance(publicKey);
          const solBalance = balance / LAMPORTS_PER_SOL;
          setBalance(solBalance);
  
          // Get USD value from Jupiter
          if (solBalance > 0) {
            const usdValue = await getUSDValue(solBalance);
            setUsdBalance(usdValue);
          } else {
            setUsdBalance(0);
          }
        } catch (error) {
          console.error('Error fetching balance:', error);
          setBalance(null);
          setUsdBalance(null);
        }
      }
    };
  
    getBalanceAndValue();
    
    // Refresh every 30 seconds
    const interval = setInterval(getBalanceAndValue, 30000);
    
    return () => clearInterval(interval);
  }, [publicKey]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      toast.success('Copied to clipboard');
      // Reset after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
        setIsHovered(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleSignIn = async () => {
        if (isSigningIn || status === "loading") return;
        setIsSigningIn(true);
        try {
          if (!connected) {
            walletModal.setVisible(true);
            return;
          }

          if (session && status === "authenticated") {
            return;
          }

        const csrfToken = await getCsrfToken();
            if (!publicKey || !csrfToken || !signMessage) {
              console.error("Wallet is not ready for signing");
              return;
            }

        const message = new SigninMessage({
          domain: window.location.host,
          publicKey: publicKey.toBase58(),
          statement:
            "Welcome to Solana! By signing, you're confirming ownership of the wallet you're connecting. This is a secure, gas-free process that ensures your identity without granting Solana any permission to perform transactions or access your funds. Your security and privacy are always our priority.",
          nonce: csrfToken,
          uri: "https://solana.com/",
          version: "1",
          chainId: "Mainnet",
          issuedAt: new Date().toISOString(),
          requestId: crypto.randomUUID(),
        });

        const encodedMessage = new TextEncoder().encode(message.prepare());
        const signature = await signMessage(encodedMessage);
        const serializedSignature = bs58.encode(signature);

        const result = await signIn("credentials", {
          message: JSON.stringify(message),
          signature: serializedSignature,
          csrfToken,
          redirect: false,
        });

        console.log(result);

        if (result?.error) {
          console.error("Sign-in failed:", result.error);
        } else {
          await update();
        }
      } catch (error) {
        console.error("Error during sign-in:", error);
      } finally {
        setIsSigningIn(false);
      }
    };

  useEffect(() => {
    const getBalance = async () => {
      if (publicKey) {
        try {
          const connection = new Connection(RPC_URL);
          const balance = await connection.getBalance(publicKey);
          setBalance(balance / LAMPORTS_PER_SOL);
        } catch (error) {
          console.error('Error fetching balance:', error);
          setBalance(null);
        }
      }
    };
  
    getBalance();
  }, [publicKey]);

  const getUSDValue = async (solBalance: number) => {
    try {
      // Convert SOL to lamports
      const amountInLamports = Math.floor(solBalance * LAMPORTS_PER_SOL); // Ensure whole number
      
      // SOL and USDC mint addresses
      const SOL_MINT = 'So11111111111111111111111111111111111111112';
      const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
      
      const response = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${SOL_MINT}&outputMint=${USDC_MINT}&amount=${amountInLamports}&slippageBps=50`
      );
  
      if (!response.ok) {
        console.error('Jupiter API Error:', response.status, response.statusText);
        return null;
      }
  
      const data = await response.json();
      
      if (!data.outAmount) {
        console.error('Invalid response from Jupiter:', data);
        return null;
      }
  
      // Jupiter returns the USDC amount with 6 decimals
      const usdValue = parseFloat(data.outAmount) / 10**6;
      return usdValue;
    } catch (error) {
      console.error('Error getting USD value from Jupiter:', error);
      return null;
    }
  };

  const handleWalletDisconnect = async () => {
    if (session && status === "authenticated") {
      disconnect();
      await signOut({ redirect: false });
      setIsDrawerOpen(false);
    }

  };

  if (!mounted) return null;

  return (
    <>
      {!connected ? (
        <Dropdown.Root>
          <Dropdown.Trigger asChild>
          
            <Button className="relative bg-bitcoin/15 rounded-full px-4 hover:bg-bitcoin/25 hover:text-white active:bg-bitcoin/35 active:ring-0 active:ring-offset-0 active:ring-offset-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent transition-all ease-in-out duration-300">
              <WalletMultiButton>
                <div className="flex items-center justify-center text-inherit">
                  <p className="text-sm font-geist font-medium text-bitcoin">
                    connect
                  </p>
                </div>
              </WalletMultiButton>
            </Button>
            
          </Dropdown.Trigger>
          <Dropdown.Content className="w-[400px]">
            <div className="bg-zinc-950 flex items-start justify-between p-2 pl-3">
              <div className="text-amber-50 font-semibold">connect a wallet</div>
            </div>
            <Dropdown.Group className="flex flex-col items-center justify-center mb-3">
              <Dropdown.Item >
                <div className="inline-flex items-center space-x-3 p-5 w-full text-white rounded-2xl bg-bitcoin/80 hover:bg-bitcoin justify-start transition-all duration-300 ease-in-out">
                  <div className="h-9 w-9 bg-zinc-950 rounded-xl p-1.5">
                    <img src="/password.svg" alt="phantom" className="w-full h-full" />
                  </div>
                  <div className='text-sm font-medium text-blue-950'>
                    <p className='text-base font-semibold text-zinc-950'>phantom wallet</p>
                    <p className='text-xs font-medium text-blue-950'>phantom wallet</p>
                  </div>
                </div>
              </Dropdown.Item>

            </Dropdown.Group>
            <div className="p-3 text-sm font-medium text-gray">
              by connecting a wallet, you agree to xxxxxx terms of service and consent to its privacy policy.
            </div>
          </Dropdown.Content>
        </Dropdown.Root>
      ) : (
        <Drawer.Root open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <Drawer.Trigger asChild>
            <Button 
              className="relative bg-bitcoin/15 rounded-full px-4 hover:bg-bitcoin/25 hover:text-white active:bg-bitcoin/35 transition-all ease-in-out duration-300"
            >
              <div className="flex items-center justify-center space-x-3 text-inherit">
                <div 
                onMouseEnter={() => setIsHovered2(true)}
                onMouseLeave={() => setIsHovered2(false)}
                className="text-sm font-geist text-bitcoin">
                  <TextMorph>
                    {isHovered2 ? 'open wallet' : publicKey ? shortenWalletAddress(publicKey.toString()) : 'Connect'}
                  </TextMorph>
                </div>
              </div>
            </Button>
          </Drawer.Trigger>

          <Drawer.Content>
            <Drawer.Header>
              <Drawer.Title className="text-bitcoin">
              <div 
              onClick={() => copyToClipboard(publicKey?.toString() ?? '')}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => !isCopied && setIsHovered(false)}
              className="flex w-fit items-center hover:cursor-pointer justify-between bg-white/5 hover:bg-white/15 transition-all duration-300 ease-in-out p-3 rounded-full px-3">
              <div className="text-sm font-semibold text-white/85 hover:text-white/95 transition-all duration-300 ease-in-out break-all">
              <TextMorph>
                {isCopied 
                  ? 'copied' 
                  : isHovered 
                    ? 'copy address' 
                    : shortenWalletAddress(publicKey?.toString() ?? '')
                }
              </TextMorph>
              </div>
            </div>
              </Drawer.Title>
              
              <PowerButton handleDisconnect={handleWalletDisconnect} />
              
            </Drawer.Header>
            
            <Drawer.Body>
              <div className="px-4 space-y-3 py-2 bg-white/0 rounded-2xl">

                <div className="space-y-2 p-3 bg-white/0 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div className="text-white/85 text-3xl font-semibold">
                      ${usdBalance !== null ? usdBalance.toFixed(2) : '0.00'}
                    </div>
                  </div>
                </div>

                <div className='space-y-2 p-2 bg-white/0 rounded-2xl'>
                  <div className='grid grid-cols-2 gap-2'>
                    <div className='text-3xl h-16 font-semibold col-span-1 rounded-2xl transition-all duration-300 ease-in-out flex items-center justify-center'>
                      <Button className='h-full w-full bg-bitcoin/15 hover:bg-bitcoin/25 transition-all rounded-2xl duration-300 ease-in-out text-bitcoin text-2xl'>
                        buy
                      </Button>
                    </div>
                    <div className='text-3xl h-16 font-semibold col-span-1rounded-2xl transition-all duration-300 ease-in-out flex items-center justify-center'>
                      <Button className='h-full w-full bg-bitcoin/15 hover:bg-bitcoin/25 transition-all rounded-2xl duration-300 ease-in-out text-bitcoin text-2xl'>
                        buy
                      </Button>
                    </div>
                  </div>
                </div>

              </div>
            </Drawer.Body>
            <Drawer.Close>
              <div className="h-10 px-4 py-2 absolute right-4 bottom-4 rounded-full bg-white/5 hover:bg-white/15 transition-all duration-300 ease-in-out flex items-center justify-center text-white/85">close</div>
            </Drawer.Close>
          </Drawer.Content>
        </Drawer.Root>
      )}
    </>
  );
};

export default WalletConnectButton;