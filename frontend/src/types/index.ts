export interface ReceiptItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  vatApplicable: boolean;
}

export interface Receipt {
  _id: string;
  partyName: string;
  partyPAN: string | null;
  invoiceNumber: string | null;
  date: string | null;
  dateBS: string;
  transactionType: 'domestic' | 'export' | 'exempt' | 'import';
  fiscalYear: string;
  nepaliMonth: number | null;
  items: ReceiptItem[];
  subtotal: number;
  vatAmount: number;
  total: number;
  type: 'sale' | 'purchase';
  confidence: 'high' | 'medium' | 'low';
  notes: string[];
  imagePath: string;
  rawText: string;
  taxableAmount: number;
  exemptAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AnnexRow {
  sn: number;
  buyerSellerName: string;
  pan: string;
  invoiceNumber: string;
  date: string;
  totalSalesAmount: number;
  taxableAmount: number;
  vatAmount: number;
  exemptAmount: number;
  exportAmount: number;
  receiptId: string;
  transactionType: string;
}

export interface AnnexTotals {
  totalSalesAmount: number;
  taxableAmount: number;
  vatAmount: number;
  exemptAmount: number;
  exportAmount: number;
}

export interface AnnexResponse {
  annex: string;
  title: string;
  period: string;
  rows: AnnexRow[];
  totals: AnnexTotals;
  count: number;
}

export interface VATSummary {
  period: string;
  sales: {
    count: number;
    totalAmount: number;
    taxableAmount: number;
    outputVAT: number;
  };
  purchases: {
    count: number;
    totalAmount: number;
    taxableAmount: number;
    inputVAT: number;
  };
  vatLiability: {
    outputVAT: number;
    inputVAT: number;
    netVAT: number;
    status: 'payable' | 'refundable' | 'nil';
    statusLabel: string;
  };
}

export interface PANValidation {
  valid: boolean;
  message: string;
  suspended?: boolean;
}

export interface MonthData {
  month: number;
  monthName: string;
  outputVAT: number;
  inputVAT: number;
  netVAT: number;
  salesCount: number;
  purchasesCount: number;
  salesAmount: number;
  purchasesAmount: number;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}
