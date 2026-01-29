import * as tf from '@tensorflow/tfjs';
import { bundleResourceIO, decodeJpeg } from '@tensorflow/tfjs-react-native';
import * as FileSystem from 'expo-file-system';
import { Detection } from '../types';

// License plate detection model service
class LicensePlateDetector {
  private model: tf.GraphModel | null = null;
  private isInitialized: boolean = false;
  
  // COCO-SSD classes - license plate is not in standard COCO, 
  // but we can detect cars/vehicles and look for plates
  private readonly VEHICLE_CLASSES = ['car', 'truck', 'bus', 'motorcycle'];
  
  async initialize(): Promise<boolean> {
    try {
      // Wait for TensorFlow to be ready
      await tf.ready();
      console.log('TensorFlow.js initialized with backend:', tf.getBackend());
      
      // For demo purposes, we'll use a simple detection approach
      // In production, you would load a custom trained license plate model
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize TensorFlow:', error);
      return false;
    }
  }

  async loadCustomModel(modelUrl: string): Promise<boolean> {
    try {
      this.model = await tf.loadGraphModel(modelUrl);
      console.log('Custom model loaded successfully');
      return true;
    } catch (error) {
      console.error('Failed to load custom model:', error);
      return false;
    }
  }

  async detectFromImageUri(imageUri: string): Promise<Detection[]> {
    if (!this.isInitialized) {
      throw new Error('Detector not initialized. Call initialize() first.');
    }

    try {
      // Read image file
      const imgB64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64',
      });
      
      // Convert base64 to Uint8Array
      const imgBuffer = tf.util.encodeString(imgB64, 'base64').buffer;
      const raw = new Uint8Array(imgBuffer);
      
      // Decode JPEG
      const imageTensor = decodeJpeg(raw);
      
      const detections = await this.detectFromTensor(imageTensor);
      
      // Clean up
      imageTensor.dispose();
      
      return detections;
    } catch (error) {
      console.error('Detection error:', error);
      return [];
    }
  }

  async detectFromTensor(imageTensor: tf.Tensor3D): Promise<Detection[]> {
    if (!this.isInitialized) {
      throw new Error('Detector not initialized. Call initialize() first.');
    }

    const detections: Detection[] = [];

    try {
      // Get image dimensions
      const [height, width] = imageTensor.shape.slice(0, 2);
      
      // For demonstration, we'll implement a simple edge-based license plate detection
      // In production, use a trained YOLO or SSD model specifically for license plates
      
      // Convert to grayscale
      const grayscale = tf.tidy(() => {
        const normalized = imageTensor.div(255);
        return normalized.mean(2);
      });
      
      // Simple edge detection using Sobel-like filter
      const edges = tf.tidy(() => {
        const sobelX = tf.tensor2d([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]);
        const sobelY = tf.tensor2d([[-1, -2, -1], [0, 0, 0], [1, 2, 1]]);
        
        const expanded = grayscale.expandDims(0).expandDims(-1);
        const kernelX = sobelX.expandDims(-1).expandDims(-1);
        const kernelY = sobelY.expandDims(-1).expandDims(-1);
        
        const gradX = tf.conv2d(expanded as tf.Tensor4D, kernelX as tf.Tensor4D, 1, 'same');
        const gradY = tf.conv2d(expanded as tf.Tensor4D, kernelY as tf.Tensor4D, 1, 'same');
        
        return tf.sqrt(tf.add(tf.square(gradX), tf.square(gradY))).squeeze();
      });
      
      // Find potential license plate regions based on edge density
      const edgeData = await edges.data();
      
      // Analyze regions for high edge density (typical of license plates)
      const regionSize = 50;
      const regions: Array<{x: number; y: number; density: number}> = [];
      
      for (let y = 0; y < height - regionSize; y += regionSize / 2) {
        for (let x = 0; x < width - regionSize; x += regionSize / 2) {
          let density = 0;
          for (let dy = 0; dy < regionSize && y + dy < height; dy++) {
            for (let dx = 0; dx < regionSize && x + dx < width; dx++) {
              const idx = (y + dy) * width + (x + dx);
              density += edgeData[idx] || 0;
            }
          }
          density /= (regionSize * regionSize);
          
          if (density > 0.1) { // Threshold for edge density
            regions.push({ x, y, density });
          }
        }
      }
      
      // Find top regions by density
      regions.sort((a, b) => b.density - a.density);
      const topRegions = regions.slice(0, 3);
      
      for (const region of topRegions) {
        // License plates typically have aspect ratio between 2:1 and 5:1
        const plateWidth = Math.min(regionSize * 3, width - region.x);
        const plateHeight = Math.min(regionSize, height - region.y);
        
        if (plateWidth / plateHeight >= 1.5 && plateWidth / plateHeight <= 6) {
          detections.push({
            bbox: [region.x, region.y, plateWidth, plateHeight],
            class: 'license_plate',
            score: Math.min(region.density * 2, 0.95),
          });
        }
      }
      
      // Clean up tensors
      grayscale.dispose();
      edges.dispose();
      
    } catch (error) {
      console.error('Detection processing error:', error);
    }

    return detections;
  }

  // Simulated detection for demo purposes
  async detectSimulated(imageWidth: number, imageHeight: number): Promise<Detection[]> {
    // Simulate detection with random bounding box in typical plate location
    const plateWidth = imageWidth * 0.3;
    const plateHeight = plateWidth / 4; // Typical license plate ratio
    
    const x = (imageWidth - plateWidth) / 2 + (Math.random() - 0.5) * 100;
    const y = imageHeight * 0.6 + (Math.random() - 0.5) * 50;
    
    return [{
      bbox: [x, y, plateWidth, plateHeight],
      class: 'license_plate',
      score: 0.85 + Math.random() * 0.1,
    }];
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this.isInitialized = false;
  }
}

export const licensePlateDetector = new LicensePlateDetector();
export default licensePlateDetector;
