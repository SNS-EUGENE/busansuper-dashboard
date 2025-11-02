import { createContext, useContext, useState, ReactNode } from 'react';

interface AlertContextType {
  showAlert: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  showConfirm: (message: string, onConfirm: () => void) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider');
  }
  return context;
};

interface AlertState {
  isOpen: boolean;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  isConfirm: boolean;
  onConfirm?: () => void;
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState<AlertState>({
    isOpen: false,
    message: '',
    type: 'info',
    isConfirm: false,
  });

  const showAlert = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setAlert({ isOpen: true, message, type, isConfirm: false });
  };

  const showConfirm = (message: string, onConfirm: () => void) => {
    setAlert({ isOpen: true, message, type: 'warning', isConfirm: true, onConfirm });
  };

  const handleClose = () => {
    setAlert((prev) => ({ ...prev, isOpen: false }));
  };

  const handleConfirm = () => {
    if (alert.onConfirm) {
      alert.onConfirm();
    }
    handleClose();
  };

  const getIcon = () => {
    switch (alert.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
    }
  };

  const getColor = () => {
    switch (alert.type) {
      case 'success':
        return 'bg-green-600';
      case 'error':
        return 'bg-red-600';
      case 'warning':
        return 'bg-yellow-600';
      case 'info':
        return 'bg-blue-600';
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      {/* Alert Modal */}
      {alert.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={!alert.isConfirm ? handleClose : undefined}
          />

          {/* Alert Box */}
          <div className="relative bg-gray-800 rounded-lg shadow-2xl border border-gray-700 p-6 max-w-md w-full mx-4 animate-[scale-in_0.2s_ease-out]">
            {/* Icon */}
            <div className={`mx-auto w-16 h-16 rounded-full ${getColor()} flex items-center justify-center text-white text-3xl font-bold mb-4`}>
              {getIcon()}
            </div>

            {/* Message */}
            <p className="text-white text-center text-lg mb-6 whitespace-pre-line">
              {alert.message}
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
              {alert.isConfirm ? (
                <>
                  <button
                    onClick={handleClose}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition"
                  >
                    확인
                  </button>
                </>
              ) : (
                <button
                  onClick={handleClose}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition"
                >
                  확인
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
}
