export interface Detection {
  bbox: [number, number, number, number]; // [x, y, width, height]
  class: string;
  score: number;
}

export interface LicensePlateResult {
  detection: Detection;
  plateText?: string;
  confidence: number;
  timestamp: Date;
  imageUri?: string;
}

export interface CameraSettings {
  facing: 'front' | 'back';
  flash: 'on' | 'off' | 'auto';
  autoDetect: boolean;
}

export interface AppState {
  isModelLoaded: boolean;
  isDetecting: boolean;
  detections: Detection[];
  history: LicensePlateResult[];
}

// Re-export detection types
export * from './detection';
