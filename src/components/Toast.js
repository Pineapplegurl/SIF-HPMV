import React, { useState, useEffect } from 'react';
import { FaCheck, FaTimes, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';

const Toast = ({ message, type = 'success', duration = 3000, onClose, isVisible }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setTimeout(onClose, 300); // Délai pour l'animation de sortie
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible && !isAnimating) return null;

  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: <FaCheck size={16} />,
          bgColor: 'bg-green-500',
          borderColor: 'border-green-600',
          textColor: 'text-white'
        };
      case 'error':
        return {
          icon: <FaTimes size={16} />,
          bgColor: 'bg-red-500',
          borderColor: 'border-red-600',
          textColor: 'text-white'
        };
      case 'warning':
        return {
          icon: <FaExclamationTriangle size={16} />,
          bgColor: 'bg-orange-500',
          borderColor: 'border-orange-600',
          textColor: 'text-white'
        };
      case 'info':
        return {
          icon: <FaInfoCircle size={16} />,
          bgColor: 'bg-blue-500',
          borderColor: 'border-blue-600',
          textColor: 'text-white'
        };
      default:
        return {
          icon: <FaInfoCircle size={16} />,
          bgColor: 'bg-gray-500',
          borderColor: 'border-gray-600',
          textColor: 'text-white'
        };
    }
  };

  const config = getToastConfig();

  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border-l-4 transition-all duration-300 transform ${
        isAnimating ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      } ${config.bgColor} ${config.borderColor} ${config.textColor}`}
      style={{
        minWidth: '300px',
        maxWidth: '500px',
        fontFamily: 'Inter, Poppins, Roboto, sans-serif'
      }}
    >
      <div className="flex-shrink-0">
        {config.icon}
      </div>
      <div className="flex-1 text-sm font-medium">
        {message}
      </div>
      <button
        onClick={() => {
          setIsAnimating(false);
          setTimeout(onClose, 300);
        }}
        className="flex-shrink-0 hover:bg-black hover:bg-opacity-20 rounded p-1 transition-colors"
      >
        <FaTimes size={12} />
      </button>
    </div>
  );
};

// Hook personnalisé pour gérer les toasts
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success', duration = 3000) => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type, duration, isVisible: true };
    
    setToasts(prev => [...prev, toast]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const ToastContainer = () => (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast, index) => (
        <div key={toast.id} style={{ transform: `translateY(${index * 10}px)` }}>
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            isVisible={toast.isVisible}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );

  return {
    showToast,
    ToastContainer
  };
};

export default Toast;
