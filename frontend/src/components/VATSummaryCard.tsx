import type { VATSummary } from '../types';
import { formatNPR } from '../api/client';
import LoadingSpinner from './LoadingSpinner';

interface VATSummaryCardProps {
  summary: VATSummary | null;
  loading: boolean;
}

export default function VATSummaryCard({ summary, loading }: VATSummaryCardProps) {
  if (loading) {
    return (
      <div className="vat-summary">
        <div className="vat-summary__header">
          <span className="vat-summary__header-title">VAT Liability Summary</span>
        </div>
        <div className="vat-summary__body">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const { sales, purchases, vatLiability } = summary;

  const netClass =
    vatLiability.status === 'payable'
      ? 'vat-summary__metric--net-payable'
      : vatLiability.status === 'refundable'
        ? 'vat-summary__metric--net-refundable'
        : 'vat-summary__metric--net-nil';

  const netColor =
    vatLiability.status === 'payable'
      ? 'var(--danger)'
      : vatLiability.status === 'refundable'
        ? 'var(--success)'
        : 'var(--text-secondary)';

  return (
    <div className="vat-summary" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="vat-summary__header">
        <span className="vat-summary__header-title">VAT Liability Summary</span>
        <span className="vat-summary__header-period">{summary.period}</span>
      </div>
      <div className="vat-summary__body" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="vat-summary__metrics">
          {/* Output VAT */}
          <div className="vat-summary__metric vat-summary__metric--sales">
            <div className="vat-summary__metric-label">Output VAT (Sales)</div>
            <div className="vat-summary__metric-value" style={{ color: 'var(--success)' }}>
              {formatNPR(sales.outputVAT)}
            </div>
            <div className="vat-summary__metric-count">
              {sales.count} receipt{sales.count !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="vat-summary__operator">−</div>

          {/* Input VAT */}
          <div className="vat-summary__metric vat-summary__metric--purchases">
            <div className="vat-summary__metric-label">Input VAT (Purchases)</div>
            <div className="vat-summary__metric-value" style={{ color: 'var(--info)' }}>
              {formatNPR(purchases.inputVAT)}
            </div>
            <div className="vat-summary__metric-count">
              {purchases.count} receipt{purchases.count !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="vat-summary__operator">=</div>

          {/* Net VAT */}
          <div className={`vat-summary__metric ${netClass}`}>
            <div className="vat-summary__metric-label">Net VAT</div>
            <div className="vat-summary__metric-value" style={{ color: netColor }}>
              {formatNPR(Math.abs(vatLiability.netVAT))}
            </div>
          </div>
        </div>

        {/* Status line */}
        <div className="vat-summary__status" style={{ color: netColor, marginTop: 'auto' }}>
          {vatLiability.statusLabel}
        </div>
      </div>
    </div>
  );
}
