/**
 * Typed HTTP client for ghost-server.
 * Uses Node 18+ native fetch.
 */

export interface LendIntentDto {
  intentId: string;
  lender: string;
  amount: string;
  rMin: number;
  status: 'open' | 'matched' | 'cancelled';
  matchedLoanId?: string;
  createdAt: string;
  matchedAt?: string;
}

export interface BorrowIntentDto {
  intentId: string;
  borrower: string;
  amount: string;
  rMax: number;
  collateral: string;
  status: 'open' | 'matched' | 'cancelled';
  matchedLoanId?: string;
  createdAt: string;
  matchedAt?: string;
}

export interface LoanDto {
  loanId: string;
  lender: string;
  borrower: string;
  principal: string;
  rate: number;
  lendIntentId: string;
  borrowIntentId: string;
  status: 'awaiting-settlement' | 'active' | 'failed';
  createdAt: string;
  settledAt?: string;
  settlementTxId?: string;
}

export class GhostServerClient {
  constructor(private baseUrl: string) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${method} ${path} failed ${res.status}: ${text}`);
    }
    return (await res.json()) as T;
  }

  async health(): Promise<{
    ok: boolean;
    openIntents: { lend: number; borrow: number };
    activeLoans: number;
  }> {
    return this.request('GET', '/health');
  }

  async submitLend(lender: string, amount: bigint, rMin: number): Promise<{ intentId: string }> {
    return this.request('POST', '/api/v1/intents/lend', {
      lender,
      amount: amount.toString(),
      rMin,
    });
  }

  async submitBorrow(
    borrower: string,
    amount: bigint,
    rMax: number,
    collateral: bigint,
  ): Promise<{ intentId: string }> {
    return this.request('POST', '/api/v1/intents/borrow', {
      borrower,
      amount: amount.toString(),
      rMax,
      collateral: collateral.toString(),
    });
  }

  async cancelIntent(id: string): Promise<{ ok: boolean; kind: 'lend' | 'borrow' }> {
    return this.request('POST', `/api/v1/intents/${id}/cancel`);
  }

  async listIntents(): Promise<{
    lends: LendIntentDto[];
    borrows: BorrowIntentDto[];
    loans: LoanDto[];
  }> {
    return this.request('GET', '/api/v1/intents');
  }

  async listIntentsByAddress(
    addr: string,
  ): Promise<{ lends: LendIntentDto[]; borrows: BorrowIntentDto[] }> {
    return this.request('GET', `/api/v1/intents/by/${addr}`);
  }

  async listMatches(addr: string): Promise<{ loans: LoanDto[] }> {
    return this.request('GET', `/api/v1/matches/${addr}`);
  }

  async confirmSettlement(loanId: string, txId: string): Promise<{ ok: boolean; loan: LoanDto }> {
    return this.request('POST', `/api/v1/loans/${loanId}/settle`, { txId });
  }
}
