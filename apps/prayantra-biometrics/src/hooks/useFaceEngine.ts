import { useEffect, useState } from 'react';
import { FaceEngineModule } from '../native/FaceEngine';
import { getEmployees } from '../services/DatabaseService';
import * as FileSystem from 'expo-file-system/legacy';

export const useFaceEngine = () => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEngine = async () => {
    try {
      setError(null);
      setIsReady(false);

      const docDir = FileSystem.documentDirectory;

      if (!docDir) {
        throw new Error('No document directory available');
      }

      const modelsDir = `${docDir}models/`;

      // Make sure models directory exists
      const modelsDirInfo = await FileSystem.getInfoAsync(modelsDir);

      if (!modelsDirInfo.exists) {
        await FileSystem.makeDirectoryAsync(modelsDir, {
          intermediates: true,
        });
      }

      const detectorPath =
        `${modelsDir}face_detection_yunet_2023mar.onnx`;

      const recognizerPath =
        `${modelsDir}face_recognition_sface_2021dec.onnx`;

      // IMPORTANT:
      // These paths must point to actual bundled assets.
      const detectorAsset =
        'assets/models/face_detection_yunet_2023mar.onnx';

      const recognizerAsset =
        'assets/models/face_recognition_sface_2021dec.onnx';

      // Copy detector
      const detectorExists =
        await FileSystem.getInfoAsync(detectorPath);

      if (!detectorExists.exists) {
        await FileSystem.copyAsync({
          from: detectorAsset,
          to: detectorPath,
        });
      }

      // Copy recognizer
      const recognizerExists =
        await FileSystem.getInfoAsync(recognizerPath);

      if (!recognizerExists.exists) {
        await FileSystem.copyAsync({
          from: recognizerAsset,
          to: recognizerPath,
        });
      }

      console.log('Detector:', detectorPath);
      console.log('Recognizer:', recognizerPath);

      // Load native models
      const ok = await FaceEngineModule.loadModels(
        detectorPath,
        recognizerPath
      );

      if (!ok) {
        throw new Error('Failed to load face models');
      }

      // Load employees
      const employees = await getEmployees();

      await FaceEngineModule.setEmployees(
        employees.map(e => ({
          id: e.id,
          embedding: Array.from(e.embedding),
        }))
      );

      setIsReady(true);
    } catch (err: any) {
      console.error('Face engine initialization failed:', err);

      setError(
        err instanceof Error
          ? err.message
          : String(err)
      );
    }
  };

  useEffect(() => {
    loadEngine();
  }, []);

  return {
    isReady,
    error,
    reload: loadEngine,
  };
};