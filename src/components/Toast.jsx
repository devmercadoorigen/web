import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);

// Para avisar desde fuera de React (p. ej. errores globales de React Query).
let external = null;
export const toast = (text, tone = 'ok') => external?.(text, tone);

// Mensajes breves en la parte baja de la pantalla. `tone: 'error'` para errores.
export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ text: '', tone: 'ok' });
  const timer = useRef();
  const notify = useCallback((text, tone = 'ok') => {
    setToast({ text, tone });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast((t) => ({ ...t, text: '' })), tone === 'error' ? 4200 : 2400);
  }, []);
  external = notify;
  return <ToastContext.Provider value={{ toast, notify }}>{children}</ToastContext.Provider>;
}

export const useToast = () => useContext(ToastContext);

export function Toast() {
  const { toast } = useToast();
  return (
    <div className={`toast${toast.text ? ' on' : ''}${toast.tone === 'error' ? ' err' : ''}`} role={toast.tone === 'error' ? 'alert' : 'status'}>
      {toast.text}
    </div>
  );
}
