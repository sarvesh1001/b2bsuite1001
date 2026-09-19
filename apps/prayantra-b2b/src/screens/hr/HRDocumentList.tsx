// apps/prayantra-b2b/src/screens/hr/HRDocumentList.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useUserAuthStore } from '../../store/userAuthStore';
import {
  getEmployeeDocuments,
  uploadEmployeeDocument,
  downloadEmployeeDocument,
  deleteEmployeeDocument,
  generateDocumentUrl,
} from '@b2b/api-client';
import { EmployeeDocument, UploadDocumentPayload } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../constants/colors';
import { RootStackParamList } from '../../navigation';
import { useFocusEffect } from '@react-navigation/native';

type RouteProps = RouteProp<RootStackParamList, 'HRDocumentList'>;
type NavigationProps = StackNavigationProp<RootStackParamList, 'HRDocumentList'>;

export default function HRDocumentList() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProps>();
  const { employeeId, employeeName } = route.params || {};
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!accessToken || !companyId || !deviceId || !employeeId) return;
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

      // Simple prompt using Alert with custom input (iOS only fallback)
      // For cross-platform, use a custom modal; here we'll use default values.
      // In production, use a modal with text inputs.
      Alert.alert(
        'Document Details',
        'Enter document type (e.g., resume) and name',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Upload',
            onPress: () => {
              // Using default values for demo; replace with actual input.
              const documentType = 'resume';
              const documentName = asset.name || 'document';
              uploadDocument(file, documentType, documentName);
            },
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const uploadDocument = async (file: File, documentType: string, documentName: string) => {
    if (!accessToken || !companyId || !deviceId || !employeeId) return;
    setUploading(true);
    try {
      const payload: UploadDocumentPayload = {
        file,
        document_type: documentType,
        document_name: documentName,
        is_confidential: false,
      };
      const res = await uploadEmployeeDocument(companyId, employeeId, deviceId, accessToken, payload);
      setDocuments((prev) => [res.data, ...prev]);
      Alert.alert('Success', 'Document uploaded');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (documentId: string, documentName: string) => {
    if (!accessToken || !companyId || !deviceId || !employeeId) return;
    try {
      const urlRes = await generateDocumentUrl(companyId, employeeId, documentId, deviceId, accessToken, '1h');
      // ✅ Fix: cast FileSystem to any to access documentDirectory
      const downloadRes = await FileSystem.downloadAsync(
        urlRes.data.url,
        (FileSystem as any).documentDirectory + documentName
      );
      if (downloadRes.status === 200) {
        Alert.alert('Success', 'Downloaded to ' + downloadRes.uri);
      } else {
        throw new Error('Download failed');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Download failed');
    }
  };

  const handleDelete = (documentId: string, documentName: string) => {
    Alert.alert(
      'Delete Document',
      `Delete "${documentName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!accessToken || !companyId || !deviceId || !employeeId) return;
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

  const renderItem = ({ item }: { item: EmployeeDocument }) => (
    <View style={styles.docCard}>
      <Icon name="file-document" size={24} color={PRIMARY_COLOR} style={styles.docIcon} />
      <View style={styles.docInfo}>
        <Text style={styles.docName}>{item.document_name}</Text>
        <Text style={styles.docMeta}>{item.document_type} • {item.file_size ? (item.file_size / 1024).toFixed(1) + ' KB' : ''}</Text>
      </View>
      <View style={styles.docActions}>
        <TouchableOpacity onPress={() => handleDownload(item.id, item.document_name)} style={styles.actionButton}>
          <Icon name="download" size={20} color={PRIMARY_COLOR} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDelete(item.id, item.document_name)}
          style={styles.actionButton}
          disabled={deletingId === item.id}
        >
          {deletingId === item.id ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <Icon name="delete" size={20} color="#ef4444" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading documents...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {employeeName ? `${employeeName} - Documents` : 'Documents'}
        </Text>
        <TouchableOpacity onPress={handleUpload} disabled={uploading} style={styles.uploadButton}>
          {uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Icon name="upload" size={24} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={documents}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="file-outline" size={60} color={TEXT_SECONDARY} />
            <Text style={styles.emptyTitle}>No Documents</Text>
            <Text style={styles.emptySubtitle}>Upload documents for this employee</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BACKGROUND_COLOR,
  },
  loadingText: {
    marginTop: 12,
    color: TEXT_SECONDARY,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginLeft: 10,
  },
  uploadButton: {
    backgroundColor: PRIMARY_COLOR,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  docCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    flexDirection: 'row',
    alignItems: 'center',
  },
  docIcon: {
    marginRight: 12,
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: 14,
    fontWeight: '500',
    color: TEXT_PRIMARY,
  },
  docMeta: {
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
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginTop: 4,
  },
});