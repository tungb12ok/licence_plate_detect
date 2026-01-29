// Types for vehicle detection preprocessing

export interface BoundingBox {
  x: number;      // Top-left x coordinate
  y: number;      // Top-left y coordinate
  width: number;
  height: number;
}

export interface VehicleRegion {
  type: 'front' | 'rear' | 'side';
  bbox: BoundingBox;
  confidence: number;
}

export interface LicensePlateRegion {
  bbox: BoundingBox;
  confidence: number;
}

export interface LogoRegion {
  bbox: BoundingBox;
  confidence: number;
  // Không cần biết logo là gì, chỉ cần vị trí
}

export interface ColorInfo {
  dominant: string;       // Màu chủ đạo (hex)
  name: string;          // Tên màu cơ bản: đỏ, xanh, trắng, đen, bạc...
  confidence: number;
  rgb: { r: number; g: number; b: number };
}

export interface VehicleDetectionResult {
  id: string;
  timestamp: Date;
  imageUri: string;
  imageBase64?: string;
  
  // Các vùng phát hiện được
  vehicleRegion: VehicleRegion | null;
  licensePlate: LicensePlateRegion | null;
  logoRegion: LogoRegion | null;
  
  // Thông tin màu xe
  vehicleColor: ColorInfo | null;
  
  // Metadata
  imageWidth: number;
  imageHeight: number;
  processingTimeMs: number;
  
  // Trạng thái để gửi cloud
  isReadyForCloud: boolean;
  cloudUploadStatus: 'pending' | 'uploading' | 'uploaded' | 'failed';
}

export interface CloudUploadPayload {
  detectionId: string;
  imageBase64: string;
  boundingBoxes: {
    vehicle?: BoundingBox;
    licensePlate?: BoundingBox;
    logo?: BoundingBox;
  };
  vehicleInfo: {
    type: 'front' | 'rear' | 'side' | null;
    color: ColorInfo | null;
  };
  metadata: {
    timestamp: string;
    deviceInfo: string;
    imageWidth: number;
    imageHeight: number;
  };
}

export interface ProcessingConfig {
  minVehicleConfidence: number;
  minPlateConfidence: number;
  minLogoConfidence: number;
  autoUploadToCloud: boolean;
  cloudEndpoint: string;
}

// Màu cơ bản của xe
export const BASIC_CAR_COLORS = {
  WHITE: { name: 'Trắng', hex: '#FFFFFF', range: { h: [0, 360], s: [0, 15], l: [85, 100] } },
  BLACK: { name: 'Đen', hex: '#000000', range: { h: [0, 360], s: [0, 20], l: [0, 15] } },
  SILVER: { name: 'Bạc', hex: '#C0C0C0', range: { h: [0, 360], s: [0, 15], l: [55, 85] } },
  GRAY: { name: 'Xám', hex: '#808080', range: { h: [0, 360], s: [0, 15], l: [25, 55] } },
  RED: { name: 'Đỏ', hex: '#FF0000', range: { h: [0, 20], s: [50, 100], l: [30, 70] } },
  BLUE: { name: 'Xanh dương', hex: '#0000FF', range: { h: [200, 250], s: [40, 100], l: [25, 60] } },
  GREEN: { name: 'Xanh lá', hex: '#008000', range: { h: [80, 160], s: [30, 100], l: [20, 55] } },
  YELLOW: { name: 'Vàng', hex: '#FFFF00', range: { h: [45, 65], s: [50, 100], l: [45, 75] } },
  ORANGE: { name: 'Cam', hex: '#FFA500', range: { h: [20, 45], s: [70, 100], l: [45, 65] } },
  BROWN: { name: 'Nâu', hex: '#8B4513', range: { h: [15, 40], s: [30, 70], l: [20, 45] } },
  BEIGE: { name: 'Be', hex: '#F5F5DC', range: { h: [35, 55], s: [20, 50], l: [70, 90] } },
} as const;
