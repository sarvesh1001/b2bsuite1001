import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';

interface Props {
  qrData: string;     // base64-encoded JSON payload
  expiresIn: number;
}

const QRCodeDisplay: React.FC<Props> = ({ qrData, expiresIn }) => {
  // Decode base64 to get the actual JSON string (contains session_id, signature, etc.)
  const jsonString = atob(qrData);

  return (
    <div className="flex flex-col items-center">
      <div className="bg-white p-4 rounded-lg shadow-inner border border-gray-200">
        <QRCodeCanvas value={jsonString} size={256} level="H" includeMargin />
      </div>
      <p className="text-sm text-gray-500 mt-2">
        QR code expires in {Math.floor(expiresIn / 60)} minutes
      </p>
    </div>
  );
};

export default QRCodeDisplay;