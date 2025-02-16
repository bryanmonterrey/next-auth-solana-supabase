import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export const shortenWalletAddress = (walletAddress: string, len = 5) => {
  return walletAddress.slice(0, len) + "...." + walletAddress.slice(-len);
};

export const copyToClipboard = async (
  text: string,
  { setIsCopied, setIsHovered, toast }: {
    setIsCopied: (value: boolean) => void;
    setIsHovered: (value: boolean) => void;
    toast: { success: (message: string) => void };
  }
) => {
  try {
    await navigator.clipboard.writeText(text);
    setIsCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => {
      setIsCopied(false);
      setIsHovered(false);
    }, 2000);
  } catch (error) {
    console.error('Failed to copy:', error);
  }
};

export const getUSDValue = async (solBalance: number) => {
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