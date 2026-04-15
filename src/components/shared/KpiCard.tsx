import React from 'react';

interface KpiCardProps {
  value: string | number;
  label: string;
  color?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({ value, label, color = '#212121' }) => (
  <div className="kpi-card">
    <div className="kpi-value" style={{ color }}>{value}</div>
    <div className="kpi-label">{label}</div>
  </div>
);
