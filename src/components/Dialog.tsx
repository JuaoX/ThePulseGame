import React, { useEffect, useRef } from 'react';

export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => { ref.current?.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} className="pulse-dialog" aria-label={title} onCancel={event => { event.preventDefault(); closeRef.current(); }} onClick={event => { if (event.target === event.currentTarget) closeRef.current(); }}>
    <div className="dialog-content"><header className="dialog-heading"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label={`Fechar ${title}`}>×</button></header>{children}</div>
  </dialog>;
}
