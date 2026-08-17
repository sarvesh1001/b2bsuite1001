import React from 'react';

interface SwitchProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

export const Switch: React.FC<SwitchProps> = ({ value, onChange }) => {
  return (
    <button
      type="button"
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        value ? 'bg-blue-600' : 'bg-gray-300'
      }`}
      onClick={() => onChange(!value)}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
};