import React from 'react';
import { requireNativeComponent, ViewStyle } from 'react-native';

const NativeFaceCameraView = requireNativeComponent('FaceCameraView');

interface FaceCameraViewProps {
  style?: ViewStyle;
  onFaceDetected?: (event: any) => void;
}

export const FaceCameraView: React.FC<FaceCameraViewProps> = (props) => {
  return <NativeFaceCameraView {...props} />;
};