import { useQuery } from '@tanstack/react-query';
import { getMonthlyBreakdown, formatNPR } from '../api/client';
import LoadingSpinner from './LoadingSpinner';

interface MonthlyBreakdownProps {
  year?: number | '';
}

export default function MonthlyBreakdown({ year }: MonthlyBreakdownProps) {
  // If year is empty string, we omit it or pass undefined so backend uses current year
  const queryYear = year === '' ? undefined : year;
  
  const { data, isLoading } = useQuery({
    queryKey: ['monthlyBreakdown', queryYear],
    queryFn: () => getMonthlyBreakdown(queryYear),
  });

  if (isLoading) return <LoadingSpinner />;
  if (!data || data.months.length === 0) return null;

  const { months } = data;
  
  // Find max amounts for scaling bars
  const maxSales = Math.max(...months.map(m => m.salesAmount), 1);
  const maxPurchases = Math.max(...months.map(m => m.purchasesAmount), 1);
  const maxAmount = Math.max(maxSales, maxPurchases);

  return (
    <div style={{ position: 'relative', height: '100%', minHeight: '380px' }}>
      <div className="card" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column' }}>
        <h3 className="card__title">Monthly Breakdown ({data.year})</h3>
        <div className="monthly-breakdown" style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', minHeight: 0 }}>
        {months.map((m) => (
          <div key={m.month} className="monthly-breakdown__row">
            <div className="monthly-breakdown__label">{m.monthName.substring(0, 3)}</div>
            <div className="monthly-breakdown__bars">
              <div 
                className="monthly-breakdown__bar monthly-breakdown__bar--sales"
                style={{ width: `${(m.salesAmount / maxAmount) * 100}%` }}
                title={`Sales: ${formatNPR(m.salesAmount)}`}
              />
              <div 
                className="monthly-breakdown__bar monthly-breakdown__bar--purchases"
                style={{ width: `${(m.purchasesAmount / maxAmount) * 100}%` }}
                title={`Purchases: ${formatNPR(m.purchasesAmount)}`}
              />
            </div>
            <div className="monthly-breakdown__values">
              <span className="text-success">{formatNPR(m.salesAmount)}</span>
              <span className="text-danger">{formatNPR(m.purchasesAmount)}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="monthly-breakdown__legend">
        <span className="legend-item"><span className="legend-color bg-success"></span> Sales</span>
        <span className="legend-item"><span className="legend-color bg-danger"></span> Purchases</span>
      </div>
    </div>
    </div>
  );
}
