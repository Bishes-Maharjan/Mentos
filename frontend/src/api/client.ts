import axios from 'axios';
import type {
  Receipt,
  PANValidation,
  Pagination,
  VATSummary,
  MonthData,
  AnnexResponse,
} from '../types';

const api = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kaji_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============================================================
// Receipt operations
// ============================================================

export async function uploadReceipt(
  file: File,
  type: 'sale' | 'purchase'
): Promise<{ message: string; receipt: Receipt; panValidation: PANValidation | null }> {
  const formData = new FormData();
  formData.append('receipt', file);
  formData.append('type', type);
  const res = await api.post('/api/receipts/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function getReceipts(
  params?: { type?: string; month?: number | ''; year?: number | ''; limit?: number; page?: number }
): Promise<{ receipts: Receipt[]; pagination: Pagination }> {
  const res = await api.get('/api/receipts', { params });
  return res.data;
}

export async function getReceipt(id: string): Promise<Receipt> {
  const res = await api.get(`/api/receipts/${id}`);
  return res.data;
}

export async function updateReceipt(
  id: string,
  data: Partial<Receipt>
): Promise<{ message: string; receipt: Receipt; panValidation: PANValidation | null }> {
  const res = await api.put(`/api/receipts/${id}`, data);
  return res.data;
}

export async function deleteReceipt(id: string): Promise<{ message: string }> {
  const res = await api.delete(`/api/receipts/${id}`);
  return res.data;
}

export async function validatePAN(
  id: string,
  pan?: string
): Promise<{ pan: string; validation: PANValidation }> {
  const res = await api.post(`/api/receipts/${id}/validate-pan`, pan ? { pan } : {});
  return res.data;
}

// ============================================================
// VAT operations
// ============================================================

export async function getVATSummary(
  params?: { month?: number | ''; year?: number | '' }
): Promise<VATSummary> {
  const res = await api.get('/api/vat/summary', { params });
  return res.data;
}

export async function getMonthlyBreakdown(
  year?: number
): Promise<{ year: number; months: MonthData[] }> {
  const res = await api.get('/api/vat/monthly-breakdown', { params: { year } });
  return res.data;
}

// ============================================================
// Annex operations
// ============================================================

export async function getAnnexSales(
  params?: { month?: number | ''; year?: number | '' }
): Promise<AnnexResponse> {
  const res = await api.get('/api/annex/sales', { params });
  return res.data;
}

export async function getAnnexPurchases(
  params?: { month?: number | ''; year?: number | '' }
): Promise<AnnexResponse> {
  const res = await api.get('/api/annex/purchases', { params });
  return res.data;
}

export async function downloadAnnexExcel(
  type: 'sales' | 'purchases',
  params?: { month?: number | ''; year?: number | '' }
): Promise<void> {
  const res = await api.get(`/api/annex/export/${type}`, {
    params,
    responseType: 'blob',
  });
  const annexNum = type === 'sales' ? '10' : '13';
  const period =
    params?.month && params?.year
      ? `${params.year}-${String(params.month).padStart(2, '0')}`
      : 'all';
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Annex_${annexNum}_${period}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// D2 Tax Return operations
// ============================================================

export interface D2Return {
  _id: string;
  userId: string;
  fiscalYear: string;
  month: number;
  totalSales: number;
  totalPurchases: number;
  outputVAT: number;
  inputVAT: number;
  creditBroughtForward: number;
  netVATPayable: number;
  isSubmitted: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getD2Returns(
  params?: { fiscalYear?: string }
): Promise<D2Return[]> {
  const res = await api.get('/api/d2', { params });
  return res.data;
}

export async function calculateD2(data: {
  fiscalYear: string;
  month: number;
}): Promise<{ message: string; d2: D2Return; receiptsCount: number }> {
  const res = await api.post('/api/d2/calculate', data);
  return res.data;
}

export async function deleteD2Return(id: string): Promise<{ message: string }> {
  const res = await api.delete(`/api/d2/${id}`);
  return res.data;
}

// ============================================================
// Auth operations
// ============================================================

export interface RegisterPayload {
  businessName: string;
  ownerName?: string;
  pan: string;
  address?: string;
  municipality?: string;
  district?: string;
  province?: number;
  phone?: string;
  email?: string;
  vatRegistered?: boolean;
  isNewBusiness: boolean;
  fiscalYearStart?: string;
  latestD2?: {
    fiscalYear: string;
    month: number;
    totalSales?: number;
    totalPurchases?: number;
    outputVAT?: number;
    inputVAT?: number;
    creditBroughtForward?: number;
    netVATPayable?: number;
  };
}

export async function registerUser(data: RegisterPayload) {
  const res = await api.post('/api/users/register', data);
  return res.data;
}

export async function loginUser(data: { pan: string; email?: string; phone?: string }) {
  const res = await api.post('/api/users/login', data);
  return res.data;
}

// ============================================================
// Utility
// ============================================================

export function formatNPR(amount: number): string {
  return `NPR ${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
