import * as tf from '@tensorflow/tfjs';
import * as FileSystem from 'expo-file-system';
import { decodeJpeg } from '@tensorflow/tfjs-react-native';
import { imageProcessingService } from './ImageProcessingService';
import {
  VehicleDetectionResult,
  CloudUploadPayload,
  ProcessingConfig,
} from '../types/detection';

/**
 * Main service để xử lý toàn bộ flow phát hiện xe
 */
class VehicleDetectionService {
  private config: ProcessingConfig = {
    minVehicleConfidence: 0.5,
    minPlateConfidence: 0.4,
    minLogoConfidence: 0.3,
    autoUploadToCloud: false,
    cloudEndpoint: 'https://your-cloud-api.com/process',
  };

  private isInitialized: boolean = false;

  async initialize(): Promise<boolean> {
    try {
      await tf.ready();
      console.log('VehicleDetectionService initialized with backend:', tf.getBackend());
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize VehicleDetectionService:', error);
      return false;
    }
  }

  setConfig(config: Partial<ProcessingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Xử lý ảnh và trả về tất cả bounding boxes
   */
  async processImage(imageUri: string): Promise<VehicleDetectionResult> {
    const startTime = Date.now();
    const id = `det_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (!this.isInitialized) {
      throw new Error('Service not initialized');
    }

    let imageTensor: tf.Tensor3D | null = null;
    let imageBase64: string | undefined;
    let imageWidth = 0;
    let imageHeight = 0;

    try {
      // Đọc và decode ảnh
      imageBase64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64',
      });

      const imgBuffer = tf.util.encodeString(imageBase64, 'base64').buffer;
      const raw = new Uint8Array(imgBuffer);
      imageTensor = decodeJpeg(raw);

      [imageHeight, imageWidth] = imageTensor.shape.slice(0, 2);
      console.log(`Processing image: ${imageWidth}x${imageHeight}`);

      // 1. Phát hiện vùng xe
      const vehicleRegion = await imageProcessingService.detectVehicleRegion(
        imageTensor,
        imageWidth,
        imageHeight
      );
      console.log('Vehicle region:', vehicleRegion);

      // 2. Phát hiện biển số
      const licensePlate = await imageProcessingService.detectLicensePlateRegion(
        imageTensor,
        imageWidth,
        imageHeight,
        vehicleRegion
      );
      console.log('License plate:', licensePlate);

      // 3. Phát hiện logo
      const logoRegion = await imageProcessingService.detectLogoRegion(
        imageTensor,
        imageWidth,
        imageHeight,
        vehicleRegion
      );
      console.log('Logo region:', logoRegion);

      // 4. Phát hiện màu xe
      const vehicleColor = await imageProcessingService.detectVehicleColor(
        imageTensor,
        vehicleRegion
      );
      console.log('Vehicle color:', vehicleColor);

      const processingTimeMs = Date.now() - startTime;

      // Kiểm tra xem có đủ thông tin để gửi cloud không
      const isReadyForCloud = !!(
        (vehicleRegion && vehicleRegion.confidence >= this.config.minVehicleConfidence) ||
        (licensePlate && licensePlate.confidence >= this.config.minPlateConfidence)
      );

      const result: VehicleDetectionResult = {
        id,
        timestamp: new Date(),
        imageUri,
        imageBase64,
        vehicleRegion,
        licensePlate,
        logoRegion,
        vehicleColor,
        imageWidth,
        imageHeight,
        processingTimeMs,
        isReadyForCloud,
        cloudUploadStatus: 'pending',
      };

      // Auto upload nếu được cấu hình
      if (this.config.autoUploadToCloud && isReadyForCloud) {
        this.uploadToCloud(result).catch(console.error);
      }

      return result;
    } finally {
      if (imageTensor) {
        imageTensor.dispose();
      }
    }
  }

  /**
   * Tạo payload để gửi lên cloud
   */
  prepareCloudPayload(result: VehicleDetectionResult): CloudUploadPayload {
    return {
      detectionId: result.id,
      imageBase64: result.imageBase64 || '',
      boundingBoxes: {
        vehicle: result.vehicleRegion?.bbox,
        licensePlate: result.licensePlate?.bbox,
        logo: result.logoRegion?.bbox,
      },
      vehicleInfo: {
        type: result.vehicleRegion?.type || null,
        color: result.vehicleColor,
      },
      metadata: {
        timestamp: result.timestamp.toISOString(),
        deviceInfo: 'React Native / Expo',
        imageWidth: result.imageWidth,
        imageHeight: result.imageHeight,
      },
    };
  }

  /**
   * Upload kết quả lên cloud để xử lý tiếp
   */
  async uploadToCloud(result: VehicleDetectionResult): Promise<boolean> {
    try {
      result.cloudUploadStatus = 'uploading';
      
      const payload = this.prepareCloudPayload(result);
      
      // TODO: Thay thế bằng endpoint cloud thực tế
      console.log('Cloud payload prepared:', {
        ...payload,
        imageBase64: payload.imageBase64.substring(0, 50) + '...',
      });

      // Simulate cloud upload
      // const response = await fetch(this.config.cloudEndpoint, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(payload),
      // });
      
      // if (!response.ok) {
      //   throw new Error(`Cloud upload failed: ${response.status}`);
      // }

      result.cloudUploadStatus = 'uploaded';
      console.log('Successfully uploaded to cloud');
      return true;
    } catch (error) {
      console.error('Cloud upload error:', error);
      result.cloudUploadStatus = 'failed';
      return false;
    }
  }

  /**
   * Xử lý ảnh đơn giản với simulated bounding boxes (cho demo)
   */
  async processImageSimulated(
    imageWidth: number,
    imageHeight: number
  ): Promise<Omit<VehicleDetectionResult, 'id' | 'timestamp' | 'imageUri' | 'imageBase64'>> {
    // Tạo bounding boxes giả lập cho demo
    const vehicleBbox = {
      x: imageWidth * 0.1,
      y: imageHeight * 0.15,
      width: imageWidth * 0.8,
      height: imageHeight * 0.7,
    };

    const plateBbox = {
      x: imageWidth * 0.3,
      y: imageHeight * 0.6,
      width: imageWidth * 0.4,
      height: imageHeight * 0.08,
    };

    const logoBbox = {
      x: imageWidth * 0.42,
      y: imageHeight * 0.25,
      width: imageWidth * 0.16,
      height: imageWidth * 0.16,
    };

    return {
      vehicleRegion: {
        type: 'rear',
        bbox: vehicleBbox,
        confidence: 0.85,
      },
      licensePlate: {
        bbox: plateBbox,
        confidence: 0.78,
      },
      logoRegion: {
        bbox: logoBbox,
        confidence: 0.65,
      },
      vehicleColor: {
        dominant: '#1a1a2e',
        name: 'Đen',
        confidence: 0.72,
        rgb: { r: 26, g: 26, b: 46 },
      },
      imageWidth,
      imageHeight,
      processingTimeMs: 150,
      isReadyForCloud: true,
      cloudUploadStatus: 'pending',
    };
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  dispose(): void {
    this.isInitialized = false;
  }
}

export const vehicleDetectionService = new VehicleDetectionService();
export default vehicleDetectionService;
