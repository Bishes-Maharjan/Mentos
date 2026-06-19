import { useState, useEffect, useCallback } from 'react';
import { getAnnexPurchases, downloadAnnexExcel } from '../api/client';
import type { AnnexRow, AnnexTotals } from '../types';
import AnnexTable from '../components/AnnexTable';
import MonthYearPicker from '../components/MonthYearPicker';

export default function AnnexPurchases() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [rows, setRows] = useState<AnnexRow[]>([]);
  const [totals, setTotals] = useState<AnnexTotals>({
    totalSalesAmount: 0,
    taxableAmount: 0,
    vatAmount: 0,
    exemptAmount: 0,
  });
  const [period, setPeriod] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAnnexPurchases({ month, year });
      setRows(data.rows);
      setTotals(data.totals);
      setPeriod(data.period);
    } catch (err) {
      console.error('Annex purchases fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
