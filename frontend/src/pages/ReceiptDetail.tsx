import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReceipt, updateReceipt, deleteReceipt } from '../api/client';
import type { Receipt, PANValidation } from '../types';
import ReceiptForm from '../components/ReceiptForm';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ReceiptDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const [panValidation, setPanValidation] = useState<PANValidation | null>(null);

  const { data: receipt, isLoading } = useQuery({
    queryKey: ['receipt', id],
    queryFn: () => getReceipt(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Receipt>) => updateReceipt(id!, data),
    onSuccess: (result) => {
      queryClient.setQueryData(['receipt', id], result.receipt);
      setPanValidation(result.panValidation);
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['vatSummary'] });
    },
    onError: () => {
      toast.error('Failed to update receipt');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteReceipt(id!),
    onSuccess: () => {
      toast.success('Receipt deleted');
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['vatSummary'] });
      navigate('/');
    },
    onError: () => {
      toast.error('Failed to delete receipt');
    }
  });

  const handleSave = useCallback(
    async (data: Partial<Receipt>) => {
      if (!id) return;
      await updateMutation.mutateAsync(data);
    },
    [id, updateMutation]
  );

  const handleDelete = useCallback(() => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to delete this receipt? This action cannot be undone.')) {
      return;
    }
    deleteMutation.mutate();
  }, [id, deleteMutation]);

  if (isLoading) return <LoadingSpinner size="lg" />;
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
          disabled={deleteMutation.isPending}
        >
          <Trash2 size={16} />
          {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
        </button>
      </div>

      <div className="receipt-detail__layout">
        <div className="receipt-detail__image-panel">
          {receipt.imagePath ? (
            <img
              className="receipt-detail__image"
              src={`/uploads/${receipt.imagePath}`}
              alt={receipt.partyName || 'Receipt'}
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
