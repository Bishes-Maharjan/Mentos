interface MonthYearPickerProps {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function MonthYearPicker({ month, year, onChange }: MonthYearPickerProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="month-year-picker">
      <select
        value={month}
        onChange={(e) => onChange(Number(e.target.value), year)}
      >
        {MONTHS.map((name, i) => (
          <option key={i} value={i + 1}>
            {name}
          </option>
        ))}
      </select>
      <select
        value={year}
        onChange={(e) => onChange(month, Number(e.target.value))}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
