import React from 'react';

interface DashboardCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  id?: string;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({ title, subtitle, children, id }) => (
  <div className="dashboard-card" id={id}>
    <div className="dashboard-card-title">{title}</div>
    {subtitle && <div className="dashboard-card-subtitle">{subtitle}</div>}
    {children}
  </div>
);
