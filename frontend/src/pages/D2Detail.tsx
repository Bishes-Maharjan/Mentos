import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getD2Detail, formatNPR } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import { ArrowLeft } from 'lucide-react';
import type { Receipt } from '../types';

export default function D2Detail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['d2Detail', id],
    queryFn: () => getD2Detail(id!),
    enabled: !!id,
  });

  if (isLoading) return <LoadingSpinner size="lg" />;
  if (error || !data) {
    return (
      <div className="empty-state">
        <p>Error loading D2 details or not found.</p>
        <button className="btn" onClick={() => navigate('/tax-return')}>
          Go Back
        </button>
      </div>
    );
  }

  const { d2, sales, purchases } = data;

  const renderLedger = (title: string, receipts: Receipt[]) => (
    <div style={{ marginTop: 'var(--space-8)' }}>
      <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
        {title}
      </h3>
      {receipts.length === 0 ? (
        <div style={{ padding: 'var(--space-4)', background: 'var(--surface-secondary)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}>
          No records found for this period.
        </div>
      ) : (
        <div className="annex-table-wrapper">
          <table className="annex-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Party Name</th>
                <th>PAN</th>
                <th>Invoice No.</th>
                <th className="annex-table__amount">Taxable Amt</th>
                <th className="annex-table__amount">VAT Amt</th>
                <th className="annex-table__amount">Total Amt</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((r) => {
                const taxableAmount = r.items
                  .filter((i) => i.vatApplicable)
                  .reduce((sum, i) => sum + i.amount, 0);

                return (
                  <tr key={r._id} onClick={() => navigate(`/receipts/${r._id}`)} style={{ cursor: 'pointer' }}>
                    <td>{r.dateBS || new Date(r.date || '').toLocaleDateString()}</td>
                    <td>{r.partyName || 'N/A'}</td>
                    <td>{r.partyPAN || 'N/A'}</td>
                    <td>{r.invoiceNumber || 'N/A'}</td>
                    <td className="annex-table__amount">{formatNPR(taxableAmount)}</td>
                    <td className="annex-table__amount">{formatNPR(r.vatAmount)}</td>
                    <td className="annex-table__amount">{formatNPR(r.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <button 
            className="btn btn--icon" 
            style={{ marginBottom: 'var(--space-2)' }}
            onClick={() => navigate('/tax-return')}
          >
            <ArrowLeft size={20} />
            Back to Returns
          </button>
          <h1 className="page-header__title">VAT Audit Summary</h1>
          <p className="page-header__subtitle">
            Period: {d2.fiscalYear} — Month {d2.month}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span className={`status-badge status-badge--${d2.isSubmitted ? 'success' : 'warning'}`}>
            {d2.isSubmitted ? 'Submitted' : 'Draft'}
          </span>
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: 'var(--space-4)',
        background: 'var(--surface-primary)',
        padding: 'var(--space-6)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Output VAT (Sales)</p>
          <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, color: 'var(--text-primary)' }}>
            {formatNPR(d2.outputVAT)}
          </p>
        </div>
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Input VAT (Purchases)</p>
          <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, color: 'var(--text-primary)' }}>
            {formatNPR(d2.inputVAT)}
          </p>
        </div>
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Credit Brought Forward</p>
          <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, color: 'var(--text-primary)' }}>
            {formatNPR(d2.creditBroughtForward)}
          </p>
        </div>
        <div style={{ 
          borderLeft: '1px solid var(--border-color)', 
          paddingLeft: 'var(--space-4)'
        }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Net VAT Payable</p>
          <p style={{ 
            fontSize: 'var(--font-size-2xl)', 
            fontWeight: 700, 
            color: d2.netVATPayable < 0 ? 'var(--success-color)' : 'var(--error-color)'
          }}>
            {formatNPR(d2.netVATPayable)}
          </p>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
            {d2.netVATPayable < 0 ? '(Refundable / Carry Forward)' : '(Amount Due)'}
          </p>
        </div>
      </div>

      {renderLedger('Sales Ledger', sales)}
      {renderLedger('Purchase Ledger', purchases)}
    </div>
  );
}
