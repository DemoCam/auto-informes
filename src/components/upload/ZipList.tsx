import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { formatCutDate, formatReportingMonth } from '../../utils/dateParser';

const FAMILY_LABELS: Record<string, string> = {
  mapa: 'Mapa',
  ia_en_riesgos: 'IA en Riesgos',
  proteccion_datos_personales: 'Protección Datos',
};

const FAMILY_BADGE: Record<string, string> = {
  mapa: 'badge-mapa',
  ia_en_riesgos: 'badge-ia',
  proteccion_datos_personales: 'badge-proteccion',
};

export const ZipList: React.FC = () => {
  const zipEntities = useAppStore((s) => s.zipEntities);
  const removeZip = useAppStore((s) => s.removeZip);

  if (zipEntities.length === 0) return null;

  return (
    <div className="card" style={{ marginTop: 'var(--space-xl)' }}>
      <div className="card-header">
        <h2>📦 Archivos Cargados ({zipEntities.length})</h2>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Archivo</th>
              <th>Familia</th>
              <th>Fecha de Corte</th>
              <th>Mes Reportado</th>
              <th>Regla</th>
              <th>Semana</th>
              <th>CSVs</th>
              <th>Alertas</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {zipEntities.map((entity) => {
              const errorCount = entity.validationIssues.filter(
                (i) => i.severity === 'error'
              ).length;
              const warnCount = entity.validationIssues.filter(
                (i) => i.severity === 'warning'
              ).length;

              return (
                <tr key={entity.id}>
                  <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entity.originalFileName}
                  </td>
                  <td>
                    <span className={`badge-family ${FAMILY_BADGE[entity.sourceType]}`}>
                      {FAMILY_LABELS[entity.sourceType]}
                    </span>
                  </td>
                  <td>{formatCutDate(entity.cutDate)}</td>
                  <td>{formatReportingMonth(entity.reportingMonth)}</td>
                  <td>
                    <span className={`badge ${entity.assignmentRuleUsed === 'operational' ? 'badge-warning' : 'badge-info'}`}>
                      {entity.assignmentRuleUsed}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>{entity.weekSequenceInMonth}</td>
                  <td style={{ textAlign: 'center' }}>{entity.csvFilesDetected.length}</td>
                  <td>
                    {errorCount > 0 && (
                      <span className="badge badge-error" style={{ marginRight: 4 }}>
                        {errorCount} error{errorCount > 1 ? 'es' : ''}
                      </span>
                    )}
                    {warnCount > 0 && (
                      <span className="badge badge-warning">
                        {warnCount} aviso{warnCount > 1 ? 's' : ''}
                      </span>
                    )}
                    {errorCount === 0 && warnCount === 0 && (
                      <span className="badge badge-success">OK</span>
                    )}
                  </td>
                  <td>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => removeZip(entity.id)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
