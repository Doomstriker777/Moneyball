import {
  Account,
  AuthResponse,
  DepositRequest,
  PostingResponse,
  StatementResponse,
  TransferRequest,
  WithdrawalRequest,
  ReconciliationReport,
  HashChainVerificationReport,
  Flag,
  FlagReviewRequest,
  ReversalRequest,
  AuditPackResponse
} from '../types';

class ApiError extends Error {
  status: number;
  title?: string;
  detail?: string;
  data?: any;

  constructor(status: number, message: string, detail?: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.data = data;
  }
}

class ApiClient {
  private getHeaders(idempotencyKey?: string): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const token = localStorage.getItem('ledgerline_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}, idempotencyKey?: string): Promise<T> {
    const headers = {
      ...this.getHeaders(idempotencyKey),
      ...(options.headers || {})
    };

    const response = await fetch(endpoint, {
      ...options,
      headers
    });

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {
        errorData = { detail: response.statusText };
      }

      const message = errorData.detail || errorData.title || `Request failed with status ${response.status}`;
      throw new ApiError(response.status, message, errorData.detail, errorData);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // --- Auth API ---
  async login(email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  // --- Accounts API ---
  async getAccounts(): Promise<Account[]> {
    return this.request<Account[]>('/api/accounts');
  }

  async getAccount(id: number): Promise<Account> {
    return this.request<Account>(`/api/accounts/${id}`);
  }

  async getStatement(accountId: number): Promise<StatementResponse> {
    return this.request<StatementResponse>(`/api/accounts/${accountId}/statement`);
  }

  // --- Money Operations (with Idempotency-Key) ---
  async transfer(request: TransferRequest, idempotencyKey: string): Promise<PostingResponse> {
    return this.request<PostingResponse>('/api/transfers', {
      method: 'POST',
      body: JSON.stringify(request)
    }, idempotencyKey);
  }

  async deposit(request: DepositRequest, idempotencyKey: string): Promise<PostingResponse> {
    return this.request<PostingResponse>('/api/deposits', {
      method: 'POST',
      body: JSON.stringify(request)
    }, idempotencyKey);
  }

  async withdraw(request: WithdrawalRequest, idempotencyKey: string): Promise<PostingResponse> {
    return this.request<PostingResponse>('/api/withdrawals', {
      method: 'POST',
      body: JSON.stringify(request)
    }, idempotencyKey);
  }

  // --- Audit & Reconciliation API ---
  async getReconciliation(): Promise<ReconciliationReport> {
    return this.request<ReconciliationReport>('/api/audit/reconcile');
  }

  async verifyHashChains(): Promise<HashChainVerificationReport> {
    return this.request<HashChainVerificationReport>('/api/audit/verify');
  }

  async exportAuditPack(): Promise<AuditPackResponse> {
    return this.request<AuditPackResponse>('/api/audit/export');
  }

  async getFlags(status?: string): Promise<Flag[]> {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request<Flag[]>(`/api/audit/flags${q}`);
  }

  async reviewFlag(id: number, request: FlagReviewRequest): Promise<Flag> {
    return this.request<Flag>(`/api/audit/flags/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  // --- Account Admin Controls ---
  async updateAccountStatus(id: number, status: 'ACTIVE' | 'FROZEN'): Promise<Account> {
    return this.request<Account>(`/api/accounts/${id}/status?status=${encodeURIComponent(status)}`, {
      method: 'PATCH'
    });
  }

  async updateOverdraftLimit(id: number, limitPaise: number): Promise<Account> {
    return this.request<Account>(`/api/accounts/${id}/overdraft-limit?limit=${limitPaise}`, {
      method: 'PATCH'
    });
  }

  // --- Reversals ---
  async reverseJournal(journalId: number, request: ReversalRequest, idempotencyKey?: string): Promise<PostingResponse> {
    return this.request<PostingResponse>(`/api/reversals/${journalId}`, {
      method: 'POST',
      body: JSON.stringify(request)
    }, idempotencyKey);
  }
}

export const api = new ApiClient();
export { ApiError };

