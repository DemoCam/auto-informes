import React from 'react';
import { useAppStore } from './store/useAppStore';
import { UploadPage } from './pages/UploadPage';
import { ConfigPage } from './pages/ConfigPage';
import { ResultsPage } from './pages/ResultsPage';
import './index.css';

const App: React.FC = () => {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const isLoading = useAppStore((s) => s.isLoading);
  const loadingMessage = useAppStore((s) => s.loadingMessage);
  const zipCount = useAppStore((s) => s.zipEntities.length);

  return (
    <div className="app-shell">
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <div className="loading-text">{loadingMessage}</div>
        </div>
      )}

      <header className="top-bar">
        <div className="top-bar-brand">
          <div className="logo-icon">N</div>
          <h1>Netskope Dashboard Viewer</h1>
        </div>
        <nav className="top-bar-nav">
          <button className={activeTab === 'upload' ? 'active' : ''} onClick={() => setActiveTab('upload')}>
            📁 Cargar
          </button>
          <button className={activeTab === 'config' ? 'active' : ''} onClick={() => setActiveTab('config')}>
            ⚙️ Configuración
          </button>
          <button className={activeTab === 'results' ? 'active' : ''} onClick={() => setActiveTab('results')}>
            📊 Dashboards {zipCount > 0 && `(${zipCount})`}
          </button>
        </nav>
      </header>

      <main className="main-content">
        {activeTab === 'upload' && <UploadPage />}
        {activeTab === 'config' && <ConfigPage />}
        {activeTab === 'results' && <ResultsPage />}
      </main>

      <footer style={{
        textAlign: 'center', padding: '12px', fontSize: '0.75rem',
        color: 'var(--text-muted)', borderTop: '1px solid var(--border-card)',
      }}>
        Netskope Dashboard Viewer — Procesamiento 100% local en el navegador
      </footer>
    </div>
  );
};

export default App;
