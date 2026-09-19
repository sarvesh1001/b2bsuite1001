import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Chip } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack'; // ✅ ADDED
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { listUserDocuments, Document } from '../../services/kyc';
import { RootStackParamList } from '../../navigation';

export default function UserDocumentsScreen() {
  const route = useRoute<RouteProp<{ params: { userId: string } }, 'params'>>();
  // ✅ Typed navigation
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { userId } = route.params;

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, [userId]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const docs = await listUserDocuments(userId);
      setDocuments(docs);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Document }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('DocumentView', { docId: item.id })}
      activeOpacity={0.7}
    >
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.row}>
            <Text variant="titleSmall" style={styles.type}>
              {item.document_type.toUpperCase()}
            </Text>
            <Chip
              style={[
                styles.statusChip,
                item.upload_status === 'verified'
                  ? styles.verified
                  : item.upload_status === 'rejected'
                  ? styles.rejected
                  : styles.pending,
              ]}
            >
              {item.upload_status}
            </Chip>
          </View>
          <Text variant="bodySmall" style={styles.fileKey} numberOfLines={1}>
            {item.file_key}
          </Text>
          <Text variant="bodySmall" style={styles.date}>
            Uploaded: {new Date(item.created_at).toLocaleString()}
          </Text>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#7B2FBE" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <FlatList
        data={documents}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="file-document-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No documents found for this user</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 16, paddingVertical: 8 },
  card: { marginBottom: 12, borderRadius: 12, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  type: { fontWeight: '600', color: '#1A1A1A' },
  statusChip: { backgroundColor: '#f0f0f0' },
  verified: { backgroundColor: '#C8E6C9' },
  rejected: { backgroundColor: '#FFCDD2' },
  pending: { backgroundColor: '#FFF9C4' },
  fileKey: { color: '#666', marginTop: 4, fontSize: 12 },
  date: { color: '#888', marginTop: 4, fontSize: 12 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#999', marginTop: 12 },
});