import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, ShieldCheck, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LoginProps {
  isDarkMode: boolean;
}

const AdminLogin: React.FC<LoginProps> = ({ isDarkMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Redirect if already logged in
  React.useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Only redirect if they actually have an admin profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile?.role === 'admin') {
          navigate('/Admin');
        }
      }
    };
    checkAdmin();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user }, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      if (user && user.email === 'admin@versovate.com') {
        // Ensure main admin profile stays admin
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            role: 'admin',
            full_name: 'System Administrator'
          }, { onConflict: 'id' });

        if (profileError) {
          console.error("Failed to ensure admin profile:", profileError);
        }
      }

      navigate('/Admin');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-hero">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="hero-video"
        >
          <source src="/assets/background.mp4" type="video/mp4" />
        </video>
        <div className="hero-overlay"></div>
        <div className="hero-logo-container">
          <img src="/assets/white_logo.png" alt="Versovate" className="hero-logo" />
        </div>
      </div>

      <div className="login-form-side">
        <div className="login-container-v4">
          <div className="login-branding">
            <img
              src={isDarkMode ? "/assets/nightmode_logo.png" : "/assets/daymode_logo.png"}
              alt="Versovate"
              className="login-logo"
            />
          </div>

          <div className="login-content">
            <h1 className="login-title">Admin Login</h1>
            <p className="login-subtitle">
              Enter your credentials to access the dashboard
            </p>

            {error && (
              <div className="login-alert error">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAuth} className="login-form">
              <div className="input-group-v4">
                <label>Email Address</label>
                <div className="input-wrapper">
                  <Mail className="input-icon" size={20} />
                  <input
                    type="email"
                    placeholder="admin@versovate.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group-v4">
                <label>Password</label>
                <div className="input-wrapper">
                  <ShieldCheck className="input-icon" size={20} />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="login-btn primary" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                  <>
                    <span>Sign In Now</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="login-footer">
            <p>© 2026 Versovate Labs. All rights reserved.</p>
          </div>
        </div>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          width: 100%;
          display: flex;
          background: var(--bg-main);
        }

        .login-hero {
          flex: 1.2;
          position: relative;
          overflow: hidden;
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hero-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .hero-logo-container {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          pointer-events: none;
        }

        .hero-logo {
          width: 280px;
          height: auto;
          filter: drop-shadow(0 0 20px rgba(0,0,0,0.3));
        }

        .hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.6));
        }

        .login-form-side {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          background: var(--bg-main);
          position: relative;
        }

        .login-container-v4 {
          width: 100%;
          max-width: 440px;
          display: flex;
          flex-direction: column;
          align-items: center;
          animation: fadeIn 0.8s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .login-branding {
          margin-bottom: 40px;
        }

        .login-logo {
          height: 40px;
          width: auto;
        }

        .login-content {
          width: 100%;
          text-align: center;
        }

        .login-title {
          font-size: 32px;
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 12px;
        }

        .login-subtitle {
          color: var(--text-muted);
          font-size: 16px;
          margin-bottom: 40px;
        }

        .login-alert {
          padding: 14px 16px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          font-size: 14px;
          font-weight: 600;
          text-align: left;
          background: rgba(255, 75, 75, 0.1);
          color: #FF4B4B;
          border: 1px solid rgba(255, 75, 75, 0.2);
        }

        .login-form {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .input-group-v4 {
          display: flex;
          flex-direction: column;
          gap: 10px;
          text-align: left;
        }

        .input-group-v4 label {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 16px;
          color: var(--text-muted);
        }

        .input-wrapper input {
          width: 100%;
          padding: 14px 16px 14px 50px;
          background: var(--bg-block);
          border: 1px solid var(--border-color);
          border-radius: 14px;
          font-size: 15px;
          color: var(--text-primary);
          outline: none;
          transition: all 0.2s;
        }

        .input-wrapper input:focus {
          border-color: var(--color-primary);
          background: var(--bg-card);
          box-shadow: 0 0 0 4px var(--color-primary-light);
        }

        .login-btn {
          width: 100%;
          padding: 16px;
          border-radius: 14px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border: none;
        }

        .login-btn.primary {
          background: var(--color-primary);
          color: #fff;
          box-shadow: 0 4px 12px rgba(98, 50, 255, 0.2);
        }

        .login-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(98, 50, 255, 0.3);
          filter: brightness(1.1);
        }

        .login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .login-footer {
          margin-top: 60px;
          font-size: 13px;
          color: var(--text-muted);
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1024px) {
          .login-hero {
            display: none;
          }
          .login-form-side {
            flex: 1;
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminLogin;
