import { useState, useCallback } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Receipt, ReceiptItem, PANValidation } from '../types';
import ConfidenceBadge from './ConfidenceBadge';
import PANBadge from './PANBadge';

interface ReceiptFormProps {
  receipt: Receipt;
  onSave: (data: Partial<Receipt>) => Promise<void>;
  panValidation?: PANValidation | null;
  isNew?: boolean;
}

export default function ReceiptForm({
  receipt,
  onSave,
  panValidation,
  isNew = false,
}: ReceiptFormProps) {
  const [vendorName, setVendorName] = useState(receipt.vendorName || '');
  const [vendorPAN, setVendorPAN] = useState(receipt.vendorPAN || '');
  const [invoiceNumber, setInvoiceNumber] = useState(receipt.invoiceNumber || '');
  const [date, setDate] = useState(
    receipt.date ? new Date(receipt.date).toISOString().split('T')[0] : ''
  );
  const [type, setType] = useState<'sale' | 'purchase'>(receipt.type);
  const [items, setItems] = useState<ReceiptItem[]>(
    receipt.items.length > 0
      ? receipt.items
      : [{ description: '', quantity: 1, unitPrice: 0, amount: 0, vatApplicable: true }]
  );
  const [subtotal, setSubtotal] = useState(receipt.subtotal);
  const [vatAmount, setVatAmount] = useState(receipt.vatAmount);
  const [total, setTotal] = useState(receipt.total);
  const [saving, setSaving] = useState(false);

  const updateItem = useCallback(
    (index: number, field: keyof ReceiptItem, value: string | number | boolean) => {
      setItems((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };
        // Auto-compute amount when qty or price changes
        if (field === 'quantity' || field === 'unitPrice') {
          updated[index].amount =
            Number(updated[index].quantity) * Number(updated[index].unitPrice);
        }
        return updated;
      });
    },
    []
  );

  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      { description: '', quantity: 1, unitPrice: 0, amount: 0, vatApplicable: true },
    ]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave({
        vendorName,
        vendorPAN: vendorPAN || null,
        invoiceNumber: invoiceNumber || null,
        date: date || null,
        type,
        items,
        subtotal,
        vatAmount,
        total,
      });
      toast.success(isNew ? 'Receipt saved successfully!' : 'Receipt updated!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }, [vendorName, vendorPAN, invoiceNumber, date, type, items, subtotal, vatAmount, total, onSave, isNew]);

  return (
    <div className="card card--glass">
      <div className="receipt-form">
        <div className="receipt-form__header">
          <h2 className="receipt-form__title">
            {isNew ? 'Review Extracted Data' : 'Edit Receipt'}
          </h2>
          <ConfidenceBadge confidence={receipt.confidence} />
        </div>

        <div className="receipt-form__grid">
          <div className="receipt-form__field">
            <label className="receipt-form__label">Vendor Name</label>
            <input
              type="text"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="Business name"
            />
          </div>

          <div className="receipt-form__field">
            <label className="receipt-form__label">Vendor PAN
              <PANBadge validation={panValidation} />
            </label>
            <div className="receipt-form__pan-row">
              <input
                type="text"
                value={vendorPAN}
                onChange={(e) => setVendorPAN(e.target.value)}
                placeholder="9-digit PAN"
                maxLength={9}
              />
            </div>
          </div>

          <div className="receipt-form__field">
            <label className="receipt-form__label">Invoice Number</label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Invoice/Bill No."
            />
          </div>

          <div className="receipt-form__field">
            <label className="receipt-form__label">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="receipt-form__field">
            <label className="receipt-form__label">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as 'sale' | 'purchase')}>
              <option value="purchase">Purchase</option>
              <option value="sale">Sale</option>
            </select>
          </div>
        </div>

        {/* Items Table */}
        <div className="receipt-form__field receipt-form__field--full">
          <label className="receipt-form__label">Line Items</label>
          <table className="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Amount</th>
                <th>VAT?</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(idx, 'description', e.target.value)}
                      placeholder="Item description"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                      min={0}
                      step={1}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(idx, 'unitPrice', Number(e.target.value))}
                      min={0}
                      step={0.01}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={item.amount}
                      onChange={(e) => updateItem(idx, 'amount', Number(e.target.value))}
                      min={0}
                      step={0.01}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={item.vatApplicable}
                      onChange={(e) => updateItem(idx, 'vatApplicable', e.target.checked)}
                    />
                  </td>
                  <td>
                    {items.length > 1 && (
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => removeItem(idx)}
                        title="Remove item"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn btn--secondary btn--sm" onClick={addItem} style={{ marginTop: '0.5rem' }}>
            <Plus size={14} /> Add Item
          </button>
        </div>

        {/* Totals */}
        <div className="receipt-form__totals">
          <div className="receipt-form__field">
            <label className="receipt-form__label">Subtotal (NPR)</label>
            <input
              type="number"
              value={subtotal}
              onChange={(e) => setSubtotal(Number(e.target.value))}
              min={0}
              step={0.01}
            />
          </div>
          <div className="receipt-form__field">
            <label className="receipt-form__label">VAT Amount (NPR)</label>
            <input
              type="number"
              value={vatAmount}
              onChange={(e) => setVatAmount(Number(e.target.value))}
              min={0}
              step={0.01}
            />
          </div>
          <div className="receipt-form__field">
            <label className="receipt-form__label">Total (NPR)</label>
            <input
              type="number"
              value={total}
              onChange={(e) => setTotal(Number(e.target.value))}
              min={0}
              step={0.01}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="receipt-form__actions">
          <button
            className="btn btn--primary btn--lg"
            onClick={handleSave}
            disabled={saving}
          >
            <Save size={18} />
            {saving ? 'Saving...' : isNew ? 'Save Receipt' : 'Update Receipt'}
          </button>
        </div>
      </div>
    </div>
  );
}
