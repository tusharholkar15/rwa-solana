export interface Asset {
  _id: string;
  onChainAddress?: string;
  mintAddress?: string;
  name: string;
  symbol: string;
  description: string;
  location: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    coordinates?: { lat: number; lng: number };
  };
  assetType: 'residential' | 'commercial' | 'industrial' | 'land' | 'mixed-use' | 'hospitality';
  images: string[];
  documents?: { name: string; url: string; type: string }[];
  propertyValue: number;
  totalSupply: number;
  availableSupply: number;
  pricePerToken: number;
  pricePerTokenUsd?: number;
  annualYieldBps: number;
  priceHistory?: { price: number; timestamp: string }[];
  status: 'draft' | 'active' | 'paused' | 'sold-out' | 'delisted';
  isActive: boolean;
  totalInvestors?: number;
  totalYieldDistributed?: number;
  soldPercentage?: number;
  marketCap?: number;
  marketCapUsd?: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  _id: string;
  walletAddress: string;
  name?: string;
  email?: string;
  kycStatus: 'none' | 'pending' | 'approved' | 'rejected' | 'expired';
  isWhitelisted: boolean;
  role: 'user' | 'admin' | 'issuer';
  totalTransactions: number;
  totalInvested: number;
  createdAt: string;
}

export interface Holding {
  assetId: string;
  shares: number;
  avgBuyPrice: number;
  totalInvested: number;
  totalYieldReceived: number;
  firstPurchaseAt: string;
  lastTransactionAt: string;
  asset?: {
    name: string;
    symbol: string;
    image?: string;
    currentPrice: number;
    assetType: string;
    location: { city?: string; country?: string };
    status: string;
  };
  currentValue?: number;
  unrealizedPnl?: number;
  pnlPercentage?: number;
}

export interface Portfolio {
  walletAddress: string;
  holdings: Holding[];
  totalValue: number;
  totalValueUsd?: number;
  totalInvested: number;
  totalInvestedUsd?: number;
  totalYieldEarned: number;
  totalRealizedPnl: number;
  unrealizedPnl: number;
  assetsCount: number;
  valueHistory?: { value: number; timestamp: string }[];
}

export interface Transaction {
  _id: string;
  txHash: string;
  walletAddress: string;
  assetId: string;
  assetName: string;
  type: 'buy' | 'sell' | 'transfer_in' | 'transfer_out' | 'yield';
  shares: number;
  pricePerToken: number;
  totalAmount: number;
  fee: number;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  pagination?: PaginationMeta;
}
