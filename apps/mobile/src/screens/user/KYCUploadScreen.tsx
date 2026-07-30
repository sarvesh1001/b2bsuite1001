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
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Chip, Divider, TextInput } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { uploadKycDocument } from '../../services/kyc';
import { searchUsersByUsername, User } from '../../services/admin';
import { RootStackParamList } from '../../navigation'; // ✅ import the param list

type DocumentType = 'identity' | 'address' | 'business' | 'selfie';

const DOCUMENT_LABELS: Record<DocumentType, string> = {
  identity: 'Identity Proof',
  address: 'Address Proof',
  business: 'Business Document',
  selfie: 'Selfie',
};

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];

export default function KYCUploadScreen() {
  // ✅ Use typed navigation
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const [selectedType, setSelectedType] = useState<DocumentType>('identity');
  const [image, setImage] = useState<{
    uri: string;
    mimeType: string;
    size: number;
    name: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedDoc, setUploadedDoc] = useState<any>(null);

  // User selection state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Info', 'Please enter a username');
      return;
    }
    setSearching(true);
    try {
      const result = await searchUsersByUsername(searchQuery.trim(), 20);
      const users = result.users || [];
      setSearchResults(users);
      setShowResults(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectUser = (user: User) => {
    setSelectedUserId(user.user_id);
    setSelectedUserName(user.username || user.full_name || '');
    setShowResults(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const clearSelectedUser = () => {
    setSelectedUserId(null);
    setSelectedUserName('');
    setImage(null);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'We need access to your photo library to upload documents.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      if (asset.mimeType && !ALLOWED_MIME_TYPES.includes(asset.mimeType)) {
        Alert.alert('Invalid File', 'Please select a JPEG or PNG image.');
        return;
      }
      setImage({
        uri: asset.uri,
        mimeType: asset.mimeType || 'image/jpeg',
        size: asset.fileSize || 0,
        name: asset.fileName || 'photo.jpg',
      });
    }
  };

  const handleUpload = async () => {
    if (!selectedUserId) {
      Alert.alert('Error', 'Please select a user first.');
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
    try {
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      const expiresAtISO = expiresAt.toISOString();

      const doc = await uploadKycDocument(
        selectedUserId,
        selectedType,
        image.uri,
        image.mimeType,
        image.size,
        image.name,
        expiresAtISO
      );
      setUploadedDoc(doc);
      // ✅ Now navigation is properly typed
      Alert.alert(
        'Success',
        `Document uploaded successfully (ID: ${doc.id})`,
        [
          {
            text: 'View Document',
            onPress: () => navigation.navigate('DocumentView', { docId: doc.id }),
          },
          { text: 'OK', style: 'cancel' },
        ]
      );
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text variant="headlineMedium" style={styles.title}>
              Upload KYC Document
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Select a user and upload a document.
            </Text>
          </View>

          {/* User Selection Card */}
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.label}>Select User</Text>
              {selectedUserId ? (
                <View style={styles.selectedUserContainer}>
                  <Text variant="titleMedium" style={styles.selectedUserText}>
                    {selectedUserName}
                  </Text>
                  <TouchableOpacity onPress={clearSelectedUser} style={styles.clearButton}>
                    <Icon name="close-circle" size={24} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <View style={styles.searchRow}>
                    <TextInput
                      mode="outlined"
                      label="Username"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      style={styles.searchInput}
                      theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                    />
                    <TouchableOpacity
                      onPress={handleSearch}
                      disabled={searching}
                      style={styles.searchButton}
                    >
                      <LinearGradient
                        colors={['#00B4DB', '#7B2FBE']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.searchGradient}
                      >
                        {searching ? (
                          <ActivityIndicator color="white" size="small" />
                        ) : (
                          <Icon name="magnify" size={24} color="white" />
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                  {showResults && (
                    <View style={styles.resultsContainer}>
                      {searchResults.length === 0 ? (
                        <Text style={styles.noResultText}>No users found</Text>
                      ) : (
                        <FlatList
                          data={searchResults}
                          keyExtractor={(item) => item.user_id}
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={styles.resultItem}
                              onPress={() => handleSelectUser(item)}
                            >
                              <Text variant="bodyMedium">{item.username}</Text>
                              <Text variant="bodySmall" style={styles.resultSub}>
                                {item.full_name}
                              </Text>
                            </TouchableOpacity>
                          )}
                          ItemSeparatorComponent={() => <Divider />}
                          scrollEnabled={false}
                          style={styles.list}
                        />
                      )}
                    </View>
                  )}
                </View>
              )}
            </Card.Content>
          </Card>

          {/* Document Type Card */}
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.label}>Document Type</Text>
              {renderTypeChips()}
            </Card.Content>
          </Card>

          {/* Image Selection Card */}
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
                  <TouchableOpacity
                    onPress={() => setImage(null)}
                    style={styles.removeButton}
                  >
                    <Icon name="close-circle" size={28} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={pickImage}
                >
                  <Icon name="camera-plus" size={40} color="#7B2FBE" />
                  <Text style={styles.pickerText}>Tap to select an image</Text>
                  <Text style={styles.pickerSubtext}>JPEG, PNG accepted</Text>
                </TouchableOpacity>
              )}
            </Card.Content>
          </Card>

          <TouchableOpacity
            onPress={handleUpload}
            disabled={uploading || !selectedUserId || !image}
            activeOpacity={0.8}
            style={styles.buttonWrapper}
          >
            <LinearGradient
              colors={['#00B4DB', '#7B2FBE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.buttonGradient,
                (uploading || !selectedUserId || !image) && styles.buttonDisabled,
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
      </KeyboardAvoidingView>
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
  pickerSubtext: { color: '#999', fontSize: 12, marginTop: 4 },
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

  selectedUserContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3E5F5',
    padding: 12,
    borderRadius: 8,
  },
  selectedUserText: { color: '#4A148C' },
  clearButton: { padding: 4 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'white',
    marginRight: 8,
  },
  searchButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  searchGradient: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
  },
  resultsContainer: {
    marginTop: 8,
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 2,
    maxHeight: 200,
  },
  list: { maxHeight: 180 },
  resultItem: {
    padding: 12,
  },
  resultSub: {
    color: '#888',
  },
  noResultText: {
    padding: 12,
    color: '#999',
    textAlign: 'center',
  },
});