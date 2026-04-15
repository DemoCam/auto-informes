import React, { useCallback, useState, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';

export const DropZone: React.FC = () => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const addZips = useAppStore((s) => s.addZips);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const zips = Array.from(files).filter(
        (f) => f.name.toLowerCase().endsWith('.zip')
      );
      if (zips.length === 0) {
        alert('Por favor seleccione archivos ZIP válidos.');
        return;
      }
      addZips(zips);
    },
    [addZips]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragging(false), []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <div
      className={`dropzone ${dragging ? 'dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".zip"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="dropzone-icon">📁</div>
      <h3>Arrastra archivos ZIP aquí</h3>
      <p>
        o haz clic para seleccionar &middot; Acepta archivos de Mapa, IA en
        Riesgos y Protección de Datos Personales
      </p>
    </div>
  );
};
