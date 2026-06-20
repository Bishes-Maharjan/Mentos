import { useState } from 'react';

interface MonthYearPickerProps {
  month: number | '';
  year: number | '';
  onChange: (month: number | '', year: number | '') => void;
}

const MONTHS = [
  'Baishakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra',
];

export default function MonthYearPicker({ month, year, onChange }: MonthYearPickerProps) {
  const isAll = month === '' || year === '';
  const [filterType, setFilterType] = useState(isAll ? 'all' : 'date');

  // Current BS year approximately 2081
  const currentYear = 2081;
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === 'all') {
      setFilterType('all');
      onChange('', '');
    } else {
      setFilterType('date');
      // Default to Shrawan (4) of current year
      onChange(4, 2081);
    }
  };

  return (
    <div className="month-year-picker" style={{ display: 'flex', gap: 'var(--space-2)' }}>
      <select value={filterType} onChange={handleTypeChange}>
        <option value="all">All Time</option>
        <option value="date">Specific Date</option>
      </select>
      
      {filterType === 'date' && (
        <>
          <select
            value={month}
            onChange={(e) => onChange(Number(e.target.value), year === '' ? currentYear : year)}
          >
            {MONTHS.map((name, i) => (
              <option key={i} value={i + 1}>{name}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => onChange(month === '' ? 1 : month, Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </>
      )}
    </div>
  );
}
