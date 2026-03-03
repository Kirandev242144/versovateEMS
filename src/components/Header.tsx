import React, { useState, useEffect } from 'react';
import { Search, Bell, Settings, User, Moon, Sun, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface HeaderProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ isDarkMode, toggleTheme }) => {
  const [userProfile, setUserProfile] = useState<{ full_name: string; role: string } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', session.user.id)
          .maybeSingle();
        if (data) setUserProfile(data);
      }
    };
    fetchProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', session.user.id)
          .maybeSingle();
        if (data) setUserProfile(data);
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  return (
    <header className="header glass">
      <div className="header-left">
        <div className="user-greeting">
          <p className="greeting-text">Hello {userProfile?.full_name?.split(' ')[0] || 'User'}!</p>
          <h1 className="welcome-text">Good Morning</h1>
        </div>
      </div>

      <div className="header-center">
        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input type="text" placeholder="Search anything" />
        </div>
      </div>

      <div className="header-right">
        <div className="header-actions">
          <button className="action-btn" onClick={toggleTheme}>
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button className="action-btn" title="Settings"><Settings size={20} /></button>
          <button className="action-btn" title="Notifications"><Bell size={20} /></button>
          <button className="action-btn" title="Sign Out" onClick={handleLogout}>
            <LogOut size={20} />
          </button>
        </div>

        <div className="user-profile">
          <div className="user-info">
            <p className="user-name">{userProfile?.full_name || 'Loading...'}</p>
            <p className="user-role" style={{ textTransform: 'capitalize' }}>{userProfile?.role || 'User'}</p>
          </div>
          <div className="user-avatar" style={{ overflow: 'hidden' }}>
            {userProfile?.full_name ? getInitials(userProfile.full_name) : <User size={24} />}
          </div>
        </div>
      </div>

      <style>{`
        .header {
          height: var(--header-height);
          padding: 0 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: fixed;
          top: 0;
          left: var(--sidebar-width);
          right: 0;
          z-index: 90;
          background: var(--bg-header);
          border-bottom: 1px solid var(--border-color);
          backdrop-filter: blur(12px);
        }

        .user-greeting {
          display: flex;
          flex-direction: column;
        }

        .greeting-text {
          font-size: 14px;
          color: var(--text-secondary);
        }

        .welcome-text {
          font-size: 24px;
          color: var(--text-primary);
        }

        .header-center {
          flex: 1;
          display: flex;
          justify-content: center;
          max-width: 600px;
          padding: 0 40px;
        }

        .search-bar {
          display: flex;
          align-items: center;
          background: var(--bg-muted);
          border: 1px solid transparent;
          border-radius: var(--border-radius-md);
          padding: 10px 16px;
          width: 100%;
          gap: 12px;
          transition: var(--transition-smooth);
        }

        .search-bar:focus-within {
          background: var(--bg-card);
          border-color: var(--color-primary);
          box-shadow: 0 0 0 4px rgba(98, 50, 255, 0.1);
        }

        .search-bar input {
          background: none;
          border: none;
          color: var(--text-primary);
          outline: none;
          width: 100%;
          font-size: 14px;
        }

        .search-icon {
          color: var(--text-muted);
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 32px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .action-btn {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          width: 40px;
          height: 40px;
          border-radius: var(--border-radius-md);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition-smooth);
        }

        .action-btn:hover {
          background: var(--color-primary-light);
          color: var(--color-primary);
          border-color: var(--color-primary);
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-info {
          text-align: right;
        }

        .user-name {
          font-weight: 600;
          font-size: 15px;
          color: var(--text-primary);
        }

        .user-role {
          font-size: 12px;
          color: var(--text-muted);
        }

        .user-avatar {
          width: 44px;
          height: 44px;
          background: var(--color-primary);
          border-radius: var(--border-radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-on-primary);
        }
      `}</style>
    </header>
  );
};

export default Header;
