// src/hooks/useCamera.ts
import { useState, useEffect } from 'react';
import { Camera, useCameraPermissions } from 'expo-camera';

export const useCamera = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    if (permission?.granted) {
      setHasPermission(true);
    } else {
      requestPermission();
    }
  }, [permission]);

  const request = async () => {
    const result = await requestPermission();
    setHasPermission(result.granted);
    return result.granted;
  };

  return { hasPermission, requestPermission: request };
};