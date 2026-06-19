import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Receipt as ReceiptIcon, ShoppingCart, TrendingUp, BarChart3 } from 'lucide-react';
import { getReceipts, getVATSummary, formatNPR } from '../api/client';
import type { Receipt, VATSummary } from '../types';
import VATSummaryCard from '../components/VATSummaryCard';
import ReceiptCard from '../components/ReceiptCard';
import MonthYearPicker from '../components/MonthYearPicker';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Dashboard() {
  const navigate = useNavigate();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [vatSummary, setVatSummary] = useState<VATSummary | null>(null);
  const [recentReceipts, setRecentReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalReceipts, setTotalReceipts] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, receiptsRes] = await Promise.all([
        getVATSummary({ month, year }),
        getReceipts({ limit: 10 }),
      ]);
      setVatSummary(summaryRes);
      setRecentReceipts(receiptsRes.receipts);
      setTotalReceipts(receiptsRes.pagination.total);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !vatSummary) {
    return <LoadingSpinner size="lg" />;
  }

  const salesCount = vatSummary?.sales.count ?? 0;
  const purchasesCount = vatSummary?.purchases.count ?? 0;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Dashboard</h1>
          <p className="page-header__subtitle">
            Kaji.ai — Your VAT compliance overview
          </p>
        </div>
        <MonthYearPicker
          month={month}
          year={year}
          onChange={(m, y) => { setMonth(m); setYear(y); }}
        />
      </div>

      {/* Quick Actions */}
      <div className="dashboard__quick-actions">
        <div className="dashboard__quick-action" onClick={() => navigate('/upload')}>
          <div className="dashboard__quick-action-icon dashboard__quick-action-icon--upload">
            <Upload size={24} />
          </div>
          <div className="dashboard__quick-action-text">
            <h3>Upload Receipt</h3>
            <p>Scan & extract receipt data with AI</p>
          </div>
        </div>
        <div className="dashboard__quick-action" onClick={() => navigate('/annex/sales')}>
          <div className="dashboard__quick-action-icon dashboard__quick-action-icon--annex">
            <FileText size={24} />
          </div>
          <div className="dashboard__quick-action-text">
            <h3>View Annex Reports</h3>
            <p>Generate IRD-ready Annex 10 & 13</p>
          </div>
        </div>
      </div>

      {/* VAT Summary */}
      <div className="dashboard__section">
        <VATSummaryCard summary={vatSummary} loading={loading} />
      </div>

      {/* Stats */}
      <div className="dashboard__stats">
        <div className="stat-card">
          <BarChart3 size={20} className="stat-card__icon" />
          <div className="stat-card__label">Total Receipts</div>
          <div className="stat-card__value">{totalReceipts}</div>
        </div>
        <div className="stat-card">
          <TrendingUp size={20} className="stat-card__icon" />
          <div className="stat-card__label">Sales Volume</div>
          <div className="stat-card__value" style={{ fontSize: 'var(--font-size-xl)' }}>
            {formatNPR(vatSummary?.sales.totalAmount ?? 0)}
          </div>
        </div>
        <div className="stat-card">
          <ShoppingCart size={20} className="stat-card__icon" />
          <div className="stat-card__label">Purchase Volume</div>
          <div className="stat-card__value" style={{ fontSize: 'var(--font-size-xl)' }}>
            {formatNPR(vatSummary?.purchases.totalAmount ?? 0)}
          </div>
        </div>
        <div className="stat-card">
          <ReceiptIcon size={20} className="stat-card__icon" />
          <div className="stat-card__label">This Month</div>
          <div className="stat-card__value">{salesCount + purchasesCount}</div>
        </div>
      </div>

      {/* Recent Receipts */}
      <div className="dashboard__section">
        <div className="dashboard__section-header">
          <h2 className="dashboard__section-title">Recent Receipts</h2>
          {totalReceipts > 10 && (
            <button className="btn btn--ghost btn--sm" onClick={() => navigate('/annex/sales')}>
              View All →
            </button>
          )}
        </div>

        {recentReceipts.length === 0 ? (
          <EmptyState
            title="No receipts yet"
            description="Upload your first receipt to get started with VAT tracking"
            actionLabel="Upload Receipt"
            onAction={() => navigate('/upload')}
          />
        ) : (
          <div className="dashboard__receipts-list">
            {recentReceipts.map((receipt) => (
              <ReceiptCard
                key={receipt._id}
                receipt={receipt}
                onClick={() => navigate(`/receipts/${receipt._id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
