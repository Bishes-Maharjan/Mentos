import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { ShoppingCart, TrendingUp, CheckCircle, Upload as UploadIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import FileDropzone from '../components/FileDropzone';
import ReceiptForm from '../components/ReceiptForm';
import LoadingSpinner from '../components/LoadingSpinner';
import { uploadReceipt, createReceipt } from '../api/client';
import type { Receipt, PANValidation } from '../types';

type UploadState = 'idle' | 'processing' | 'review' | 'success';

type UploadResult = {
  receipt: Receipt;
  panValidation: PANValidation | null;
  previewUrl: string;
  saved: boolean;
};

export default function Upload() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [state, setState] = useState<UploadState>('idle');
  const [receiptType, setReceiptType] = useState<'sale' | 'purchase'>('purchase');
  const [results, setResults] = useState<UploadResult[]>([]);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });

  const uploadMutation = useMutation({
    mutationFn: ({ file, type }: { file: File; type: 'sale' | 'purchase' }) =>
      uploadReceipt(file, type),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Receipt>) => createReceipt(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['vatSummary'] });
    },
  });

  const handleFilesSelect = useCallback(
    async (files: File[]) => {
      setState('processing');
      setProcessingProgress({ current: 0, total: files.length });
      
      const newResults: UploadResult[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProcessingProgress({ current: i + 1, total: files.length });
        
        try {
          const result = await uploadMutation.mutateAsync({ file, type: receiptType });
          newResults.push({
            receipt: result.receipt,
            panValidation: result.panValidation,
            previewUrl: URL.createObjectURL(file),
            saved: false
          });
        } catch (err: any) {
          const message = err.response?.data?.error || err.message || 'Failed to process a receipt';
          toast.error(`Error on file ${file.name}: ${message}`);
        }
      }

      if (newResults.length > 0) {
        setResults(newResults);
        setState('review');
        toast.success(`Successfully extracted ${newResults.length} receipt(s)!`);
      } else {
        setState('idle');
      }
    },
    [receiptType, uploadMutation]
  );

  const handleSave = useCallback(
    async (index: number, data: Partial<Receipt>) => {
      const resultData = results[index];
      if (!resultData) return;

      try {
        const payload = { ...resultData.receipt, ...data };
        const created = await createMutation.mutateAsync(payload);
        
        setResults(prev => {
          const newArr = [...prev];
          newArr[index] = {
            ...newArr[index],
            receipt: created.receipt,
            panValidation: created.panValidation,
            saved: true
          };
          return newArr;
        });
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Failed to save receipt');
      }
    },
    [results, createMutation]
  );

  // Check if all receipts are saved
  useEffect(() => {
    if (state === 'review' && results.length > 0) {
      if (results.every(r => r.saved)) {
        setState('success');
      }
    }
  }, [results, state]);

  const handleUploadAnother = useCallback(() => {
    setState('idle');
    setResults([]);
    setProcessingProgress({ current: 0, total: 0 });
  }, []);

  return (
    <div className="upload-page">
      <div className="upload-page__header">
        <h1 className="upload-page__title">Upload Receipt</h1>
        <p className="upload-page__subtitle">
          Upload a receipt or invoice image and let Kaji's AI extract the data for you
        </p>
      </div>

      {/* Step 1: Idle — type selector + dropzone */}
      {state === 'idle' && (
        <>
          <div className="upload-page__type-selector">
            <button
              className={`type-btn ${receiptType === 'purchase' ? 'type-btn--active' : ''}`}
              onClick={() => setReceiptType('purchase')}
            >
              <ShoppingCart size={20} />
              Purchase Receipt
            </button>
            <button
              className={`type-btn ${receiptType === 'sale' ? 'type-btn--active' : ''}`}
              onClick={() => setReceiptType('sale')}
            >
              <TrendingUp size={20} />
              Sales Invoice
            </button>
          </div>
          <FileDropzone onFilesSelect={handleFilesSelect} isUploading={false} multiple={true} />
        </>
      )}

      {/* Step 2: Processing */}
      {state === 'processing' && (
        <div className="upload-page__review">
          <div className="upload-page__image-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
             <LoadingSpinner size="lg" />
             <h3 style={{ marginTop: 'var(--space-4)' }}>Processing Receipt {processingProgress.current} of {processingProgress.total}</h3>
             <p style={{ color: 'var(--text-secondary)' }}>Please wait while Kaji extracts the data...</p>
          </div>
          <div>
            <FileDropzone onFilesSelect={() => {}} isUploading={true} />
          </div>
        </div>
      )}

      {/* Step 3: Review extracted data */}
      {state === 'review' && results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
          {results.map((result, idx) => {
            if (result.saved) return null; // Hide saved ones
            return (
              <div key={result.receipt._id} className="upload-page__review">
                <div className="upload-page__image-panel">
                  <img
                    className="upload-page__image"
                    src={`/uploads/${result.receipt.imagePath}`}
                    alt="Receipt"
                    onError={(e) => {
                      if (result.previewUrl) {
                        (e.target as HTMLImageElement).src = result.previewUrl;
                      }
                    }}
                  />
                </div>
                <ReceiptForm
                  receipt={result.receipt}
                  onSave={(data) => handleSave(idx, data)}
                  panValidation={result.panValidation}
                  isNew={true}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Step 4: Success */}
      {state === 'success' && (
        <div className="card">
          <div className="upload-page__success">
            <CheckCircle className="upload-page__success-icon" />
            <h2 className="upload-page__success-title">Receipt Saved!</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Your receipt has been processed and saved successfully.
            </p>
            <div className="upload-page__success-actions">
              <button className="btn btn--primary btn--lg" onClick={handleUploadAnother}>
                <UploadIcon size={18} />
                Upload Another
              </button>
              <button className="btn btn--secondary btn--lg" onClick={() => navigate('/')}>
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
