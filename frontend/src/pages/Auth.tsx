import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { loginUser, registerUser, type RegisterPayload } from '../api/client';
import toast from 'react-hot-toast';
import { useMutation } from '@tanstack/react-query';

export default function AuthPage() {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);

  // Common fields
  const [pan, setPan] = useState('');

  // Login fields
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Register fields
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [address, setAddress] = useState('');
  const [isNewBusiness, setIsNewBusiness] = useState(true);

  // D2 fields for existing business
  const [fiscalYear, setFiscalYear] = useState('');
  const [month, setMonth] = useState('');
  const [totalSales, setTotalSales] = useState('');
  const [totalPurchases, setTotalPurchases] = useState('');
  const [outputVAT, setOutputVAT] = useState('');
  const [inputVAT, setInputVAT] = useState('');
  const [creditBroughtForward, setCreditBroughtForward] = useState('');
  const [netVATPayable, setNetVATPayable] = useState('');

  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (res) => {
      toast.success('Logged in successfully');
      login(res.token, res.user);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Login failed');
    },
  });

  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: (res) => {
      toast.success('Registered successfully');
      login(res.token, res.user);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Registration failed');
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact || !password) {
      toast.error('Contact and Password are required');
      return;
    }

    const isEmail = contact.includes('@');
    const loginEmail = isEmail ? contact : undefined;
    const loginPhone = !isEmail ? contact : undefined;

    loginMutation.mutate({ email: loginEmail, phone: loginPhone, password });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName || !pan) {
      toast.error('Business Name and PAN are required');
      return;
    }
    if (!email || !phone) {
      toast.error('Both Email and Phone are required for registration');
      return;
    }

    if (!password || password !== confirmPassword) {
      toast.error('Passwords do not match or are empty');
      return;
    }

    if (!isNewBusiness && (!fiscalYear || !month)) {
      toast.error('Existing businesses must provide latest D2 Fiscal Year and Month');
      return;
    }

    const payload: RegisterPayload = {
      businessName,
      ownerName,
      pan,
      address,
      email,
      phone,
      password,
      isNewBusiness,
    };

    if (!isNewBusiness) {
      payload.latestD2 = {
        fiscalYear,
        month: parseInt(month, 10),
        totalSales: parseFloat(totalSales) || 0,
        totalPurchases: parseFloat(totalPurchases) || 0,
        outputVAT: parseFloat(outputVAT) || 0,
        inputVAT: parseFloat(inputVAT) || 0,
        creditBroughtForward: parseFloat(creditBroughtForward) || 0,
        netVATPayable: parseFloat(netVATPayable) || 0,
      };
    }

    registerMutation.mutate(payload);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-8)'
    }}>
      <div className="card card--glass" style={{ width: '100%', maxWidth: '600px' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <h1 className="sidebar__logo" style={{ fontSize: 'var(--font-size-4xl)', marginBottom: 'var(--space-2)' }}>
            Kaji.ai
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {isLogin ? 'Sign in to manage your receipts and VAT' : 'Register your business'}
          </p>
        </div>

        <div style={{
          display: 'flex',
          background: 'rgba(0,0,0,0.2)',
          padding: '0.375rem',
          borderRadius: '999px',
          marginBottom: 'var(--space-8)',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <button
            style={{
              flex: 1,
              padding: '0.75rem 1.5rem',
              borderRadius: '999px',
              border: 'none',
              background: isLogin ? 'var(--primary)' : 'transparent',
              color: isLogin ? '#fff' : 'var(--text-secondary)',
              fontWeight: isLogin ? '600' : '500',
              boxShadow: isLogin ? '0 4px 12px rgba(99, 102, 241, 0.4)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              fontSize: '1rem'
            }}
            onClick={(e) => { e.preventDefault(); setIsLogin(true); }}
          >
            Login
          </button>
          <button
            style={{
              flex: 1,
              padding: '0.75rem 1.5rem',
              borderRadius: '999px',
              border: 'none',
              background: !isLogin ? 'var(--primary)' : 'transparent',
              color: !isLogin ? '#fff' : 'var(--text-secondary)',
              fontWeight: !isLogin ? '600' : '500',
              boxShadow: !isLogin ? '0 4px 12px rgba(99, 102, 241, 0.4)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              fontSize: '1rem'
            }}
            onClick={(e) => { e.preventDefault(); setIsLogin(false); }}
          >
            Register
          </button>
        </div>

        {isLogin ? (
          <form onSubmit={handleLogin} className="receipt-form" style={{ display: 'flex', flexDirection: 'column', height: '400px' }}>
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
              <div className="receipt-form__field">
                <label className="receipt-form__label">Email or Phone *</label>
                <input
                  type="text"
                  required
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="you@example.com or 9812345678"
                />
              </div>
              <div className="receipt-form__field">
                <label className="receipt-form__label">Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <button type="submit" className="btn btn--primary" style={{ width: '100%', marginTop: 'var(--space-4)', flexShrink: 0 }} disabled={loginMutation.isPending}>
              {loginMutation.isPending ? 'Loading...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="receipt-form" style={{ display: 'flex', flexDirection: 'column', height: '400px' }}>
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
              <div className="receipt-form__field">
                <label className="receipt-form__label">Business Name *</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Acme Corp"
              />
            </div>
            <div className="receipt-form__grid">
              <div className="receipt-form__field">
                <label className="receipt-form__label">PAN (9 digits) *</label>
                <input
                  type="text"
                  required
                  pattern="\d{9}"
                  value={pan}
                  onChange={(e) => setPan(e.target.value)}
                  placeholder="e.g. 123456789"
                />
              </div>
              <div className="receipt-form__field">
                <label className="receipt-form__label">Owner Name</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Ram Bahadur"
                />
              </div>
            </div>

            <div className="receipt-form__grid">
              <div className="receipt-form__field">
                <label className="receipt-form__label">Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="receipt-form__field">
                <label className="receipt-form__label">Phone *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9812345678"
                />
              </div>
            </div>

            <div className="receipt-form__grid">
              <div className="receipt-form__field">
                <label className="receipt-form__label">Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </div>
              <div className="receipt-form__field">
                <label className="receipt-form__label">Confirm Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                />
              </div>
            </div>

            <div className="receipt-form__field">
              <label className="receipt-form__label">Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Thamel, Kathmandu"
              />
            </div>

            <div className="receipt-form__field" style={{ marginTop: 'var(--space-4)' }}>
              <label
                className="receipt-form__label"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  marginBottom: 0,
                  fontWeight: 500
                }}
              >
                <input
                  type="checkbox"
                  checked={isNewBusiness}
                  onChange={(e) => setIsNewBusiness(e.target.checked)}
                  style={{ width: 'auto', margin: 0, cursor: 'pointer' }}
                />
                Is this a new business? (No prior D2 history)
              </label>
            </div>

            {!isNewBusiness && (
              <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                <h3 style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-md)' }}>Latest D2 Record</h3>
                <div className="receipt-form__grid">
                  <div className="receipt-form__field">
                    <label className="receipt-form__label">Fiscal Year *</label>
                    <input
                      type="text"
                      required={!isNewBusiness}
                      value={fiscalYear}
                      onChange={(e) => setFiscalYear(e.target.value)}
                      placeholder="e.g. 2081/82"
                    />
                  </div>
                  <div className="receipt-form__field">
                    <label className="receipt-form__label">Month (1-12) *</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      required={!isNewBusiness}
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      placeholder="e.g. 9"
                    />
                  </div>
                  <div className="receipt-form__field">
                    <label className="receipt-form__label">Total Sales</label>
                    <input
                      type="number"
                      value={totalSales}
                      onChange={(e) => setTotalSales(e.target.value)}
                    />
                  </div>
                  <div className="receipt-form__field">
                    <label className="receipt-form__label">Total Purchases</label>
                    <input
                      type="number"
                      value={totalPurchases}
                      onChange={(e) => setTotalPurchases(e.target.value)}
                    />
                  </div>
                  <div className="receipt-form__field">
                    <label className="receipt-form__label">Output VAT</label>
                    <input
                      type="number"
                      value={outputVAT}
                      onChange={(e) => setOutputVAT(e.target.value)}
                    />
                  </div>
                  <div className="receipt-form__field">
                    <label className="receipt-form__label">Input VAT</label>
                    <input
                      type="number"
                      value={inputVAT}
                      onChange={(e) => setInputVAT(e.target.value)}
                    />
                  </div>
                  <div className="receipt-form__field">
                    <label className="receipt-form__label">Credit Brought Forward</label>
                    <input
                      type="number"
                      value={creditBroughtForward}
                      onChange={(e) => setCreditBroughtForward(e.target.value)}
                    />
                  </div>
                  <div className="receipt-form__field">
                    <label className="receipt-form__label">Net VAT Payable (if positive)</label>
                    <input
                      type="number"
                      value={netVATPayable}
                      onChange={(e) => setNetVATPayable(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
            </div>

            <button type="submit" className="btn btn--primary" style={{ width: '100%', marginTop: 'var(--space-6)', flexShrink: 0 }} disabled={registerMutation.isPending}>
              {registerMutation.isPending ? 'Loading...' : 'Register'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
