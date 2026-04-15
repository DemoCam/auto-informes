import React from 'react';
import { DropZone } from '../components/upload/DropZone';
import { ZipList } from '../components/upload/ZipList';
import { ValidationPanel } from '../components/upload/ValidationPanel';
import { useAppStore } from '../store/useAppStore';

export const UploadPage: React.FC = () => {
  const zipCount = useAppStore((s) => s.zipEntities.length);
  const clearAll = useAppStore((s) => s.clearAll);
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>Cargar Archivos</h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>
            Sube los ZIPs exportados desde Netskope para generar dashboards automáticos
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {zipCount > 0 && (
            <>
              <button className="btn btn-danger" onClick={clearAll}>
                🗑 Limpiar Todo
              </button>
              <button className="btn btn-primary" onClick={() => setActiveTab('results')}>
                📊 Ver Dashboards →
              </button>
            </>
          )}
        </div>
      </div>

      <DropZone />
      <ZipList />
      <ValidationPanel />

      {/* Quick summary */}
      {zipCount > 0 && (
        <div className="card" style={{ marginTop: 'var(--space-xl)' }}>
          <div className="card-body" style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>
            <p style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-secondary)' }}>
              {zipCount} archivo{zipCount > 1 ? 's' : ''} cargado{zipCount > 1 ? 's' : ''}.{' '}
              <button
                className="btn btn-primary btn-sm"
                style={{ marginLeft: 8 }}
                onClick={() => setActiveTab('results')}
              >
                Ver Dashboards
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
