import React from 'react';
import { ConfigPanel } from '../components/config/ConfigPanel';

export const ConfigPage: React.FC = () => {
  return (
    <div>
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>Configuración</h1>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>
          Ajusta las reglas de asignación de mes y modo de agregación mensual
        </p>
      </div>
      <ConfigPanel />
    </div>
  );
};
