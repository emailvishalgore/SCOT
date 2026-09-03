import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  const getIcon = () => {
    if (type === 'success') return <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />;
    if (type === 'error') return <AlertTriangle size={16} style={{ color: 'var(--color-danger)' }} />;
    return <Info size={16} style={{ color: 'var(--color-info)' }} />;
  };

  return (
    <motion.div 
      className={`toast toast-${type}`}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      {getIcon()}
      <span>{message}</span>
    </motion.div>
  );
}
