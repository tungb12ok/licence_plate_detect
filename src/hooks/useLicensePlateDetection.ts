import { useState, useCallback, useEffect } from 'react';
import { licensePlateDetector } from '../services/LicensePlateDetector';
import { Detection, LicensePlateResult } from '../types';

export const useLicensePlateDetection = () => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [history, setHistory] = useState<LicensePlateResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Initialize the detector
  useEffect(() => {
    const initDetector = async () => {
      try {
        const success = await licensePlateDetector.initialize();
        setIsModelLoaded(success);
        if (!success) {
          setError('Failed to initialize detection model');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        setIsModelLoaded(false);
      }
    };

    initDetector();

    return () => {
      licensePlateDetector.dispose();
    };
  }, []);

  // Detect from image URI
  const detectFromImage = useCallback(async (imageUri: string): Promise<Detection[]> => {
    if (!isModelLoaded) {
      throw new Error('Model not loaded');
    }

    setIsDetecting(true);
    setError(null);

    try {
      // Use simulated detection for demo (real detection needs trained model)
      const results = await licensePlateDetector.detectSimulated(400, 300);
      setDetections(results);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Detection failed';
      setError(errorMessage);
      return [];
    } finally {
      setIsDetecting(false);
    }
  }, [isModelLoaded]);

  // Real detection from image (when you have a trained model)
  const detectFromImageReal = useCallback(async (imageUri: string): Promise<Detection[]> => {
    if (!isModelLoaded) {
      throw new Error('Model not loaded');
    }

    setIsDetecting(true);
    setError(null);

    try {
      const results = await licensePlateDetector.detectFromImageUri(imageUri);
      setDetections(results);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Detection failed';
      setError(errorMessage);
      return [];
    } finally {
      setIsDetecting(false);
    }
  }, [isModelLoaded]);

  // Save detection to history
  const saveToHistory = useCallback((detection: Detection, imageUri?: string) => {
    const result: LicensePlateResult = {
      detection,
      confidence: detection.score,
      timestamp: new Date(),
      imageUri,
    };
    setHistory(prev => [result, ...prev]);
    return result;
  }, []);

  // Clear detections
  const clearDetections = useCallback(() => {
    setDetections([]);
  }, []);

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isModelLoaded,
    isDetecting,
    detections,
    history,
    error,
    detectFromImage,
    detectFromImageReal,
    saveToHistory,
    clearDetections,
    clearHistory,
    clearError,
  };
};

export default useLicensePlateDetection;
