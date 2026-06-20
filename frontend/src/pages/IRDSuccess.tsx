import { useNavigate } from 'react-router-dom';

export default function IRDSuccess() {
  const navigate = useNavigate();

  return (
    <div className="ird-page" style={{ background: '#eaf1f8' }}>
      <div className="ird-success-wrapper">
        <div className="ird-success-card">
          <div className="ird-success-icon">✓</div>
          <h1 className="ird-success-title">
            VAT Return Successfully Filed
          </h1>
          <p className="ird-success-subtitle">
            मूल्य अभिवृद्धि कर विवरण सफलतापूर्वक पेश गरियो
          </p>
          <p className="ird-success-desc">
            Your VAT return has been submitted successfully. A confirmation has been recorded.
            <br />
            <em>तपाईंको कर विवरण सफलतापूर्वक पेश भएको छ।</em>
          </p>
          <button
            onClick={() => navigate("/ird")}
            className="ird-btn ird-btn--primary"
            style={{ marginTop: '1.5rem' }}
          >
            File Another Return / अर्को विवरण भर्नुहोस्
          </button>
        </div>
      </div>
    </div>
  );
}
