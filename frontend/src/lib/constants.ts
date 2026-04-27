export const LAMPORTS_PER_SOL = 1_000_000_000;

export const SOLANA_NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'testnet';

export const EXPLORER_URL = SOLANA_NETWORK === 'mainnet-beta'
  ? 'https://solscan.io'
  : `https://solscan.io?cluster=${SOLANA_NETWORK}`;

export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number, decimals = 2): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(decimals)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(decimals)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(decimals)}K`;
  return num.toFixed(decimals);
}

export function formatSol(lamports: number): string {
  return `${lamportsToSol(lamports).toFixed(4)} SOL`;
}

export function shortenAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function getExplorerUrl(signature: string): string {
  return `${EXPLORER_URL}/tx/${signature}`;
}

export function getAssetTypeColor(type: string): string {
  const colors: Record<string, string> = {
    residential: 'text-cyan-400',
    commercial: 'text-violet-400',
    industrial: 'text-amber-400',
    land: 'text-emerald-400',
    'mixed-use': 'text-rose-400',
    hospitality: 'text-pink-400',
    gold: 'text-amber-400',
    art: 'text-violet-400',
    bond: 'text-zinc-400',
    stock: 'text-blue-400',
    vehicle: 'text-red-400',
    commodity: 'text-orange-400',
  };
  return colors[type] || 'text-white';
}

export function getAssetTypeBadgeColor(type: string): string {
  const colors: Record<string, string> = {
    residential: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    commercial: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    industrial: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    land: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'mixed-use': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    hospitality: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    gold: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    art: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    bond: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    stock: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    vehicle: 'bg-red-500/20 text-red-400 border-red-500/30',
    commodity: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };
  return colors[type] || 'bg-white/10 text-white/60 border-white/20';
}

export const ASSET_TYPES = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'land', label: 'Land' },
  { value: 'mixed-use', label: 'Mixed Use' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'gold', label: 'Gold' },
  { value: 'art', label: 'Art' },
  { value: 'bond', label: 'Bonds' },
  { value: 'stock', label: 'Stocks' },
  { value: 'vehicle', label: 'Vehicles' },
  { value: 'commodity', label: 'Commodities' },
];
