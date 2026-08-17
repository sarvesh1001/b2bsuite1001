import React from 'react';
import { FiX } from 'react-icons/fi';

interface SelectModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const SelectModal: React.FC<SelectModalProps> = ({ visible, onClose, title, children }) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl w-full max-h-[70%] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 flex justify-between items-center px-4 py-3">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={24} />
          </button>
        </div>
        <div className="p-2">{children}</div>
      </div>
    </div>
  );
};