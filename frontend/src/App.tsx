import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import ReceiptDetail from './pages/ReceiptDetail';
import AnnexSales from './pages/AnnexSales';
import AnnexPurchases from './pages/AnnexPurchases';
import TaxReturn from './pages/TaxReturn';
import IRDVatForm from './pages/IRDVatForm';
import IRDTransactions from './pages/IRDTransactions';
import IRDSuccess from './pages/IRDSuccess';
import D2Detail from './pages/D2Detail';
import AuthPage from './pages/Auth';
import Landing from './pages/Landing';
import Me from './pages/Me';

export default function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner spinner--lg"></div>
      </div>
    );
  }

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
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
        {/* IRD Portal - Standalone Public Layout */}
        <Route path="/ird" element={<IRDVatForm />} />
        <Route path="/ird/transactions" element={<IRDTransactions />} />
        <Route path="/ird/success" element={<IRDSuccess />} />

        {/* Public Routes */}
        <Route path="/" element={!user ? <Landing /> : <Navigate to="/dashboard" replace />} />
        <Route path="/assign" element={!user ? <AuthPage /> : <Navigate to="/dashboard" replace />} />
        
        {/* Protected App Routes */}
        <Route
          path="/*"
          element={
            !user ? (
              <Navigate to="/assign" replace />
            ) : (
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/upload" element={<Upload />} />
                  <Route path="/receipts/:id" element={<ReceiptDetail />} />
                  <Route path="/annex/sales" element={<AnnexSales />} />
                  <Route path="/annex/purchases" element={<AnnexPurchases />} />
                  <Route path="/tax-return" element={<TaxReturn />} />
                  <Route path="/d2/:id" element={<D2Detail />} />
                  <Route path="/me" element={<Me />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Route>
              </Routes>
            )
          }
        />
      </Routes>
    </>
  );
}
