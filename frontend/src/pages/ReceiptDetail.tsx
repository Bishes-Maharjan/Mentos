import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getReceipt, updateReceipt, deleteReceipt } from '../api/client';
import type { Receipt, PANValidation } from '../types';
import ReceiptForm from '../components/ReceiptForm';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ReceiptDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [panValidation, setPanValidation] = useState<PANValidation | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getReceipt(id)
      .then((data) => setReceipt(data))
      .catch(() => toast.error('Failed to load receipt'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = useCallback(
    async (data: Partial<Receipt>) => {
      if (!id) return;
      const result = await updateReceipt(id, data);
      setReceipt(result.receipt);
      setPanValidation(result.panValidation);
    },
    [id]
  );

  const handleDelete = useCallback(async () => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to delete this receipt? This action cannot be undone.')) {
      return;
    }
    setDeleting(true);
    try {
      await deleteReceipt(id);
      toast.success('Receipt deleted');
      navigate('/');
    } catch {
      toast.error('Failed to delete receipt');
    } finally {
      setDeleting(false);
    }
  }, [id, navigate]);

  if (loading) return <LoadingSpinner size="lg" />;
  if (!receipt) return <div>Receipt not found</div>;

  return (
    <div className="receipt-detail">
      <div className="receipt-detail__top-bar">
        <button className="receipt-detail__back" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          Back
        </button>
        <button
          className="btn btn--danger"
          onClick={handleDelete}
          disabled={deleting}
        >
          <Trash2 size={16} />
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>

      <div className="receipt-detail__layout">
        <div className="receipt-detail__image-panel">
          {receipt.imagePath ? (
            <img
              className="receipt-detail__image"
              src={`/uploads/${receipt.imagePath}`}
              alt={receipt.vendorName || 'Receipt'}
            />
          ) : (
            <div
              className="receipt-detail__image"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '300px',
                color: 'var(--text-tertiary)',
              }}
            >
              No image available
            </div>
          )}
        </div>

        <ReceiptForm
          receipt={receipt}
          onSave={handleSave}
          panValidation={panValidation}
          isNew={false}
        />
      </div>
    </div>
  );
}
