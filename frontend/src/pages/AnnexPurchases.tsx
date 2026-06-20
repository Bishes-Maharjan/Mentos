import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAnnexPurchases, downloadAnnexExcel } from '../api/client';
import type { AnnexRow, AnnexTotals } from '../types';
import AnnexTable from '../components/AnnexTable';
import MonthYearPicker from '../components/MonthYearPicker';

export default function AnnexPurchases() {
  const [month, setMonth] = useState<number | ''>('');
  const [year, setYear] = useState<number | ''>('');
  const { data, isLoading: loading } = useQuery({
    queryKey: ['annexPurchases', month, year],
    queryFn: () => getAnnexPurchases({ month, year }),
  });

  const rows = data?.rows || [];
  const totals = data?.totals || {
    totalSalesAmount: 0,
    taxableAmount: 0,
    vatAmount: 0,
    exemptAmount: 0,
    exportAmount: 0
  };
  const period = data?.period || '';

  const handleExport = useCallback(() => {
    downloadAnnexExcel('purchases', { month, year });
  }, [month, year]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Annex 13 — Purchase Register</h1>
          <p className="page-header__subtitle">अनुसूची १३ — खरिद खाता</p>
        </div>
        <MonthYearPicker
          month={month}
          year={year}
          onChange={(m, y) => { setMonth(m); setYear(y); }}
        />
      </div>

      <AnnexTable
        title="Purchase Register (Annex 13)"
        rows={rows}
        totals={totals}
        loading={loading}
        onExport={handleExport}
        period={period}
      />
    </div>
  );
}
