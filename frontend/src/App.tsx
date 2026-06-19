import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import ReceiptDetail from './pages/ReceiptDetail';
import AnnexSales from './pages/AnnexSales';
import AnnexPurchases from './pages/AnnexPurchases';

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#111827',
            color: '#f1f5f9',
            border: '1px solid #1e293b',
            borderRadius: '0.75rem',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
        }}
      />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/receipts/:id" element={<ReceiptDetail />} />
          <Route path="/annex/sales" element={<AnnexSales />} />
          <Route path="/annex/purchases" element={<AnnexPurchases />} />
        </Route>
      </Routes>
    </>
  );
}
