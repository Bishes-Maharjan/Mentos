import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getD2Detail, downloadD2Export, formatNPR } from '../api/client';
import { Download } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import type { Receipt } from '../types';

interface Props {
  d2Id: string;
}

export default function D2RowDetail({ d2Id }: Props) {
  const [isExporting, setIsExporting] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ['d2Detail', d2Id],
    queryFn: () => getD2Detail(d2Id),
  });

  if (isLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}><LoadingSpinner size="md" /></div>;
  }

  if (error || !data) {
    return <div style={{ padding: '2rem', color: 'var(--danger)', textAlign: 'center' }}>Failed to load details.</div>;
  }

  const { d2, sales, purchases } = data;

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await downloadD2Export(d2._id, d2.fiscalYear, d2.month);
    } catch (err) {
      console.error('Failed to export:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const renderLedger = (title: string, receipts: Receipt[]) => (
    <div style={{ marginTop: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
      <h4 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
        {title}
      </h4>
      {receipts.length === 0 ? (
        <div style={{ padding: 'var(--space-2)', background: 'var(--surface-primary)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          No records found.
        </div>
      ) : (
        <div className="annex-table-wrapper" style={{ background: 'var(--bg-primary)', overflowX: 'auto' }}>
          <table className="annex-table" style={{ fontSize: 'var(--font-size-sm)', tableLayout: 'fixed', width: '100%', minWidth: '650px' }}>
            <colgroup>
              <col style={{ width: '120px' }} />
              <col style={{ width: '180px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '110px' }} />
            </colgroup>
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
                  <tr key={r._id}>
                    <td style={{ overflow: 'auto', whiteSpace: 'nowrap' }}>{r.dateBS || new Date(r.date || '').toLocaleDateString()}</td>
                    <td style={{ overflow: 'auto', whiteSpace: 'nowrap' }}>{r.partyName || 'N/A'}</td>
                    <td style={{ overflow: 'auto', whiteSpace: 'nowrap' }}>{r.partyPAN || 'N/A'}</td>
                    <td style={{ overflow: 'auto', whiteSpace: 'nowrap' }}>{r.invoiceNumber || 'N/A'}</td>
                    <td className="annex-table__amount" style={{ overflow: 'auto', whiteSpace: 'nowrap' }}>{formatNPR(taxableAmount)}</td>
                    <td className="annex-table__amount" style={{ overflow: 'auto', whiteSpace: 'nowrap' }}>{formatNPR(r.vatAmount)}</td>
                    <td className="annex-table__amount" style={{ overflow: 'auto', whiteSpace: 'nowrap' }}>{formatNPR(r.total)}</td>
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
    <div style={{ padding: 'var(--space-4)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h3 style={{ fontSize: 'var(--font-size-lg)', margin: 0 }}>Audit Ledger</h3>
        <button 
          className="btn btn--primary btn--sm" 
          onClick={handleExport}
          disabled={isExporting}
        >
          <Download size={14} />
          {isExporting ? 'Exporting...' : 'Export Excel'}
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {renderLedger('Sales Ledger (Output VAT)', sales)}
        {renderLedger('Purchase Ledger (Input VAT)', purchases)}
      </div>
    </div>
  );
}
