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
<<<<<<< HEAD
    <div className="auth-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="auth-card" style={{ width: '100%', maxWidth: 'clamp(450px, 40vw, 800px)', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '0', overflow: 'hidden' }}>
        <div className="auth-form-panel" style={{ padding: 'clamp(1.5rem, 4vw, 3rem)', width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '600px' }}>
            <div className="auth-hero" style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#000', margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>Kaji.AI</h1>
              <p style={{ color: '#4b5563', fontSize: '1.1rem' }}>{isLogin ? 'Sign in to manage your receipts and VAT' : 'Register to manage your receipts and VAT'}</p>
=======
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
>>>>>>> 14f90023a2ec789e6d6ac43fd9b07f22127bca52
            </div>

            <div style={{ display: 'flex', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '4px', marginBottom: '2.5rem' }}>
              <button
                type="button"
                style={{ flex: 1, padding: '0.875rem', borderRadius: '8px', fontWeight: 600, border: 'none', background: isLogin ? 'var(--accent-primary)' : 'transparent', color: isLogin ? '#fff' : '#9ca3af', transition: 'all 0.2s', cursor: 'pointer' }}
                onClick={() => setIsLogin(true)}
              >
                Login
              </button>
              <button
                type="button"
                style={{ flex: 1, padding: '0.875rem', borderRadius: '8px', fontWeight: 600, border: 'none', background: !isLogin ? 'var(--accent-primary)' : 'transparent', color: !isLogin ? '#fff' : '#9ca3af', transition: 'all 0.2s', cursor: 'pointer' }}
                onClick={() => setIsLogin(false)}
              >
                Register
              </button>
            </div>

            <div className="auth-form-container" style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
              {isLogin ? (
            <form onSubmit={handleLogin} className="auth-form" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 500, color: '#9ca3af', marginBottom: '0.5rem', fontSize: '0.95rem' }}>PAN (9 digits) <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  style={{ width: '100%', padding: '1rem', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '1rem', outline: 'none', color: '#111827' }}
                  type="text"
                  required
                  pattern="\d{9}"
                  value={pan}
                  onChange={(e) => setPan(e.target.value)}
                  placeholder="eg. 301245678"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 500, color: '#9ca3af', marginBottom: '0.5rem', fontSize: '0.95rem' }}>Email or Phone <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  style={{ width: '100%', padding: '1rem', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '1rem', outline: 'none', color: '#111827' }}
                  type="text"
                  required
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="example@mail.com or 9812345678"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4b5563', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input type="checkbox" style={{ width: '16px', height: '16px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
                  Remember me
                </label>
                <a href="#" style={{ color: '#9ca3af', fontSize: '0.9rem', textDecoration: 'none' }}>Forgot PAN number?</a>
              </div>

<<<<<<< HEAD
              <button type="submit" style={{ width: '100%', padding: '1rem', background: 'var(--accent-primary)', color: '#fff', fontWeight: 600, border: 'none', borderRadius: '10px', fontSize: '1.1rem', cursor: 'pointer', marginTop: '1rem' }} disabled={loginMutation.isPending}>
                {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="auth-form">
              <div className="auth-grid">
                <div className="auth-field">
                  <label className="auth-label">Business Name *</label>
                  <input
                    className="auth-input"
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Acme Corp"
                  />
                </div>
=======
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
>>>>>>> 14f90023a2ec789e6d6ac43fd9b07f22127bca52

                <div className="auth-field">
                  <label className="auth-label">PAN (9 digits) *</label>
                  <input
                    className="auth-input"
                    type="text"
                    required
                    pattern="\d{9}"
                    value={pan}
                    onChange={(e) => setPan(e.target.value)}
                    placeholder="123456789"
                  />
                </div>
              </div>

              <div className="auth-grid">
                <div className="auth-field">
                  <label className="auth-label">Owner Name</label>
                  <input
                    className="auth-input"
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Ram Bahadur"
                  />
                </div>
                <div className="auth-field">
                  <label className="auth-label">Business Address</label>
                  <input
                    className="auth-input"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Kathmandu, Nepal"
                  />
                </div>
              </div>

              <div className="auth-grid">
                <div className="auth-field">
                  <label className="auth-label">Email *</label>
                  <input
                    className="auth-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="auth-field">
                  <label className="auth-label">Phone *</label>
                  <input
                    className="auth-input"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9812345678"
                  />
                </div>
              </div>

              <div className="auth-checkbox-row">
                <input
                  id="isNewBusiness"
                  type="checkbox"
                  checked={isNewBusiness}
                  onChange={(e) => setIsNewBusiness(e.target.checked)}
                />
                <label htmlFor="isNewBusiness" className="auth-checkbox-label">
                  <strong>New Business Setup</strong>
                  <span style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                    Uncheck if you have existing VAT filings / D2 reports from previous months.
                  </span>
                </label>
              </div>

              {!isNewBusiness && (
                <div className="auth-panel" style={{ marginTop: 'var(--space-3)' }}>
                  <div className="auth-panel-title">Latest D2 Details</div>
                  <div className="auth-grid">
                    <div className="auth-field">
                      <label className="auth-label">Fiscal Year *</label>
                      <input
                        className="auth-input"
                        type="text"
                        value={fiscalYear}
                        onChange={(e) => setFiscalYear(e.target.value)}
                        placeholder="2080/2081"
                        required={!isNewBusiness}
                      />
                    </div>
                    <div className="auth-field">
                      <label className="auth-label">Month (1-12) *</label>
                      <input
                        className="auth-input"
                        type="number"
                        min="1"
                        max="12"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        placeholder="3"
                        required={!isNewBusiness}
                      />
                    </div>
                  </div>

                  <div className="auth-grid" style={{ marginTop: 'var(--space-3)' }}>
                    <div className="auth-field">
                      <label className="auth-label">Total Sales (Rs.)</label>
                      <input
                        className="auth-input"
                        type="number"
                        step="0.01"
                        value={totalSales}
                        onChange={(e) => setTotalSales(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="auth-field">
                      <label className="auth-label">Total Purchases (Rs.)</label>
                      <input
                        className="auth-input"
                        type="number"
                        step="0.01"
                        value={totalPurchases}
                        onChange={(e) => setTotalPurchases(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="auth-grid" style={{ marginTop: 'var(--space-3)' }}>
                    <div className="auth-field">
                      <label className="auth-label">Output VAT (Rs.)</label>
                      <input
                        className="auth-input"
                        type="number"
                        step="0.01"
                        value={outputVAT}
                        onChange={(e) => setOutputVAT(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="auth-field">
                      <label className="auth-label">Input VAT (Rs.)</label>
                      <input
                        className="auth-input"
                        type="number"
                        step="0.01"
                        value={inputVAT}
                        onChange={(e) => setInputVAT(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="auth-grid" style={{ marginTop: 'var(--space-3)' }}>
                    <div className="auth-field">
                      <label className="auth-label">Credit Brought Forward (Rs.)</label>
                      <input
                        className="auth-input"
                        type="number"
                        step="0.01"
                        value={creditBroughtForward}
                        onChange={(e) => setCreditBroughtForward(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="auth-field">
                      <label className="auth-label">Net VAT Payable (Rs.)</label>
                      <input
                        className="auth-input"
                        type="number"
                        step="0.01"
                        value={netVATPayable}
                        onChange={(e) => setNetVATPayable(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button type="submit" className="btn btn--primary auth-submit" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? 'Registering...' : 'Register'}
              </button>
            </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
