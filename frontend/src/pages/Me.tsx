import { useState, useEffect } from "react";
import { getMe, updateMe } from "../api/client";
import { User, Building2, MapPin, Phone, Mail, CheckCircle, ShieldCheck } from "lucide-react";

export default function Me() {
  const [formData, setFormData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    getMe()
      .then((data) => {
        setFormData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load profile data.");
        setLoading(false);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await updateMe(formData);
      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner spinner--lg"></div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--danger)' }}>
        <User size={48} style={{ margin: '0 auto var(--space-4)' }} />
        <h2>Profile Not Found</h2>
        <p>Could not load your profile data.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--space-6)' }}>
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ fontSize: 'var(--font-size-3xl)', marginBottom: 'var(--space-2)' }}>Business Profile</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your business details, contacts, and tax info.</p>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: 'var(--danger)',
          padding: 'var(--space-4)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-6)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          color: 'var(--success)',
          padding: 'var(--space-4)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-6)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)'
        }}>
          <CheckCircle size={20} />
          {success}
        </div>
      )}

      <div className="card" style={{ 
        padding: '0', 
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)',
        border: '1px solid var(--border-hover)'
      }}>
        
        {/* Banner Section */}
        <div style={{
          background: 'var(--bg-tertiary)',
          padding: 'var(--space-6) var(--space-8)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-6)'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'bold',
            color: '#fff',
            boxShadow: 'var(--shadow-glow)'
          }}>
            {formData.businessName?.charAt(0)?.toUpperCase() || "B"}
          </div>
          <div>
            <h2 style={{ fontSize: 'var(--font-size-xl)', margin: '0 0 var(--space-1) 0' }}>
              {formData.businessName}
            </h2>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 'var(--space-2)',
              color: 'var(--accent-secondary)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 500
            }}>
              <ShieldCheck size={16} />
              PAN: {formData.pan}
            </div>
          </div>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="receipt-form" style={{ padding: 'var(--space-8)' }}>
          <div className="receipt-form__grid" style={{ marginBottom: 'var(--space-5)' }}>
            <div className="receipt-form__field">
              <label className="receipt-form__label">
                <Building2 size={16} style={{ marginRight: 'var(--space-2)', verticalAlign: 'text-bottom' }} />
                Business Name *
              </label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName || ""}
                onChange={handleChange}
                required
              />
            </div>
            <div className="receipt-form__field">
              <label className="receipt-form__label">
                <User size={16} style={{ marginRight: 'var(--space-2)', verticalAlign: 'text-bottom' }} />
                Owner Name
              </label>
              <input
                type="text"
                name="ownerName"
                value={formData.ownerName || ""}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="receipt-form__grid" style={{ marginBottom: 'var(--space-5)' }}>
            <div className="receipt-form__field">
              <label className="receipt-form__label">
                <MapPin size={16} style={{ marginRight: 'var(--space-2)', verticalAlign: 'text-bottom' }} />
                Address *
              </label>
              <input
                type="text"
                name="address"
                value={formData.address || ""}
                onChange={handleChange}
                required
              />
            </div>
            <div className="receipt-form__field">
              <label className="receipt-form__label">
                <Phone size={16} style={{ marginRight: 'var(--space-2)', verticalAlign: 'text-bottom' }} />
                Phone Number
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone || ""}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="receipt-form__field" style={{ marginBottom: 'var(--space-8)' }}>
            <label className="receipt-form__label">
              <Mail size={16} style={{ marginRight: 'var(--space-2)', verticalAlign: 'text-bottom' }} />
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email || ""}
              onChange={handleChange}
            />
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end',
            borderTop: '1px solid var(--border)',
            paddingTop: 'var(--space-6)'
          }}>
            <button 
              type="submit" 
              className="btn btn--primary" 
              disabled={saving}
              style={{ padding: 'var(--space-3) var(--space-8)', fontSize: 'var(--font-size-base)' }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
