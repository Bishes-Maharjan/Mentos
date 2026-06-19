import { FileText } from 'lucide-react';
import type { Receipt } from '../types';
import { formatNPR } from '../api/client';
import ConfidenceBadge from './ConfidenceBadge';

interface ReceiptCardProps {
  receipt: Receipt;
  onClick: () => void;
}

export default function ReceiptCard({ receipt, onClick }: ReceiptCardProps) {
  const dateStr = receipt.date
    ? new Date(receipt.date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'No date';

  return (
    <div className="receipt-card" onClick={onClick}>
      {receipt.imagePath ? (
        <img
          className="receipt-card__thumb"
          src={`/uploads/${receipt.imagePath}`}
          alt={receipt.vendorName}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('style');
          }}
        />
      ) : null}
      <div
        className="receipt-card__thumb-placeholder"
        style={receipt.imagePath ? { display: 'none' } : undefined}
      >
        <FileText size={24} />
      </div>

      <div className="receipt-card__info">
        <div className="receipt-card__vendor">
          {receipt.vendorName || 'Unknown Vendor'}
        </div>
        <div className="receipt-card__meta">
          <span>{receipt.invoiceNumber || '—'}</span>
          <span>·</span>
          <span>{dateStr}</span>
        </div>
      </div>

      <div className="receipt-card__right">
        <div className="receipt-card__amount">{formatNPR(receipt.total)}</div>
        <div className="receipt-card__badges">
          <span className={`badge badge--${receipt.type}`}>
            {receipt.type === 'sale' ? 'Sale' : 'Purchase'}
          </span>
          <ConfidenceBadge confidence={receipt.confidence} />
        </div>
      </div>
    </div>
  );
}
