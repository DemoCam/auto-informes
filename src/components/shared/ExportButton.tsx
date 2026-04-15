import React, { useCallback, useRef } from 'react';

interface ExportButtonProps {
  targetId: string;
  filename?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  targetId,
  filename = 'dashboard',
}) => {
  const handleExport = useCallback(async () => {
    const el = document.getElementById(targetId);
    if (!el) return;

    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(el, { quality: 0.95, backgroundColor: '#f4f5f7' });
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('Export failed:', e);
      alert('Error al exportar. Intente de nuevo.');
    }
  }, [targetId, filename]);

  return (
    <button className="btn btn-sm" onClick={handleExport}>
      📷 Exportar PNG
    </button>
  );
};
