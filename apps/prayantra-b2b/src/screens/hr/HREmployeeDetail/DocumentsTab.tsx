// apps/prayantra-b2b/src/screens/hr/HREmployeeDetail/DocumentsTab.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useUserAuthStore } from '../../../store/userAuthStore';
import {
  getEmployeeDocuments,
  uploadEmployeeDocument,
  downloadEmployeeDocument,
  deleteEmployeeDocument,
  generateDocumentUrl,
} from '@b2b/api-client';
import { EmployeeDocument, UploadDocumentPayload } from '@b2b/shared-types';
import {
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  CARD_BACKGROUND,
  BORDER_COLOR,
} from '../../../constants/colors';
import { useFocusEffect } from '@react-navigation/native';

interface Props {
  employeeId: string;
}

export default function DocumentsTab({ employeeId }: Props) {
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!accessToken || !companyId || !deviceId) return;
    try {
      const res = await getEmployeeDocuments(companyId, employeeId, deviceId, accessToken, false);
      setDocuments(res.data || []);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [accessToken, companyId, deviceId, employeeId]);

  useFocusEffect(
    useCallback(() => {
      fetchDocuments();
    }, [fetchDocuments])
  );

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const asset = result.assets[0];
      const file: File = {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType || 'application/octet-stream',
      } as any;

      // iOS-only Alert.prompt – replace with custom modal for Android
      if (Platform.OS === 'ios') {
        Alert.prompt(
          'Document Details',
          'Enter document type (e.g., resume, offer_letter)',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Upload',
              // ✅ Accept optional string, handle undefined, and do NOT use async
              onPress: (documentType?: string) => {
                if (!documentType) {
                  Alert.alert('Error', 'Document type is required');
                  return;
                }
                Alert.prompt(
                  'Document Name',
                  'Enter a name for this document',
                  [
                    {
                      text: 'Cancel',
                      style: 'cancel',
                    },
                    {
                      text: 'Upload',
                      // ✅ Accept optional string, handle undefined, do NOT use async
                      onPress: (documentName?: string) => {
                        if (!documentName) {
                          Alert.alert('Error', 'Document name is required');
                          return;
                        }
                        // Call async upload and handle errors
                        uploadDocument(file, documentType, documentName).catch((error) => {
                          Alert.alert('Error', error?.message || 'Upload failed');
                        });
                      },
                    },
                  ],
                  'plain-text',
                  asset.name || 'document'
                );
              },
            },
          ],
          'plain-text',
          'resume'
        );
      } else {
        // Android: use a simple Alert with prompt-style inputs via custom modal
        // For now, fallback to default values
        const documentType = 'resume';
        const documentName = asset.name || 'document';
        await uploadDocument(file, documentType, documentName);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const uploadDocument = async (file: File, documentType: string, documentName: string) => {
    if (!accessToken || !companyId || !deviceId) return;
    setUploading(true);
    try {
      const payload: UploadDocumentPayload = {
        file: file,
        document_type: documentType,
        document_name: documentName,
        is_confidential: false,
      };
      const res = await uploadEmployeeDocument(companyId, employeeId, deviceId, accessToken, payload);
      setDocuments((prev) => [res.data, ...prev]);
      Alert.alert('Success', 'Document uploaded successfully');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (documentId: string, documentName: string) => {
    if (!accessToken || !companyId || !deviceId) return;
    setDownloadingId(documentId);
    try {
      const urlRes = await generateDocumentUrl(companyId, employeeId, documentId, deviceId, accessToken, '1h');
      const downloadUrl = urlRes.data.url;

      // ✅ Cast FileSystem to any to bypass missing documentDirectory type
      const downloadRes = await FileSystem.downloadAsync(
        downloadUrl,
        (FileSystem as any).documentDirectory + documentName
      );
      if (downloadRes.status === 200) {
        Alert.alert('Success', 'Document downloaded to ' + downloadRes.uri);
      } else {
        throw new Error('Download failed');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = (documentId: string, documentName: string) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${documentName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!accessToken || !companyId || !deviceId) return;
            setDeletingId(documentId);
            try {
              await deleteEmployeeDocument(companyId, employeeId, documentId, deviceId, accessToken);
              setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
              Alert.alert('Success', 'Document deleted');
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Delete failed');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: EmployeeDocument }) => {
    const isDeleting = deletingId === item.id;
    const isDownloading = downloadingId === item.id;
    return (
      <View style={styles.docCard}>
        <View style={styles.docInfo}>
          <Icon name="file-document" size={24} color={PRIMARY_COLOR} />
          <View style={styles.docMeta}>
            <Text style={styles.docName} numberOfLines={1}>
              {item.document_name}
            </Text>
            <Text style={styles.docType}>{item.document_type}</Text>
          </View>
        </View>
        <View style={styles.docActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDownload(item.id, item.document_name)}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color={PRIMARY_COLOR} />
            ) : (
              <Icon name="download" size={20} color={PRIMARY_COLOR} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDelete(item.id, item.document_name)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Icon name="delete" size={20} color="#ef4444" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.uploadButton} onPress={handleUpload} disabled={uploading}>
        <Icon name="upload" size={20} color="#fff" />
        <Text style={styles.uploadText}>{uploading ? 'Uploading...' : 'Upload Document'}</Text>
      </TouchableOpacity>

      <FlatList
        data={documents}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="file-outline" size={48} color={TEXT_SECONDARY} />
            <Text style={styles.emptyText}>No documents</Text>
            <Text style={styles.emptySubtext}>Upload a document to get started</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButton: {
    backgroundColor: PRIMARY_COLOR,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  uploadText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  list: {
    paddingBottom: 20,
  },
  docCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  docInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  docMeta: {
    marginLeft: 10,
    flex: 1,
  },
  docName: {
    fontSize: 14,
    fontWeight: '500',
    color: TEXT_PRIMARY,
  },
  docType: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  docActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 6,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginTop: 4,
  },
});