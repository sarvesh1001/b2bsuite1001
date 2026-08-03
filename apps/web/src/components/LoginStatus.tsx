import React from 'react';
import { StatusResponse } from '../services/webLogin';

interface Props {
  status: StatusResponse | null;
}

const LoginStatus: React.FC<Props> = ({ status }) => {
  if (!status) return <div className="text-gray-500 mt-4">Waiting for status...</div>;

  // 🎨 Brand colors: purple (#7B2FBE) and cyan (#00B4DB)
  const statusMap: Record<string, { label: string; color: string; icon: string }> = {
    pending: { label: 'Scan the QR with the mobile app', color: 'text-purple-600', icon: '⏳' },
    scanned: { label: 'QR scanned! Waiting for confirmation...', color: 'text-cyan-600', icon: '✅' },
    paired: { label: 'Paired successfully!', color: 'text-green-600', icon: '🎉' },
    expired: { label: 'QR code expired. Please refresh.', color: 'text-red-600', icon: '⏰' },
  };

  const info = statusMap[status.status] || { label: 'Unknown status', color: 'text-gray-600', icon: '❓' };

  return (
    <div className={`mt-4 flex items-center justify-center space-x-2 ${info.color}`}>
      <span className="text-xl">{info.icon}</span>
      <span className="font-medium">{info.label}</span>
    </div>
  );
};

export default LoginStatus;