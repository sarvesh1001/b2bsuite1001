import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function Dashboard() {
  const router = useRouter();
  const [userType, setUserType] = useState<string | null>(null);
  const [companyContext, setCompanyContext] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/web/login');
    }
    setUserType(localStorage.getItem('user_type') || 'user');
    const ctx = localStorage.getItem('company_context');
    if (ctx) {
      try { setCompanyContext(JSON.parse(ctx)); } catch {}
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/web/login');
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Prayantra Dashboard</h1>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </header>

      <div className="dashboard-content">
        <div className="welcome-section">
          <h2>Welcome to Prayantra</h2>
          <p>User Type: {userType === 'admin' ? 'Administrator' : 'User'}</p>
        </div>

        {companyContext && userType === 'user' && (
          <div className="company-info">
            <h3>Company Information</h3>
            <div className="info-grid">
              {Object.entries(companyContext).map(([key, value]) => (
                <div key={key} className="info-item">
                  <label>{key.replace(/_/g, ' ').toUpperCase()}:</label>
                  <span>{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="action-grid">
            <button className="action-button">View Profile</button>
            <button className="action-button">Settings</button>
            <button className="action-button">Help & Support</button>
          </div>
        </div>
      </div>
    </div>
  );
}