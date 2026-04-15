import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';

export const ValidationPanel: React.FC = () => {
  const zipEntities = useAppStore((s) => s.zipEntities);
  const globalIssues = useAppStore((s) => s.globalIssues);
  const [expanded, setExpanded] = useState<string | null>(null);

  const allIssues = [
    ...globalIssues,
    ...zipEntities.flatMap((e) => e.validationIssues),
  ];

  if (allIssues.length === 0 && zipEntities.length === 0) return null;

  return (
    <div className="card" style={{ marginTop: 'var(--space-xl)' }}>
      <div className="card-header">
        <h2>🔍 Panel de Validación</h2>
        <p>{allIssues.length} alerta{allIssues.length !== 1 ? 's' : ''} detectada{allIssues.length !== 1 ? 's' : ''}</p>
      </div>
      <div className="card-body">
        {/* Global issues */}
        {globalIssues.length > 0 && (
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>Alertas Globales</h3>
            <ul className="validation-list">
              {globalIssues.map((issue, idx) => (
                <li key={`g-${idx}`} className={`validation-item ${issue.severity}`}>
                  <span>{issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️'}</span>
                  <span>{issue.message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Per-ZIP details */}
        {zipEntities.map((entity) => (
          <div key={entity.id} style={{ marginBottom: 'var(--space-md)' }}>
            <button
              className="btn btn-sm"
              style={{ width: '100%', justifyContent: 'space-between', marginBottom: 4 }}
              onClick={() => setExpanded(expanded === entity.id ? null : entity.id)}
            >
              <span>
                📦 {entity.originalFileName} — {entity.csvFilesDetected.length} CSVs,{' '}
                {entity.validationIssues.length} alertas
              </span>
              <span>{expanded === entity.id ? '▲' : '▼'}</span>
            </button>

            {expanded === entity.id && (
              <div style={{ padding: '8px 12px', background: '#fafbfc', borderRadius: 4, marginBottom: 8 }}>
                <div style={{ fontSize: '0.75rem', marginBottom: 8 }}>
                  <strong>Carpeta interna:</strong> {entity.internalFolderName}
                </div>
                <div style={{ fontSize: '0.75rem', marginBottom: 8 }}>
                  <strong>Archivos CSV detectados:</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    {entity.csvFilesDetected.map((f) => (
                      <span
                        key={f}
                        style={{
                          background: '#e8eaed',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: '0.7rem',
                          fontFamily: 'monospace',
                        }}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                {entity.validationIssues.length > 0 && (
                  <ul className="validation-list">
                    {entity.validationIssues.map((issue, idx) => (
                      <li key={idx} className={`validation-item ${issue.severity}`}>
                        <span>
                          {issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️'}
                        </span>
                        <span>
                          {issue.message}
                          {issue.column && <em> (columna: {issue.column})</em>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
