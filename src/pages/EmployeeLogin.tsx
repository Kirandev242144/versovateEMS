import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, ShieldCheck, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface LoginProps {
  isDarkMode: boolean;
}

const EmployeeLogin: React.FC<LoginProps> = ({ isDarkMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Redirect if already logged in
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/');
    });
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="emp-login-page">
      <div className="emp-login-card glass">
        <div className="emp-login-header">
          <img
            src={isDarkMode ? "/assets/nightmode_logo.png" : "/assets/daymode_logo.png"}
            alt="Versovate"
            className="emp-logo"
          />
          <h1 className="emp-title">Employee Portal</h1>
          <p className="emp-subtitle">Sign in to manage your work and attendance</p>
        </div>

        {error && (
          <div className="login-alert error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="emp-form">
          <div className="input-group-v5">
            <label>Work Email</label>
            <div className="input-field">
              <Mail className="field-icon" size={20} />
              <input
                type="email"
                placeholder="you@versovate.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group-v5">
            <label>Password</label>
            <div className="input-field">
              <ShieldCheck className="field-icon" size={20} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="emp-login-btn" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
              <>
                <span>Enter Portal</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="emp-login-footer">
          <p>First time here? <Link to="/onboarding" className="onboard-link">Set up your account</Link></p>
        </div>
      </div>

      <style>{`
        .emp-login-page {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-main);
          padding: 20px;
          background-image: 
            radial-gradient(circle at top left, var(--color-primary-light), transparent 25%),
            radial-gradient(circle at bottom right, rgba(0, 191, 165, 0.05), transparent 25%);
        }

        .emp-login-card {
          width: 100%;
          max-width: 420px;
          padding: 40px;
          border-radius: 24px;
          text-align: center;
          animation: scaleUp 0.5s ease-out;
        }

        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .emp-login-header {
          margin-bottom: 32px;
        }

        .emp-logo {
          height: 36px;
          margin-bottom: 24px;
        }

        .emp-title {
          font-size: 28px;
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 8px;
        }

        .emp-subtitle {
          font-size: 15px;
          color: var(--text-muted);
        }

        .emp-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .input-group-v5 {
          display: flex;
          flex-direction: column;
          gap: 8px;
          text-align: left;
        }

        .input-group-v5 label {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-secondary);
        }

        .input-field {
          position: relative;
          display: flex;
          align-items: center;
        }

        .field-icon {
          position: absolute;
          left: 14px;
          color: var(--text-muted);
        }

        .input-field input {
          width: 100%;
          padding: 12px 14px 12px 46px;
          background: var(--bg-block);
          border: 1.5px solid var(--border-color);
          border-radius: 12px;
          font-size: 15px;
          color: var(--text-primary);
          outline: none;
          transition: all 0.2s;
        }

        .input-field input:focus {
          border-color: var(--color-primary);
          background: var(--bg-card);
          box-shadow: 0 0 0 4px var(--color-primary-light);
        }

        .emp-login-btn {
          width: 100%;
          padding: 14px;
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.3s;
          margin-top: 8px;
        }

        .emp-login-btn:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-2px);
          box-shadow: 0 8px 16px var(--color-primary-light);
        }

        .emp-login-footer {
          margin-top: 32px;
          font-size: 14px;
          color: var(--text-muted);
        }

        .onboard-link {
          color: var(--color-primary);
          font-weight: 700;
          text-decoration: none;
        }

        .onboard-link:hover {
          text-decoration: underline;
        }

        .login-alert.error {
          padding: 12px;
          background: rgba(255, 75, 75, 0.1);
          color: #FF4B4B;
          border-radius: 10px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          text-align: left;
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default EmployeeLogin;
