import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';

interface Props {
  qrData: string;     // base64-encoded JSON payload
  expiresIn: number;
}

const QRCodeDisplay: React.FC<Props> = ({ qrData, expiresIn }) => {
  console.log('[QRCodeDisplay] Received qrData (base64):', qrData);
  console.log('[QRCodeDisplay] expiresIn:', expiresIn);

  let jsonString: string;
  try {
    jsonString = atob(qrData);
    console.log('[QRCodeDisplay] Decoded JSON string:', jsonString);
  } catch (err) {
    console.error('[QRCodeDisplay] Failed to decode base64:', err);
    return (
      <div className="text-red-500">
        Error decoding QR data. Please refresh.
      </div>
    );
  }

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