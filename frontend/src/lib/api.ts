const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || error.message || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Unable to connect to server. Please check if the backend is running.');
      }
      throw error;
    }
  }

  // ─── Assets ────────────────────────────────────────────────
  async getAssets(params?: {
    page?: number;
    limit?: number;
    type?: string;
    search?: string;
    sortBy?: string;
    order?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value));
      });
    }
    const query = searchParams.toString();
    return this.request<{
      assets: any[];
      pagination: any;
      solPrice: number;
    }>(`/assets${query ? `?${query}` : ''}`);
  }

  async getAsset(id: string) {
    return this.request<{ asset: any; solPrice: number }>(`/assets/${id}`);
  }

  async createAsset(data: any) {
    return this.request<{ message: string; asset: any }>('/assets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteAsset(id: string) {
    return this.request<{ message: string }>(`/assets/${id}`, {
      method: 'DELETE',
    });
  }

  // ─── Trading ───────────────────────────────────────────────
  async buyShares(data: { assetId: string; shares: number; walletAddress: string }) {
    return this.request<{ message: string; transaction: any }>('/buy', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sellShares(data: { assetId: string; shares: number; walletAddress: string }) {
    return this.request<{ message: string; transaction: any }>('/sell', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ─── Portfolio ─────────────────────────────────────────────
  async getPortfolio(wallet: string) {
    return this.request<{ portfolio: any; solPrice: number }>(
      `/portfolio/${wallet}`
    );
  }

  async getTaxLots(wallet: string) {
    return this.request<{ lots: any[]; solPrice: number }>(
      `/portfolio/${wallet}/tax-lots`
    );
  }

  async getTransactions(wallet: string, params?: { page?: number; limit?: number; type?: string }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value));
      });
    }
    const query = searchParams.toString();
    return this.request<{ transactions: any[]; pagination: any }>(
      `/portfolio/${wallet}/transactions${query ? `?${query}` : ''}`
    );
  }

  // ─── KYC ───────────────────────────────────────────────────
  async submitKyc(data: {
    walletAddress: string;
    documentType: string;
    documentId: string;
    name?: string;
    email?: string;
  }) {
    return this.request<{ status: string; message: string }>('/kyc/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getKycStatus(wallet: string) {
    return this.request<{
      status: string;
      isWhitelisted: boolean;
      documents?: any[];
    }>(`/kyc/status/${wallet}`);
  }

  // ─── Admin ─────────────────────────────────────────────────
  async getAdminStats() {
    return this.request<{
      platform: any;
      market: any;
      cluster: any;
      recentTransactions: any[];
    }>('/admin/stats');
  }

  async getAdminUsers(params?: { page?: number; limit?: number; kycStatus?: string }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value));
      });
    }
    const query = searchParams.toString();
    return this.request<{ users: any[]; pagination: any }>(
      `/admin/users${query ? `?${query}` : ''}`
    );
  }

  async approveKyc(walletAddress: string) {
    return this.request<{ status: string }>('/kyc/approve', {
      method: 'POST',
      body: JSON.stringify({ walletAddress }),
    });
  }

  async rejectKyc(walletAddress: string, reason?: string) {
    return this.request<{ status: string }>('/kyc/reject', {
      method: 'POST',
      body: JSON.stringify({ walletAddress, reason }),
    });
  }

  // ─── Health ────────────────────────────────────────────────
  async healthCheck() {
    return this.request<{ status: string; network: string }>('/health');
  }

  // ─── FX / Multi-Currency ──────────────────────────────────
  async getFxRates() {
    return this.request<{ base: string; rates: Record<string, number>; currencies: any; lastUpdated: string }>('/fx/rates');
  }

  async convertCurrency(amount: number, from: string, to: string) {
    return this.request<any>(`/fx/convert?from=${from}&to=${to}&amount=${amount}`);
  }

  // ─── Fiat On-Ramp ─────────────────────────────────────────
  async createFiatOrder(data: { currency: string; amount: number; walletAddress: string; assetId: string; shares: number }) {
    return this.request<{ order: any }>('/onramp/create-order', { method: 'POST', body: JSON.stringify(data) });
  }

  async getFiatEstimate(amount: number, currency: string, tokenPriceSOL: number) {
    return this.request<any>(`/onramp/estimate?amount=${amount}&currency=${currency}&tokenPriceSOL=${tokenPriceSOL}`);
  }

  async simulatePayment(orderId: string) {
    return this.request<any>('/onramp/simulate-success', { method: 'POST', body: JSON.stringify({ orderId }) });
  }

  // ─── Compliance ───────────────────────────────────────────
  async verifyDocument(data: { documentType: string; documentData: any; walletAddress: string }) {
    return this.request<any>('/compliance/verify-document', { method: 'POST', body: JSON.stringify(data) });
  }

  async generateAgreement(data: { walletAddress: string; assetId: string; assetName: string; shares: number; pricePerToken: number; totalAmount: number }) {
    return this.request<any>('/compliance/generate-agreement', { method: 'POST', body: JSON.stringify(data) });
  }

  async signAgreement(data: { agreementId: string; walletAddress: string; signatureHash?: string }) {
    return this.request<any>('/compliance/sign-agreement', { method: 'POST', body: JSON.stringify(data) });
  }

  async getAgreements(wallet: string) {
    return this.request<{ agreements: any[] }>(`/compliance/agreements/${wallet}`);
  }

  async getAssetDocs(assetId: string) {
    return this.request<{ documents: any[] }>(`/compliance/asset-docs/${assetId}`);
  }

  async amlScreen(walletAddress: string) {
    return this.request<any>('/compliance/aml-screen', { method: 'POST', body: JSON.stringify({ walletAddress }) });
  }



  // --- Oracle Feed ---

  async getNavHistory(assetId: string, days?: number) {
    return this.request<{ history: any[] }>(`/oracle/history/${assetId}${days ? `?days=${days}` : ''}`);
  }

  // --- Compliance V2 (Institutional) ---

  async createComplianceIdentity(data: { walletAddress: string; tier: number; jurisdiction: string; accreditationType?: string }) {
    return this.request<any>('/compliance/identity', { method: 'POST', body: JSON.stringify(data) });
  }

  async getComplianceIdentity(walletAddress: string) {
    return this.request<any>(`/compliance/identity/${walletAddress}`);
  }

  async getJurisdictions() {
    return this.request<any>('/compliance/jurisdictions');
  }

  async validateTransfer(data: { fromWallet: string; toWallet: string; assetId: string; amount: number }) {
    return this.request<any>('/compliance/validate-transfer', { method: 'POST', body: JSON.stringify(data) });
  }

  // Admin Compliance endpoints - Require headers: {'x-wallet-address', 'x-wallet-signature', 'x-wallet-message'} passed from UI

  async listComplianceIdentities(params: { tier?: string; jurisdiction?: string; isFrozen?: string }, authHeaders: Record<string, string>) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) searchParams.set(k, v); });
    return this.request<any>(`/compliance/identities?${searchParams.toString()}`, { headers: authHeaders });
  }

  async updateComplianceTier(walletAddress: string, data: { tier: number }, authHeaders: Record<string, string>) {
    return this.request<any>(`/compliance/identity/${walletAddress}/tier`, { method: 'PUT', body: JSON.stringify(data), headers: authHeaders });
  }

  async freezeWallet(walletAddress: string, data: { reason: string }, authHeaders: Record<string, string>) {
    return this.request<any>(`/compliance/identity/${walletAddress}/freeze`, { method: 'POST', body: JSON.stringify(data), headers: authHeaders });
  }

  async unfreezeWallet(walletAddress: string, authHeaders: Record<string, string>) {
    return this.request<any>(`/compliance/identity/${walletAddress}/unfreeze`, { method: 'POST', headers: authHeaders });
  }

  async getAuditTrail(params: { walletAddress?: string; eventType?: string }, authHeaders: Record<string, string>) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) searchParams.set(k, v); });
    return this.request<any>(`/compliance/audit-trail?${searchParams.toString()}`, { headers: authHeaders });
  }

  // --- Sub-Accounts (Institutional Delegation) ---

  async linkSubAccount(data: { childWallet: string }, authHeaders: Record<string, string>) {
    return this.request<any>('/compliance/link-subaccount', { method: 'POST', body: JSON.stringify(data), headers: authHeaders });
  }

  async unlinkSubAccount(data: { childWallet: string }, authHeaders: Record<string, string>) {
    return this.request<any>('/compliance/unlink-subaccount', { method: 'POST', body: JSON.stringify(data), headers: authHeaders });
  }

  // ─── Insurance ────────────────────────────────────────────
  async getInsuranceQuote(assetId: string, shares?: number) {
    return this.request<any>(`/insurance/quote/${assetId}?shares=${shares || 100}`);
  }

  async activateInsurance(data: { walletAddress: string; assetId: string; tierId: string; quoteData?: any }) {
    return this.request<any>('/insurance/activate', { method: 'POST', body: JSON.stringify(data) });
  }

  async getInsurancePolicies(wallet: string) {
    return this.request<{ policies: any[] }>(`/insurance/policies/${wallet}`);
  }

  // ─── Liquidity Pools ──────────────────────────────────────
  async getLiquidityPools() {
    return this.request<{ pools: any[] }>('/liquidity/pools');
  }

  async getSwapPreview(poolId: string, direction: string, amount: number) {
    return this.request<any>(`/liquidity/swap-preview?poolId=${poolId}&direction=${direction}&amount=${amount}`);
  }

  async executeSwap(data: { poolId: string; direction: string; amount: number; walletAddress: string; maxSlippage?: number }) {
    return this.request<{ trade: any }>('/liquidity/swap', { method: 'POST', body: JSON.stringify(data) });
  }

  async getOTCOrderbook(assetId: string) {
    return this.request<any>(`/liquidity/otc/orderbook/${assetId}`);
  }

  async placeOTCOrder(data: { assetId: string; walletAddress: string; side: string; shares: number; pricePerShare: number }) {
    return this.request<{ order: any }>('/liquidity/otc/order', { method: 'POST', body: JSON.stringify(data) });
  }

  // --- Dark Pool (Institutional) ---

  async placeDarkOrder(data: { walletAddress: string; assetId: string; side: string; price: number; shares: number; minimumFill?: number }) {
    return this.request<{ order: any }>('/liquidity/darkpool/order', { method: 'POST', body: JSON.stringify(data) });
  }

  async getMyDarkOrders(wallet: string) {
    return this.request<{ orders: any[] }>(`/liquidity/darkpool/my-orders/${wallet}`);
  }

  async getDarkPoolStats(assetId: string) {
    return this.request<any>(`/liquidity/darkpool/stats/${assetId}`);
  }

  // ─── Credit Scoring ───────────────────────────────────────
  async getCreditScore(wallet: string) {
    return this.request<any>(`/credit/score/${wallet}`);
  }

  async applyForLoan(data: { walletAddress: string; collateralAssetId: string; collateralShares: number; requestedAmount: number }) {
    return this.request<any>('/credit/loan/apply', { method: 'POST', body: JSON.stringify(data) });
  }

  // ─── Analytics ────────────────────────────────────────────
  async getMarketAnalytics() {
    return this.request<any>('/analytics/market');
  }

  async compareAssets(ids: string[]) {
    return this.request<{ comparison: any[] }>(`/analytics/assets/compare?ids=${ids.join(',')}`);
  }

  async getPortfolioAnalytics(wallet: string) {
    return this.request<any>(`/analytics/portfolio/${wallet}`);
  }

  async getHeatMap() {
    return this.request<{ assets: any[] }>('/analytics/heat-map');
  }

  async getTopMovers() {
    return this.request<any>('/analytics/top-movers');
  }

  // ─── Community ────────────────────────────────────────────
  async getCommunityFeed(params?: { page?: number; type?: string; sort?: string }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value));
      });
    }
    const query = searchParams.toString();
    return this.request<{ posts: any[]; total: number }>(`/community/feed${query ? `?${query}` : ''}`);
  }

  async getAssetReviews(assetId: string) {
    return this.request<{ reviews: any[]; averageRating: number; totalReviews: number }>(`/community/reviews/${assetId}`);
  }

  async createPost(data: { walletAddress: string; authorName?: string; type: string; title: string; content: string; tags?: string[] }) {
    return this.request<any>('/community/post', { method: 'POST', body: JSON.stringify(data) });
  }

  async likePost(postId: string, walletAddress: string) {
    return this.request<{ likes: number; liked: boolean }>(`/community/post/${postId}/like`, { method: 'POST', body: JSON.stringify({ walletAddress }) });
  }

  async commentOnPost(postId: string, data: { walletAddress: string; authorName?: string; content: string }) {
    return this.request<any>(`/community/post/${postId}/comment`, { method: 'POST', body: JSON.stringify(data) });
  }
}

export const api = new ApiClient();
