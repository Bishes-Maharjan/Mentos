import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAnnexSales, downloadAnnexExcel } from '../api/client';
import AnnexTable from '../components/AnnexTable';
import MonthYearPicker from '../components/MonthYearPicker';

export default function AnnexSales() {
  const [month, setMonth] = useState<number | ''>('');
  const [year, setYear] = useState<number | ''>('');
  const { data, isLoading: loading } = useQuery({
    queryKey: ['annexSales', month, year],
    queryFn: () => getAnnexSales({ month, year }),
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
    downloadAnnexExcel('sales', { month, year });
  }, [month, year]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Annex 10 — Sales Register</h1>
          <p className="page-header__subtitle">अनुसूची १० — बिक्री खाता</p>
        </div>
        <MonthYearPicker
          month={month}
          year={year}
          onChange={(m, y) => { setMonth(m); setYear(y); }}
        />
      </div>

      <AnnexTable
        title="Sales Register (Annex 10)"
        rows={rows}
        totals={totals}
        loading={loading}
        onExport={handleExport}
        period={period}
      />
    </div>
  );
}
