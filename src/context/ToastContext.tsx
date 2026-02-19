import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto remove after 3.5s
    setTimeout(() => {
      removeToast(id);
    }, 3500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Toast Container overlaid globally */}
      <div className="fixed top-safe mt-6 left-0 right-0 z-50 flex flex-col items-center pointer-events-none px-4 space-y-2">
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className={`
              pointer-events-auto flex items-center gap-2 max-w-sm w-full py-3 px-4 rounded-xl shadow-lg shadow-black/20 
              transform transition-all duration-300 animate-slideDown border
              ${toast.type === 'success' ? 'bg-primary/10 text-primary border-primary/20 backdrop-blur-md' : 
                toast.type === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/20 backdrop-blur-md' : 
                'bg-surface/90 text-text border-border backdrop-blur-md'}
            `}
          >
             <span className="material-icons-round text-lg">
                {toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error_outline' : 'info'}
             </span>
             <p className="text-sm font-bold tracking-wide flex-1">{toast.message}</p>
             <button onClick={() => removeToast(toast.id)} className="opacity-50 hover:opacity-100 flex items-center justify-center p-1">
                <span className="material-icons-round text-sm">close</span>
             </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
