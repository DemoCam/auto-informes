import React from 'react';
import { useAppStore } from '../../store/useAppStore';

export const ConfigPanel: React.FC = () => {
  const query = useAppStore((s) => s.query);
  const setQuery = useAppStore((s) => s.setQuery);

  return (
    <div className="card">
      <div className="card-header">
        <h2>⚙️ Configuración</h2>
        <p>Ajusta las reglas de asignación de mes</p>
      </div>
      <div className="card-body">
        <div className="config-grid">
          {/* Assignment Mode */}
          <div className="form-group">
            <label>Modo de Asignación de Mes</label>
            <select
              className="form-select"
              value={query.assignmentMode}
              onChange={(e) =>
                setQuery({ assignmentMode: e.target.value as 'calendar' | 'operational' })
              }
            >
              <option value="calendar">Calendario (el ZIP pertenece al mes de su fecha)</option>
              <option value="operational">
                Operacional (permite asignar al mes anterior si cae en los primeros días)
              </option>
            </select>
          </div>

          {/* Grace Days */}
          <div className="form-group">
            <label>Días de Gracia (modo operacional)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                className="form-input"
                type="number"
                min={0}
                max={10}
                value={query.graceDays}
                onChange={(e) => setQuery({ graceDays: parseInt(e.target.value) || 0 })}
                style={{ width: 80 }}
                disabled={query.assignmentMode !== 'operational'}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {query.assignmentMode === 'operational'
                  ? `Los primeros ${query.graceDays} días del mes se asignan al mes anterior`
                  : 'Solo aplica en modo operacional'}
              </span>
            </div>
          </div>

          {/* View Mode */}
          <div className="form-group">
            <label>Vista por Defecto</label>
            <select
              className="form-select"
              value={query.viewMode}
              onChange={(e) => setQuery({ viewMode: e.target.value as 'monthly' | 'single_cut' })}
            >
              <option value="monthly">Mensual (usa todos los cortes del mes)</option>
              <option value="single_cut">Por Corte Individual</option>
            </select>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
              {query.viewMode === 'monthly'
                ? 'Vista mensual: widgets snapshot usan el último corte, widgets aggregated usan todos.'
                : 'Vista por corte: todos los widgets usan exactamente el corte seleccionado.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
