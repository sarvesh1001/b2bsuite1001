import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Chip, Button } from 'react-native-paper';
import { axiosInstance } from '@b2b/api-client';
import { useAuthStore } from '../../store/authStore';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface DocumentDetail {
  id: string;
  user_id: string;
  document_type: string;
  file_key: string;
  upload_status: string;
  created_at: string;
  updated_at: string;
}

export default function DocumentViewScreen() {
  const route = useRoute<RouteProp<{ params: { docId: string } }, 'params'>>();
  const navigation = useNavigation();
  const { docId } = route.params;
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>('');
  const { accessToken, deviceId } = useAuthStore.getState();

  useEffect(() => {
    fetchDocument();
  }, [docId]);

  const fetchDocument = async () => {
    try {
      // 1. Get metadata
      const metaRes = await axiosInstance.get(`/admin/kyc/documents/${docId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
        },
      });
      const docData = metaRes.data.data;
      setDoc(docData);

      // 2. Fetch the actual file
      const fileRes = await axiosInstance.get(`/admin/kyc/documents/${docId}/file`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
        },
        responseType: 'blob',
      });

      const blob = fileRes.data;
      // Safely extract content-type as string
      const contentType = fileRes.headers['content-type'];
      const typeString = typeof contentType === 'string' ? contentType : 'application/octet-stream';
      setFileType(typeString);

      // Only attempt to preview image files
      if (typeString.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          setImageUri(reader.result as string);
        };
        reader.readAsDataURL(blob);
      } else {
        // For non‑images, show placeholder
        setImageUri(null);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load document');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#7B2FBE" />
      </SafeAreaView>
    );
  }

  if (!doc) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text>Document not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Document Preview
          </Text>
          <Chip style={styles.statusChip}>
            {doc.upload_status.toUpperCase()}
          </Chip>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
            ) : (
              <View style={styles.placeholder}>
                <Icon name="file-document-outline" size={60} color="#ccc" />
                <Text style={styles.placeholderText}>
                  {fileType || 'No preview available'}
                </Text>
                <Button
                  mode="contained"
                  onPress={() => Alert.alert('Info', 'Download feature coming soon')}
                  style={styles.downloadButton}
                >
                  Download File
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.detailsCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Document Details
            </Text>
            <View style={styles.row}>
              <Text style={styles.label}>Type:</Text>
              <Text style={styles.value}>{doc.document_type}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>User ID:</Text>
              <Text style={styles.value} numberOfLines={1}>{doc.user_id}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Uploaded:</Text>
              <Text style={styles.value}>{new Date(doc.created_at).toLocaleString()}</Text>
            </View>
            {doc.upload_status === 'verified' && (
              <View style={styles.row}>
                <Text style={styles.label}>Verified:</Text>
                <Text style={styles.value}>{doc.updated_at ? new Date(doc.updated_at).toLocaleString() : 'N/A'}</Text>
              </View>
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  header: { paddingTop: 16, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontWeight: 'bold', color: '#1A1A1A', fontSize: 24, flex: 1 },
  statusChip: { backgroundColor: '#E8E0F0' },
  card: { marginVertical: 8, borderRadius: 12, elevation: 2, backgroundColor: '#FFFFFF' },
  image: { width: '100%', height: 400, borderRadius: 12 },
  placeholder: { alignItems: 'center', padding: 40 },
  placeholderText: { color: '#999', marginTop: 12, textAlign: 'center' },
  downloadButton: { marginTop: 16, backgroundColor: '#7B2FBE' },
  detailsCard: { marginVertical: 8, borderRadius: 12, elevation: 2, backgroundColor: '#FFFFFF' },
  sectionTitle: { fontWeight: '600', color: '#1A1A1A', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  label: { color: '#666', fontSize: 14 },
  value: { color: '#1A1A1A', fontSize: 14, fontWeight: '500', flex: 1, textAlign: 'right' },
});