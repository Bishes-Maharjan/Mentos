import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, TrendingUp, CheckCircle, Upload as UploadIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import FileDropzone from '../components/FileDropzone';
import ReceiptForm from '../components/ReceiptForm';
import { uploadReceipt, updateReceipt } from '../api/client';
import type { Receipt, PANValidation } from '../types';

type UploadState = 'idle' | 'processing' | 'review' | 'success';

export default function Upload() {
  const navigate = useNavigate();
  const [state, setState] = useState<UploadState>('idle');
  const [receiptType, setReceiptType] = useState<'sale' | 'purchase'>('purchase');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [panValidation, setPanValidation] = useState<PANValidation | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const handleFileSelect = useCallback(
    async (file: File) => {
      setState('processing');
      setPreviewUrl(URL.createObjectURL(file));

      try {
        const result = await uploadReceipt(file, receiptType);
        setReceipt(result.receipt);
        setPanValidation(result.panValidation);
        setState('review');
        toast.success('Receipt extracted successfully!');
      } catch (err: unknown) {
        setState('idle');
        const message =
          err instanceof Error ? err.message : 'Failed to process receipt';
        toast.error(message);
      }
    },
    [receiptType]
  );

  const handleSave = useCallback(
    async (data: Partial<Receipt>) => {
      if (!receipt) return;
      const result = await updateReceipt(receipt._id, data);
      setReceipt(result.receipt);
      setPanValidation(result.panValidation);
      setState('success');
    },
    [receipt]
  );

  const handleUploadAnother = useCallback(() => {
    setState('idle');
    setReceipt(null);
    setPanValidation(null);
    setPreviewUrl('');
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
          <FileDropzone onFileSelect={handleFileSelect} isUploading={false} />
        </>
      )}

      {/* Step 2: Processing */}
      {state === 'processing' && (
        <div className="upload-page__review">
          <div className="upload-page__image-panel">
            {previewUrl && (
              <img
                className="upload-page__image"
                src={previewUrl}
                alt="Uploaded receipt"
              />
            )}
          </div>
          <div>
            <FileDropzone onFileSelect={() => {}} isUploading={true} />
          </div>
        </div>
      )}

      {/* Step 3: Review extracted data */}
      {state === 'review' && receipt && (
        <div className="upload-page__review">
          <div className="upload-page__image-panel">
            <img
              className="upload-page__image"
              src={`/uploads/${receipt.imagePath}`}
              alt="Receipt"
              onError={(e) => {
                if (previewUrl) {
                  (e.target as HTMLImageElement).src = previewUrl;
                }
              }}
            />
          </div>
          <ReceiptForm
            receipt={receipt}
            onSave={handleSave}
            panValidation={panValidation}
            isNew={true}
          />
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
