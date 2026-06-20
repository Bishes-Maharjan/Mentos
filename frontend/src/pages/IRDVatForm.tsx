import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type Row = {
  no: string;
  label: string;
  karobar?: boolean;
  kharidCredit?: boolean;
  bikriDebit?: boolean;
};

const section1: Row[] = [
  { no: "१.१.", label: "कर लाग्ने बिक्री / Taxable Sales", karobar: true, bikriDebit: true },
  { no: "१.२.", label: "निकासी / Exports", karobar: true },
  { no: "१.३.", label: "छुट बिक्री / Exempt Sales", karobar: true },
];

const section2: Row[] = [
  { no: "२.१.", label: "कर लाग्ने खरीद / Taxable Purchases", karobar: true, kharidCredit: true },
  { no: "२.२.", label: "कर लाग्ने पैठारी / Taxable Imports", karobar: true, kharidCredit: true },
  { no: "२.३.", label: "छुट खरीद / Exempt Purchases", karobar: true },
  { no: "२.४.", label: "छुट पैठारी / Exempt Imports", karobar: true },
];

function NumInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="ird-num-input"
    />
  );
}

export default function IRDVatForm() {
  const navigate = useNavigate();
  const [vals, setVals] = useState<Record<string, string>>({});

  const set = (k: string) => (v: string) =>
    setVals((p) => ({ ...p, [k]: v }));

  const num = (k: string) => Number(vals[k] || 0);

  const totalCredit = useMemo(
    () => num("2.1_c") + num("2.2_c") + num("3.1_c"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vals],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const totalDebit = useMemo(() => num("1.1_d") + num("3.1_d"), [vals]);
  const debitMinusCredit = totalDebit - totalCredit;
  const prevCredit = num("6");
  const payable = debitMinusCredit - prevCredit;

  const hasAny = Object.values(vals).some((v) => v && v.trim() !== "");

  const renderRow = (r: Row) => (
    <tr key={r.no} className="ird-data-row">
      <td>
        {r.no} {r.label}
      </td>
      <td>
        {r.karobar && (
          <NumInput
            value={vals[`${r.no.replace(/\.$/, "")}_k`] ?? ""}
            onChange={set(`${r.no.replace(/\.$/, "")}_k`)}
          />
        )}
      </td>
      <td>
        {r.kharidCredit && (
          <NumInput
            value={vals[`${r.no.replace(/\.$/, "")}_c`] ?? ""}
            onChange={set(`${r.no.replace(/\.$/, "")}_c`)}
          />
        )}
      </td>
      <td>
        {r.bikriDebit && (
          <NumInput
            value={vals[`${r.no.replace(/\.$/, "")}_d`] ?? ""}
            onChange={set(`${r.no.replace(/\.$/, "")}_d`)}
          />
        )}
      </td>
    </tr>
  );

  const sectionHeader = (text: string) => (
    <tr className="ird-section-header">
      <td colSpan={4}>{text}</td>
    </tr>
  );

  return (
    <div className="ird-page">
      <div className="ird-container">
        <p className="ird-instructions">
          यदि यस अवधिमा कारोबार नगरेको भए तलको महलमा शुन्य राखेर विवरणमा
          हस्ताक्षर गर्नुहोस्। रु १ भन्दा घटि भएमा पैसालाई रु. १ मा मिलान गरि
          विवरण भर्नुहोला।
          <br />
          <span className="ird-instructions-en">
            If no transactions occurred in this period, enter zero in the
            fields below and sign the return. Amounts under Rs. 1 should be
            rounded to Rs. 1.
          </span>
        </p>

        <table className="ird-table">
          <thead>
            <tr>
              <th style={{ width: '35%' }}></th>
              <th>
                कारोबार मूल्य
                <span className="ird-th-sub">Transaction Value</span>
              </th>
              <th>
                खरिदमा तिरेको कर क्रेडिट
                <span className="ird-th-sub">Tax Credit on Purchases</span>
              </th>
              <th>
                बिक्रिमा तिरेको कर डेबिट
                <span className="ird-th-sub">Tax Debit on Sales</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sectionHeader("१. बिक्री / 1. Sales")}
            {section1.map(renderRow)}
            {sectionHeader("२. खरिद पैठारी / 2. Purchases & Imports")}
            {section2.map(renderRow)}
            {sectionHeader("३. अन्य / 3. Other")}
            <tr className="ird-data-row">
              <td>३.१. अन्य थपघट / Other Adjustments</td>
              <td></td>
              <td>
                <NumInput value={vals["3.1_c"] ?? ""} onChange={set("3.1_c")} />
              </td>
              <td>
                <NumInput value={vals["3.1_d"] ?? ""} onChange={set("3.1_d")} />
              </td>
            </tr>
            <tr className="ird-section-header">
              <td>४.जम्मा / 4. Total</td>
              <td></td>
              <td>
                <input
                  readOnly
                  value={hasAny ? totalCredit : ""}
                  className="ird-num-input ird-num-input--readonly"
                />
              </td>
              <td>
                <input
                  readOnly
                  value={hasAny ? totalDebit : ""}
                  className="ird-num-input ird-num-input--readonly"
                />
              </td>
            </tr>
          </tbody>
        </table>

        <table className="ird-summary-table">
          <tbody>
            {[
              { label: "५. डेबिट-क्रेडिट (+ वा -) / Debit − Credit", value: hasAny ? debitMinusCredit : "" },
              {
                label: "६. गत महिनाको मिलान गर्न बाँकी क्रेडिट / Credit carried from previous month",
                value: vals["6"] ?? "",
                editable: true,
                key: "6",
              },
              { label: "७. तिर्नु पर्ने कर रू.(५-६) (+ वा -) / Tax Payable (5−6)", value: hasAny ? payable : "" },
              {
                label: "८. कर फिर्ता माग गरिएको रकम / Refund Amount Requested",
                value: vals["8"] ?? "",
                editable: true,
                key: "8",
              },
              { label: "९. कर फिर्ता माग गरेको आधार / Basis for Refund Claim", value: "" },
            ].map((r, i) => (
              <tr key={i}>
                <td>{r.label}</td>
                <td>
                  {r.editable ? (
                    <NumInput
                      value={String(r.value)}
                      onChange={set(r.key!)}
                    />
                  ) : (
                    <input
                      readOnly
                      value={r.value as string | number}
                      className="ird-num-input ird-num-input--readonly"
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ird-actions">
          <button
            onClick={() => navigate("/ird/transactions")}
            className="ird-btn ird-btn--primary"
          >
            Proceed / अगाडि बढ्नुहोस्
          </button>
        </div>
      </div>
    </div>
  );
}
