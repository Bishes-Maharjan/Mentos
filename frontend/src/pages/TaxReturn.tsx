import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, CheckCircle, Clock, Trash2, Calculator, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { getD2Returns, calculateD2, deleteD2Return, formatNPR } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';

const bsMonthNames = [
  "Baishakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"
];

// Generate reasonable BS fiscal years (e.g. 2078/79 → 2082/83)
const currentBsYear = 2081;
const fiscalYearOptions = Array.from({ length: 6 }, (_, i) => {
  const start = currentBsYear - 2 + i;
  const end = (start + 1) % 100;
  return `${start}/${String(end).padStart(2, '0')}`;
});

export default function TaxReturn() {
  const queryClient = useQueryClient();

  // Calculate form state
  const [showForm, setShowForm] = useState(false);
  const [formFY, setFormFY] = useState(fiscalYearOptions[2]); // default current-ish year
  const [formMonth, setFormMonth] = useState(1);

  const { data: returns, isLoading } = useQuery({
    queryKey: ['d2Returns'],
    queryFn: () => getD2Returns(),
  });

  const calcMutation = useMutation({
    mutationFn: calculateD2,
    onSuccess: (res) => {
      toast.success(`D2 calculated — ${res.receiptsCount} receipt(s) processed`);
      queryClient.invalidateQueries({ queryKey: ['d2Returns'] });
      setShowForm(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Calculation failed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteD2Return,
    onSuccess: () => {
      toast.success('Tax return deleted');
      queryClient.invalidateQueries({ queryKey: ['d2Returns'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Delete failed');
    },
  });

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    calcMutation.mutate({ fiscalYear: formFY, month: formMonth });
  };

  const handleDelete = (id: string, fiscalYear: string, monthName: string) => {
    if (!window.confirm(`Are you sure you want to delete the D2 return for ${monthName} ${fiscalYear}? This action cannot be undone.`)) {
      return;
    }
    deleteMutation.mutate(id);
  };

  const d2Returns = returns || [];

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 className="page-header__title">Tax Returns (D2)</h1>
          <p className="page-header__subtitle">
            Monthly VAT return computations — auto-generated or manually triggered
          </p>
        </div>
        <button
          className="btn btn--primary"
          onClick={() => setShowForm(prev => !prev)}
        >
          <Calculator size={16} />
          Calculate Return
          <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: showForm ? 'rotate(180deg)' : 'none' }} />
        </button>
      </div>

      {/* Calculate Form Panel */}
      {showForm && (
        <div className="card card--glass" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-6)' }}>
          <h3 style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>
            Calculate D2 for a specific period
          </h3>
          <form onSubmit={handleCalculate}>
            <div className="receipt-form__grid" style={{ marginBottom: 'var(--space-4)' }}>
              <div className="receipt-form__field">
                <label className="receipt-form__label">Fiscal Year *</label>
                <select
                  value={formFY}
                  onChange={(e) => setFormFY(e.target.value)}
                  required
                >
                  {fiscalYearOptions.map(fy => (
                    <option key={fy} value={fy}>{fy}</option>
                  ))}
                </select>
              </div>
              <div className="receipt-form__field">
                <label className="receipt-form__label">Month *</label>
                <select
                  value={formMonth}
                  onChange={(e) => setFormMonth(parseInt(e.target.value))}
                  required
                >
                  {bsMonthNames.map((name, i) => (
                    <option key={i + 1} value={i + 1}>{name} ({i + 1})</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={calcMutation.isPending}
              >
                <Calculator size={16} />
                {calcMutation.isPending ? 'Calculating...' : `Calculate ${bsMonthNames[formMonth - 1]} ${formFY}`}
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Records Table */}
      {isLoading ? (
        <LoadingSpinner size="lg" />
      ) : d2Returns.length === 0 ? (
        <div className="card" style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
          <FileText size={40} style={{ color: 'var(--text-tertiary)', margin: '0 auto var(--space-4)' }} />
          <h3 style={{ marginBottom: 'var(--space-2)', color: 'var(--text-secondary)' }}>No Tax Returns yet</h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
            Use the "Calculate Return" button to generate your first D2, or they will auto-generate monthly.
          </p>
        </div>
      ) : (
        <div className="card">
          <div className="annex-table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="annex-table">
              <thead>
                <tr>
                  <th>Period (F.Y. / Month)</th>
                  <th className="annex-table__amount">Total Sales</th>
                  <th className="annex-table__amount">Total Purchases</th>
                  <th className="annex-table__amount">Output VAT</th>
                  <th className="annex-table__amount">Input VAT</th>
                  <th className="annex-table__amount">Credit B/F</th>
                  <th className="annex-table__amount">Net VAT Payable</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {d2Returns.map((doc) => {
                  const isCredit = doc.netVATPayable < 0;
                  const monthName = doc.month >= 1 && doc.month <= 12 ? bsMonthNames[doc.month - 1] : String(doc.month);
                  return (
                    <tr key={doc._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <FileText size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                          <span style={{ fontWeight: 500 }}>{doc.fiscalYear}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                            ({monthName})
                          </span>
                        </div>
                      </td>
                      <td className="annex-table__amount">{formatNPR(doc.totalSales)}</td>
                      <td className="annex-table__amount">{formatNPR(doc.totalPurchases)}</td>
                      <td className="annex-table__amount">{formatNPR(doc.outputVAT)}</td>
                      <td className="annex-table__amount">{formatNPR(doc.inputVAT)}</td>
                      <td className="annex-table__amount" style={{ color: 'var(--text-secondary)' }}>
                        {formatNPR(doc.creditBroughtForward)}
                      </td>
                      <td className="annex-table__amount">
                        <span style={{
                          fontWeight: 600,
                          color: isCredit ? 'var(--primary)' : 'var(--danger)'
                        }}>
                          {isCredit ? `(${formatNPR(Math.abs(doc.netVATPayable))})` : formatNPR(doc.netVATPayable)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {doc.isSubmitted ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', fontSize: 'var(--font-size-sm)', background: 'var(--primary-muted)', padding: '2px 8px', borderRadius: '12px' }}>
                            <CheckCircle size={14} /> Submitted
                          </div>
                        ) : (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--warning)', fontSize: 'var(--font-size-sm)', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                            <Clock size={14} /> Pending
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn btn--danger btn--sm"
                          onClick={() => handleDelete(doc._id, doc.fiscalYear, monthName)}
                          disabled={deleteMutation.isPending}
                          title="Delete this return"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
