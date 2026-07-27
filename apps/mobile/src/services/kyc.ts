// apps/mobile/src/services/kyc.ts
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { axiosInstance } from '@b2b/api-client';
import { useAuthStore } from '../store/authStore';

// Types (reuse from shared-types or define locally)
export interface DocumentMetadata {
  size: number;
  mime_type: string;
  original_name: string;
}

export interface Document {
  id: string;
  user_id: string;
  document_type: string;
  file_key: string;
  file_metadata: DocumentMetadata;
  upload_status: 'pending' | 'uploaded' | 'verified' | 'rejected';
  status: string; // maybe 'uploaded', 'verified', etc.
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UploadUrlResponse {
  file_key: string;
  upload_url: string;
  expires_in: number;
}

export interface UploadFileResponse {
  file_key: string;
}

// Helper to get auth headers (device ID and token)
const getHeaders = (additionalHeaders: Record<string, string> = {}) => {
  const { accessToken, deviceId } = useAuthStore.getState();
  return {
    Authorization: `Bearer ${accessToken}`,
    'X-Device-ID': deviceId || '',
    ...additionalHeaders,
  };
};

// Step 1: Request upload URL
export async function getUploadUrl(
  userId: string,
  documentType: string,
  originalName: string
): Promise<UploadUrlResponse> {
  const response = await axiosInstance.post(
    '/kyc/documents/upload-url',
    {
      user_id: userId,
      document_type: documentType,
      file_metadata: { original_name: originalName },
    },
    { headers: getHeaders({ 'Content-Type': 'application/json' }) }
  );
  return response.data.data;
}

// Step 2: Upload the file (multipart/form-data)
export async function uploadFile(
  uploadUrl: string,
  fileKey: string,
  fileUri: string,
  mimeType: string,
  fileName: string
): Promise<UploadFileResponse> {
  const formData = new FormData();
  formData.append('file_key', fileKey);
  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  } as any);

  // Use the same axios instance but without the JSON content-type
  const response = await axiosInstance.post(uploadUrl, formData, {
    headers: getHeaders({
      'Content-Type': 'multipart/form-data',
    }),
  });
  return response.data.data;
}

// Step 3: Create metadata (idempotent)
export async function createDocumentMetadata(
  userId: string,
  documentType: string,
  fileMetadata: DocumentMetadata,
  expiresAt?: string
): Promise<Document> {
  const idempotencyKey = uuidv4(); // generate per attempt

  const response = await axiosInstance.post(
    '/kyc/documents',
    {
      user_id: userId,
      document_type: documentType,
      file_metadata: fileMetadata,
      expires_at: expiresAt,
    },
    {
      headers: getHeaders({
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      }),
    }
  );
  return response.data.data;
}

// Main orchestration function that ties steps together
export async function uploadKycDocument(
  userId: string,
  documentType: 'identity' | 'address' | 'business' | 'selfie',
  fileUri: string,
  mimeType: string,
  fileSize: number,
  originalName: string,
  expiresAt?: string
): Promise<Document> {
  try {
    // 1. Get upload URL and file key
    const { file_key, upload_url } = await getUploadUrl(userId, documentType, originalName);

    // 2. Upload the file
    await uploadFile(upload_url, file_key, fileUri, mimeType, originalName);

    // 3. Create metadata (idempotent)
    const doc = await createDocumentMetadata(
      userId,
      documentType,
      {
        size: fileSize,
        mime_type: mimeType,
        original_name: originalName,
      },
      expiresAt
    );

    return doc;
  } catch (error) {
    console.error('KYC upload failed:', error);
    throw error;
  }
}