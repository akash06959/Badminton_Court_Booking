'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, AlertCircle } from 'lucide-react';

type NotificationProps = {
    message: string;
    type: 'success' | 'error';
    onClose: () => void;
};

export const Notification = ({ message, type, onClose }: NotificationProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-8 right-8 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-md border border-white/20
                ${type === 'success'
                    ? 'bg-emerald-500/90 text-white shadow-emerald-500/20'
                    : 'bg-red-500/90 text-white shadow-red-500/20'}`}
        >
            <div className={`p-1 rounded-full ${type === 'success' ? 'bg-white/20' : 'bg-white/20'}`}>
                {type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
            </div>
            <div>
                <h4 className="font-bold text-sm tracking-wide uppercase">{type === 'success' ? 'Success' : 'Error'}</h4>
                <p className="text-sm font-medium opacity-90">{message}</p>
            </div>
            <button
                onClick={onClose}
                className="ml-4 p-1 rounded-full hover:bg-white/20 transition-colors"
            >
                <X size={18} />
            </button>
        </motion.div>
    );
};
