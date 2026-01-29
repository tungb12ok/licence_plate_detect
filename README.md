# License Plate Detection App

Ứng dụng React Native + Expo để phát hiện biển số xe sử dụng TensorFlow.js

## Tính năng

### 🚗 Phát hiện xe
- **Vùng xe (Vehicle Region)**: Phát hiện đầu xe hoặc đuôi xe
- **Biển số (License Plate)**: Xác định vị trí bounding box của biển số
- **Logo**: Phát hiện vùng logo xe (chỉ cần vị trí, không cần nhận diện)
- **Màu xe**: Phát hiện màu chủ đạo của xe (Trắng, Đen, Bạc, Đỏ, Xanh...)

### 📱 Nền tảng
- ✅ Android
- ✅ iOS
- ✅ Web (preview)

### ☁️ Cloud Integration
- Tiền xử lý dữ liệu trên thiết bị
- Gửi bounding boxes + ảnh lên cloud để AI xử lý chi tiết
- Chuẩn bị dữ liệu sạch cho model AI trên cloud

## Cài đặt

```bash
# Clone repo
git clone https://github.com/tungb12ok/licence_plate_detect.git
cd licence_plate_detect

# Cài đặt dependencies
npm install

# Chạy ứng dụng
npx expo start
```

## Chạy trên thiết bị

```bash
# Android
npx expo run:android

# iOS (cần macOS)
npx expo run:ios

# Web preview
npx expo start --web
```

## Cấu trúc dự án

```
src/
├── components/
│   ├── VehicleCameraScreen.tsx   # Màn hình camera với overlay bounding boxes
│   ├── DetectionResultScreen.tsx # Hiển thị kết quả chi tiết
│   ├── TensorFlowProvider.tsx    # Provider khởi tạo TensorFlow
│   └── ...
├── services/
│   ├── VehicleDetectionService.ts  # Service chính xử lý phát hiện
│   ├── ImageProcessingService.ts   # Xử lý hình ảnh với TensorFlow
│   └── CloudUploadService.ts       # Upload dữ liệu lên cloud
├── types/
│   └── detection.ts                # Type definitions
└── App.tsx                         # Main app component
```

## Flow xử lý

```
1. Chụp ảnh → 
2. Xử lý với TensorFlow.js (local) →
   - Phát hiện vùng xe
   - Phát hiện biển số
   - Phát hiện logo
   - Phát hiện màu xe
3. Hiển thị bounding boxes →
4. Gửi lên Cloud (nếu đủ chất lượng) →
5. AI model trên Cloud xử lý chi tiết:
   - Đọc nội dung biển số
   - Nhận diện hãng xe từ logo
   - Phân tích chi tiết khác
```

## Output Data Format (Cloud Payload)

```typescript
{
  detectionId: string;
  imageBase64: string;
  boundingBoxes: {
    vehicle?: { x, y, width, height };
    licensePlate?: { x, y, width, height };
    logo?: { x, y, width, height };
  };
  vehicleInfo: {
    type: 'front' | 'rear' | null;
    color: {
      dominant: '#XXXXXX';
      name: 'Trắng' | 'Đen' | 'Xanh' | ...;
      rgb: { r, g, b };
    };
  };
  metadata: {
    timestamp: string;
    deviceInfo: string;
    imageWidth: number;
    imageHeight: number;
  };
}
```

## Cấu hình Cloud Endpoint

Trong file `src/services/CloudUploadService.ts`:

```typescript
cloudUploadService.setConfig({
  endpoint: 'https://your-api.com/vehicle-detection',
  apiKey: 'your-api-key',
  timeout: 30000,
});
```

## Dependencies chính

- `expo` - Framework React Native
- `@tensorflow/tfjs` - TensorFlow.js core
- `@tensorflow/tfjs-react-native` - TensorFlow React Native bindings
- `expo-camera` - Camera access
- `expo-gl` - WebGL support cho TensorFlow
- `expo-file-system` - File system access
- `expo-image-picker` - Image selection

## Build Production

```bash
# Build cho Android
npx expo build:android

# Build cho iOS
npx expo build:ios

# Hoặc sử dụng EAS Build
npx eas build --platform android
npx eas build --platform ios
```

## Ghi chú

- Đây là prototype, sử dụng edge detection cơ bản
- Để có độ chính xác cao hơn, cần train custom model (YOLO, SSD) cho license plate detection
- Cloud API cần được implement để xử lý chi tiết (OCR biển số, nhận diện logo)

## License

MIT
