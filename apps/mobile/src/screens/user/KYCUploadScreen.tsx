// apps/mobile/src/screens/user/KYCUploadScreen.tsx
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Button, Chip, Divider } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { uploadKycDocument } from '../../services/kyc';
import { useAuthStore } from '../../store/authStore';

type DocumentType = 'identity' | 'address' | 'business' | 'selfie';

const DOCUMENT_LABELS: Record<DocumentType, string> = {
  identity: 'Identity Proof',
  address: 'Address Proof',
  business: 'Business Document',
  selfie: 'Selfie',
};

export default function KYCUploadScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((state) => state.user);
  const [selectedType, setSelectedType] = useState<DocumentType>('identity');
  const [image, setImage] = useState<{
    uri: string;
    mimeType: string;
    size: number;
    name: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0); // not used in this simple version but can be extended
  const [uploadedDoc, setUploadedDoc] = useState<any>(null);

  // Permission request
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'We need access to your photo library to upload documents.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setImage({
        uri: asset.uri,
        mimeType: asset.mimeType || 'image/jpeg',
        size: asset.fileSize || 0,
        name: asset.fileName || 'photo.jpg',
      });
    }
  };

  const handleUpload = async () => {
    if (!user?.user_id) {
      Alert.alert('Error', 'User not logged in.');
      return;
    }
    if (!image) {
      Alert.alert('No Image', 'Please select an image first.');
      return;
    }
    if (image.size > 20 * 1024 * 1024) {
      Alert.alert('File Too Large', 'Please choose an image under 20 MB.');
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const doc = await uploadKycDocument(
        user.user_id,
        selectedType,
        image.uri,
        image.mimeType,
        image.size,
        image.name,
        '2027-01-01T00:00:00Z' // optional expiry
      );
      setUploadedDoc(doc);
      Alert.alert('Success', `Document uploaded successfully (ID: ${doc.id})`);
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Upload failed.';
      Alert.alert('Upload Failed', msg);
    } finally {
      setUploading(false);
    }
  };

  const renderTypeChips = () => {
    const types: DocumentType[] = ['identity', 'address', 'business', 'selfie'];
    return (
      <View style={styles.chipContainer}>
        {types.map((type) => (
          <Chip
            key={type}
            selected={selectedType === type}
            onPress={() => setSelectedType(type)}
            style={[styles.chip, selectedType === type && styles.activeChip]}
            textStyle={selectedType === type ? styles.activeChipText : {}}
          >
            {DOCUMENT_LABELS[type]}
          </Chip>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Upload KYC Document
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Please upload a clear photo of your document.
          </Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.label}>Document Type</Text>
            {renderTypeChips()}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.label}>Select Image</Text>
            {image ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                <View style={styles.imageInfo}>
                  <Text variant="bodySmall">{image.name}</Text>
                  <Text variant="bodySmall">{(image.size / 1024).toFixed(1)} KB</Text>
                </View>
                <TouchableOpacity onPress={() => setImage(null)} style={styles.removeButton}>
                  <Icon name="close-circle" size={28} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.pickerButton} onPress={pickImage}>
                <Icon name="camera-plus" size={40} color="#7B2FBE" />
                <Text style={styles.pickerText}>Tap to select an image</Text>
              </TouchableOpacity>
            )}
          </Card.Content>
        </Card>

        <TouchableOpacity
          onPress={handleUpload}
          disabled={uploading || !image}
          activeOpacity={0.8}
          style={styles.buttonWrapper}
        >
          <LinearGradient
            colors={['#00B4DB', '#7B2FBE']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.buttonGradient,
              (uploading || !image) && styles.buttonDisabled,
            ]}
          >
            {uploading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.buttonText}>Upload Document</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {uploadedDoc && (
          <Card style={styles.resultCard}>
            <Card.Content>
              <Text variant="titleSmall" style={styles.resultTitle}>
                Upload Successful
              </Text>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>ID:</Text>
                <Text style={styles.resultValue}>{uploadedDoc.id}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Status:</Text>
                <Chip style={styles.statusChip}>{uploadedDoc.upload_status}</Chip>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  header: { paddingTop: 16, paddingBottom: 12 },
  title: { fontWeight: 'bold', color: '#1A1A1A', fontSize: 28 },
  subtitle: { color: '#666', marginTop: 4 },
  card: { marginVertical: 8, borderRadius: 12, elevation: 2 },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { marginRight: 8, marginBottom: 8, backgroundColor: '#f0f0f0' },
  activeChip: { backgroundColor: '#7B2FBE' },
  activeChipText: { color: 'white' },
  pickerButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fafafa',
    minHeight: 120,
    justifyContent: 'center',
  },
  pickerText: { color: '#666', marginTop: 8 },
  imagePreviewContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    resizeMode: 'contain',
    backgroundColor: '#f0f0f0',
  },
  imageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'white',
    borderRadius: 14,
  },
  buttonWrapper: { borderRadius: 12, overflow: 'hidden', marginTop: 16 },
  buttonGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center', minHeight: 54 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  resultCard: { marginTop: 16, backgroundColor: '#E8F5E9' },
  resultTitle: { fontWeight: '600', color: '#2E7D32' },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  resultLabel: { color: '#555' },
  resultValue: { fontWeight: '500', color: '#1A1A1A' },
  statusChip: { backgroundColor: '#C8E6C9' },
});