import React from 'react';

interface FallbackMessageProps {
  icon?: string;
  title: string;
  message?: string;
}

export const FallbackMessage: React.FC<FallbackMessageProps> = ({
  icon = '📊',
  title,
  message,
}) => (
  <div className="fallback">
    <div className="fallback-icon">{icon}</div>
    <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div>
    {message && <div style={{ fontSize: '0.8rem' }}>{message}</div>}
  </div>
);
