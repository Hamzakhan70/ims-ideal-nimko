import React, {createContext, useContext} from 'react';
import toast, {Toaster} from 'react-hot-toast';

const ToastContext = createContext();

export const useToast = () => {
    const context = useContext(ToastContext);
    if (! context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider = ({children}) => {
    const showSuccess = (message) => {
        toast.success(message, {
            duration: 4000,
            position: 'top-right',
            style: {
                background: '#10b981',
                color: '#fff',
                borderRadius: '8px',
                padding: '12px 16px'
            }
        });
    };

    const showError = (message) => {
        toast.error(message, {
            duration: 5000,
            position: 'top-right',
            style: {
                background: '#ef4444',
                color: '#fff',
                borderRadius: '8px',
                padding: '12px 16px'
            }
        });
    };

    const showInfo = (message) => {
        toast(message, {
            duration: 4000,
            position: 'top-right',
            icon: 'ℹ️',
            style: {
                background: '#3b82f6',
                color: '#fff',
                borderRadius: '8px',
                padding: '12px 16px'
            }
        });
    };

    const showWarning = (message) => {
        toast(message, {
            duration: 4000,
            position: 'top-right',
            icon: '⚠️',
            style: {
                background: '#f59e0b',
                color: '#fff',
                borderRadius: '8px',
                padding: '12px 16px'
            }
        });
    };

    const value = {
        showSuccess,
        showError,
        showInfo,
        showWarning
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
            <Toaster/>
        </ToastContext.Provider>
    );
};
