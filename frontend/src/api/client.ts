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
  params?: { type?: string; month?: number; year?: number; limit?: number; page?: number }
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
  params?: { month?: number; year?: number }
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
  params?: { month?: number; year?: number }
): Promise<AnnexResponse> {
  const res = await api.get('/api/annex/sales', { params });
  return res.data;
}

export async function getAnnexPurchases(
  params?: { month?: number; year?: number }
): Promise<AnnexResponse> {
  const res = await api.get('/api/annex/purchases', { params });
  return res.data;
}

export async function downloadAnnexExcel(
  type: 'sales' | 'purchases',
  params?: { month?: number; year?: number }
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
// Utility
// ============================================================

export function formatNPR(amount: number): string {
  return `NPR ${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
