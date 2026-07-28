// apps/mobile/src/services/kyc.ts
import { axiosInstance } from '@b2b/api-client';
import { useAuthStore } from '../store/authStore';
import { idempotentPost } from '../utils/idempotencyRequest';

// Types
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
  status: string;
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

// Helper to get auth headers
const getHeaders = (additionalHeaders: Record<string, string> = {}) => {
  const { accessToken, deviceId } = useAuthStore.getState();
  return {
    Authorization: `Bearer ${accessToken}`,
    'X-Device-ID': deviceId || '',
    ...additionalHeaders,
  };
};

// Step 1: Request upload URL (idempotent)
export async function getUploadUrl(
  userId: string,
  documentType: string,
  originalName: string
): Promise<UploadUrlResponse> {
  const operation = `upload-url-${userId}-${documentType}`;
  const response = await idempotentPost(
    '/admin/kyc/documents/upload-url',
    {
      user_id: userId,
      document_type: documentType,
      file_metadata: { original_name: originalName },
    },
    operation,
    { headers: getHeaders({ 'Content-Type': 'application/json' }) }
  );
  // response.data contains { file_key, upload_url, expires_in }
  return response.data;
}

// Step 2: Upload the file to the presigned URL
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
  fileKey: string,
  fileMetadata: DocumentMetadata,
  expiresAt?: string
): Promise<Document> {
  const operation = `metadata-${userId}-${documentType}-${fileKey}`;
  const response = await idempotentPost(
    '/admin/kyc/documents',
    {
      user_id: userId,
      document_type: documentType,
      file_key: fileKey,
      file_metadata: fileMetadata,
      expires_at: expiresAt,
    },
    operation,
    { headers: getHeaders({ 'Content-Type': 'application/json' }) }
  );
  return response.data; // the Document object
}

// Main orchestrator
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
    const { file_key, upload_url } = await getUploadUrl(userId, documentType, originalName);
    await uploadFile(upload_url, file_key, fileUri, mimeType, originalName);
    const doc = await createDocumentMetadata(
      userId,
      documentType,
      file_key,
      { size: fileSize, mime_type: mimeType, original_name: originalName },
      expiresAt
    );
    return doc;
  } catch (error) {
    console.error('KYC upload failed:', error);
    throw error;
  }
}