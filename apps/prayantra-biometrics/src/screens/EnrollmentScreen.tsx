import React, { useState, useRef } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { FaceCameraView } from '../components/FaceCameraView';
import { FaceEngineModule } from '../native/FaceEngine';
import { insertEmployee } from '../services/DatabaseService';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';

type NavProps = StackNavigationProp<RootStackParamList, 'Enrollment'>;

export default function EnrollmentScreen() {
  const navigation = useNavigation<NavProps>();
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [samples, setSamples] = useState<number[][]>([]);
  const [capturing, setCapturing] = useState(false);
  const [detections, setDetections] = useState<any[]>([]);

  // This would capture the current frame from the camera view.
  // For now, we'll simulate by using the detection event.
  const onFaceDetected = (event: any) => {
    const dets = event.nativeEvent.detections || [];
    setDetections(dets);
  };

  const captureSample = async () => {
    // In a real implementation, you'd have the native view emit a frame
    // or capture a still image. Here we'll use the first detected face's embedding
    // from the native view (if available).
    // For demo, we'll show an alert and add a dummy embedding.
    if (detections.length === 0) {
      Alert.alert('No face', 'Please position a face in the frame');
      return;
    }
    // Simulate capturing embedding (replace with actual extraction)
    const dummyEmbedding = new Array(512).fill(0).map(() => Math.random());
    setSamples((prev) => [...prev, dummyEmbedding]);
    Alert.alert('Sample captured', `${samples.length + 1}/5`);
  };

  const saveEmployee = async () => {
    if (samples.length < 3) {
      Alert.alert('Not enough samples', 'Capture at least 3 face samples');
      return;
    }
    if (!name.trim() || !id.trim()) {
      Alert.alert('Missing info', 'Please enter employee name and ID');
      return;
    }
    // Average embeddings
    const avg = samples[0].map((_, i) =>
      samples.reduce((sum, emb) => sum + emb[i], 0) / samples.length
    );
    const embedding = new Float32Array(avg);
    await insertEmployee({
      id: id.trim(),
      name: name.trim(),
      department: 'Default',
      embedding,
    });
    Alert.alert('Success', 'Employee enrolled successfully');
    navigation.goBack();
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.cameraWrapper}>
        <FaceCameraView style={styles.camera} onFaceDetected={onFaceDetected} />
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>
            {detections.length > 0 ? `${detections.length} face(s) detected` : 'Position face'}
          </Text>
        </View>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Employee Name"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Employee ID"
          value={id}
          onChangeText={setId}
        />
        <View style={styles.sampleInfo}>
          <Text style={styles.sampleText}>Samples: {samples.length}/5</Text>
          <TouchableOpacity
            style={styles.captureButton}
            onPress={captureSample}
            disabled={samples.length >= 5}
          >
            <Icon name="camera-plus" size={24} color="#fff" />
            <Text style={styles.captureText}>Capture</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveEmployee}
          disabled={samples.length < 3}
        >
          <Text style={styles.saveText}>Save Employee</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F9FC' },
  cameraWrapper: { height: 300, position: 'relative' },
  camera: { flex: 1 },
  overlay: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  overlayText: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 20,
    fontSize: 14,
  },
  form: { padding: 20, flex: 1 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5EAF1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  sampleInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sampleText: { fontSize: 14, color: '#475569' },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7B2FBE',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  captureText: { color: '#fff', fontWeight: '600', marginLeft: 6 },
  saveButton: {
    backgroundColor: '#7B2FBE',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});