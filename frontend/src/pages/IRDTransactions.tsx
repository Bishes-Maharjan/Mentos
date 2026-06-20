import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type Txn = {
  pan: string;
  tradeName: string;
  tradeNameType: string;
  sorp: string;
  taxableAmount: string;
  exemptedAmount: string;
  remarks: string;
};

const empty: Txn = {
  pan: "",
  tradeName: "",
  tradeNameType: "",
  sorp: "",
  taxableAmount: "",
  exemptedAmount: "",
  remarks: "",
};

export default function IRDTransactions() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Txn[]>([{ ...empty }]);
  const [noTxn, setNoTxn] = useState(false);

  const update = (i: number, k: keyof Txn, v: string) =>
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));

  const addRow = () => setRows((p) => [...p, { ...empty }]);
  const deleteRow = (i: number) =>
    setRows((p) => (p.length === 1 ? [{ ...empty }] : p.filter((_, idx) => idx !== i)));

  return (
    <div className="ird-page" style={{ background: '#eaf1f8' }}>
      <div className="ird-container">
        <div className="ird-txn-wrapper">
          <div className="ird-txn-header">
            Vat Returns / मूल्य अभिवृद्धि कर विवरण
          </div>

          <div className="ird-txn-body">
            <p className="ird-txn-note">
              वार्षिक रू. ५,००,००,००० (पाँच करोड) भन्दा बढी कारोबार हुने करदाताहरुको लागि अनिवार्य
              <br />
              <span className="ird-txn-note-en">
                Mandatory for taxpayers with annual transactions above Rs. 5,00,00,000 (Five Crore)
              </span>
            </p>

            <div className="ird-txn-checkbox-row">
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Label:</span>
              <label className="ird-txn-checkbox-label">
                <input
                  type="checkbox"
                  checked={noTxn}
                  onChange={(e) => setNoTxn(e.target.checked)}
                />
                <span>
                  कुनै पनि व्यक्ति / संस्था संग यो अवधिमा रू एक लाख भन्दा वढीको कारोबार छैन।
                  <br />
                  <span className="ird-txn-note-en">
                    No transactions above Rs. 1,00,000 with any person / entity in this period.
                  </span>
                </span>
              </label>
            </div>

            <div className="ird-txn-excel-row">
              <label>
                <input type="checkbox" />
                Load Records From Excel / एक्सेलबाट रेकर्ड लोड गर्नुहोस्
              </label>
              <input type="text" readOnly />
              <button className="ird-txn-excel-btn">Browse</button>
              <button className="ird-txn-excel-btn">Load</button>
              <button className="ird-txn-excel-btn ird-txn-excel-btn--download">
                Download Sample Excel File Here
              </button>
            </div>

            <p className="ird-txn-upload-note">
              कृपया एक लाख भन्दा माथिका कारोबारहरु UPLOAD गरिसकेपछि ठिक छ वा छैन चेक गर्न{" "}
              <b>Check Transactions Button</b> क्लिक गर्नुहोला।
              <br />
              <span className="ird-txn-note-en">
                After uploading transactions above one lakh, click the Check Transactions Button to verify.
              </span>
            </p>

            <fieldset className="ird-txn-fieldset">
              <legend>Transaction Details / कारोबार विवरण</legend>

              <div className="ird-txn-toolbar">
                <button onClick={addRow}>Add / थप्नुहोस्</button>
                <button className="ird-txn-toolbar-muted">Show All / सबै देखाउनुहोस्</button>
                <button className="ird-txn-toolbar-muted">Check Transactions / जाँच गर्नुहोस्</button>
                <button
                  className="ird-txn-toolbar-muted"
                  onClick={() => setRows([{ ...empty }])}
                >
                  Delete All / सबै मेटाउनुहोस्
                </button>
                <button className="ird-txn-toolbar-muted">Export To Excel / एक्सेलमा निकाल्नुहोस्</button>
              </div>

              <table className="ird-txn-table">
                <thead>
                  <tr>
                    {[
                      "SNo / क्र.सं.",
                      "PAN / प्यान",
                      "TradeName / व्यापारको नाम",
                      "TradeNameType / प्रकार",
                      "SORP",
                      "TaxableAmount / करयोग्य रकम",
                      "ExemptedAmount / छुट रकम",
                      "Remarks / कैफियत",
                      "",
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td style={{ padding: '0.25rem 0.5rem' }}>{i + 1}</td>
                      <td>
                        <input
                          value={r.pan}
                          onChange={(e) => update(i, "pan", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          value={r.tradeName}
                          onChange={(e) => update(i, "tradeName", e.target.value)}
                        />
                      </td>
                      <td>
                        <select
                          value={r.tradeNameType}
                          onChange={(e) => update(i, "tradeNameType", e.target.value)}
                        >
                          <option value=""></option>
                          <option value="Individual">Individual / व्यक्तिगत</option>
                          <option value="Firm">Firm / फर्म</option>
                          <option value="Company">Company / कम्पनी</option>
                        </select>
                      </td>
                      <td>
                        <select
                          value={r.sorp}
                          onChange={(e) => update(i, "sorp", e.target.value)}
                        >
                          <option value=""></option>
                          <option value="S">S</option>
                          <option value="P">P</option>
                        </select>
                      </td>
                      <td>
                        <input
                          value={r.taxableAmount}
                          onChange={(e) => update(i, "taxableAmount", e.target.value)}
                          style={{ textAlign: 'right' }}
                        />
                      </td>
                      <td>
                        <input
                          value={r.exemptedAmount}
                          onChange={(e) => update(i, "exemptedAmount", e.target.value)}
                          style={{ textAlign: 'right' }}
                        />
                      </td>
                      <td>
                        <input
                          value={r.remarks}
                          onChange={(e) => update(i, "remarks", e.target.value)}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => deleteRow(i)}
                          className="ird-txn-delete-btn"
                          title="Delete"
                        >
                          ⊖
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </fieldset>

            <div className="ird-actions ird-actions--between">
              <button
                onClick={() => navigate("/ird")}
                className="ird-btn ird-btn--secondary"
              >
                Back / पछाडि
              </button>
              <button
                onClick={() => navigate("/ird/success")}
                className="ird-btn ird-btn--primary"
              >
                Proceed / अगाडि बढ्नुहोस्
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
