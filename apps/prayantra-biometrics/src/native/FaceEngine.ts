import { NativeModules } from 'react-native';

const { FaceEngine } = NativeModules;

export interface Employee {
  id: string;
  embedding: number[]; // 512 floats
}

export interface FaceDetection {
  x: number;
  y: number;
  w: number;
  h: number;
  trackId: number;
  employeeId: string | null;
  recognized: boolean;
  detectionScore: number;
  recognitionScore: number;
  qualityScore: number;
  livenessScore: number;
  live: boolean;
  landmarks: [number, number][];
}

export const FaceEngineModule = {
  loadModels: async (detectorPath: string, recognizerPath: string): Promise<boolean> => {
    return FaceEngine.loadModels(detectorPath, recognizerPath);
  },
  setEmployees: async (employees: Employee[]): Promise<void> => {
    return FaceEngine.setEmployees(employees);
  },
  // Optional: if you need to process a single frame (for enrollment)
  processFrame: async (imageData: string, width: number, height: number): Promise<FaceDetection[]> => {
    return FaceEngine.processFrame(imageData, width, height);
  },
};