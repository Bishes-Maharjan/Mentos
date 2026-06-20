import { useNavigate } from 'react-router-dom';
import { Download } from 'lucide-react';
import type { AnnexRow, AnnexTotals } from '../types';
import { formatNPR } from '../api/client';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';

interface AnnexTableProps {
  title: string;
  rows: AnnexRow[];
  totals: AnnexTotals;
  loading: boolean;
  onExport: () => void;
  period: string;
}

export default function AnnexTable({
  title,
  rows,
  totals,
  loading,
  onExport,
  period,
}: AnnexTableProps) {
  const navigate = useNavigate();

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 'var(--space-4)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>{title}</h2>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>
            Period: {period} · {rows.length} record{rows.length !== 1 ? 's' : ''}
          </p>
        </div>
        {rows.length > 0 && (
          <button className="btn btn--primary" onClick={onExport}>
            <Download size={16} />
            Export Excel
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No records found"
          description={`No records found for the period ${period}. Upload receipts to populate this register.`}
          actionLabel="Upload Receipt"
          onAction={() => navigate('/upload')}
        />
      ) : (
        <div className="annex-table-wrapper">
          <table className="annex-table">
            <thead>
              <tr>
                <th>
                  S.N.
                  <span className="th-nepali">क्र.सं.</span>
                </th>
                <th>
                  Buyer/Seller Name
                  <span className="th-nepali">खरिदकर्ता/विक्रेताको नाम</span>
                </th>
                <th>
                  PAN
                  <span className="th-nepali">स्थायी लेखा नं.</span>
                </th>
                <th>
                  Invoice No.
                  <span className="th-nepali">बिजक नं.</span>
                </th>
                <th>
                  Date
                  <span className="th-nepali">मिति</span>
                </th>
                <th>
                  Transaction Type
                  <span className="th-nepali">लेनदेनको किसिम</span>
                </th>
                <th className="annex-table__amount">
                  Total Amount
                  <span className="th-nepali">कुल रकम</span>
                </th>
                <th className="annex-table__amount">
                  Taxable Amount
                  <span className="th-nepali">कर योग्य रकम</span>
                </th>
                <th className="annex-table__amount">
                  VAT Amount
                  <span className="th-nepali">मूअकर रकम</span>
                </th>
                <th className="annex-table__amount">
                  Exempt Amount
                  <span className="th-nepali">कर छुट रकम</span>
                </th>
                <th className="annex-table__amount">
                  Export Amount
                  <span className="th-nepali">निर्यात रकम</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.receiptId}
                  onClick={() => navigate(`/receipts/${row.receiptId}`)}
                >
                  <td>{row.sn}</td>
                  <td>{row.buyerSellerName}</td>
                  <td>{row.pan}</td>
                  <td>{row.invoiceNumber}</td>
                  <td>{row.date}</td>
                  <td>{row.transactionType}</td>
                  <td className="annex-table__amount">{formatNPR(row.totalSalesAmount)}</td>
                  <td className="annex-table__amount">{formatNPR(row.taxableAmount)}</td>
                  <td className="annex-table__amount">{formatNPR(row.vatAmount)}</td>
                  <td className="annex-table__amount">{formatNPR(row.exemptAmount)}</td>
                  <td className="annex-table__amount">{formatNPR(row.exportAmount)}</td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="annex-table__total-row">
                <td></td>
                <td><strong>TOTAL</strong></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td className="annex-table__amount">{formatNPR(totals.totalSalesAmount)}</td>
                <td className="annex-table__amount">{formatNPR(totals.taxableAmount)}</td>
                <td className="annex-table__amount">{formatNPR(totals.vatAmount)}</td>
                <td className="annex-table__amount">{formatNPR(totals.exemptAmount)}</td>
                <td className="annex-table__amount">{formatNPR(totals.exportAmount)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
