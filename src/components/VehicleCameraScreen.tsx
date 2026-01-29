import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { VehicleDetectionResult, BoundingBox } from '../types/detection';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CAMERA_HEIGHT = SCREEN_HEIGHT * 0.7;

interface VehicleCameraScreenProps {
  onCapture: (uri: string) => void;
  detectionResult: VehicleDetectionResult | null;
  isProcessing: boolean;
}

export const VehicleCameraScreen: React.FC<VehicleCameraScreenProps> = ({
  onCapture,
  detectionResult,
  isProcessing,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const cameraRef = useRef<CameraView>(null);

  const takePicture = useCallback(async () => {
    if (cameraRef.current && !isProcessing) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
          base64: false,
          skipProcessing: false,
        });
        if (photo?.uri) {
          onCapture(photo.uri);
        }
      } catch (error) {
        console.error('Failed to take picture:', error);
      }
    }
  }, [onCapture, isProcessing]);

  const toggleCameraFacing = useCallback(() => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }, []);

  // Helper to render bounding box
  const renderBoundingBox = (
    bbox: BoundingBox | undefined,
    color: string,
    label: string,
    scaleX: number,
    scaleY: number
  ) => {
    if (!bbox) return null;

    return (
      <View
        style={[
          styles.boundingBox,
          {
            left: bbox.x * scaleX,
            top: bbox.y * scaleY,
            width: bbox.width * scaleX,
            height: bbox.height * scaleY,
            borderColor: color,
          },
        ]}
      >
        <View style={[styles.bboxLabel, { backgroundColor: color }]}>
          <Text style={styles.bboxLabelText}>{label}</Text>
        </View>
      </View>
    );
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.text}>Đang yêu cầu quyền camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.icon}>📷</Text>
        <Text style={styles.text}>Cần quyền truy cập camera</Text>
        <Text style={styles.subText}>
          Ứng dụng cần camera để quét biển số xe
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Cấp quyền</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Calculate scale factors for bounding boxes
  const scaleX = SCREEN_WIDTH / (detectionResult?.imageWidth || SCREEN_WIDTH);
  const scaleY = CAMERA_HEIGHT / (detectionResult?.imageHeight || CAMERA_HEIGHT);

  return (
    <View style={styles.container}>
      {/* Camera */}
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
        >
          {/* Overlay */}
          <View style={styles.overlay}>
            {/* Guide frame */}
            <View style={styles.guideFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.guideText}>
              Đặt đầu/đít xe trong khung hình
            </Text>

            {/* Detection boxes */}
            {detectionResult && (
              <>
                {/* Vehicle region - Màu xanh dương */}
                {renderBoundingBox(
                  detectionResult.vehicleRegion?.bbox,
                  '#007AFF',
                  `Xe (${detectionResult.vehicleRegion?.type === 'front' ? 'Đầu' : 'Đuôi'})`,
                  scaleX,
                  scaleY
                )}

                {/* License plate - Màu xanh lá */}
                {renderBoundingBox(
                  detectionResult.licensePlate?.bbox,
                  '#34C759',
                  'Biển số',
                  scaleX,
                  scaleY
                )}

                {/* Logo - Màu cam */}
                {renderBoundingBox(
                  detectionResult.logoRegion?.bbox,
                  '#FF9500',
                  'Logo',
                  scaleX,
                  scaleY
                )}
              </>
            )}

            {/* Processing indicator */}
            {isProcessing && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.processingText}>Đang xử lý...</Text>
              </View>
            )}
          </View>
        </CameraView>
      </View>

      {/* Info panel */}
      <View style={styles.infoPanel}>
        {detectionResult ? (
          <>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <View style={[styles.colorDot, { backgroundColor: detectionResult.vehicleColor?.dominant || '#ccc' }]} />
                <Text style={styles.infoLabel}>Màu xe:</Text>
                <Text style={styles.infoValue}>{detectionResult.vehicleColor?.name || 'Chưa xác định'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>⏱️</Text>
                <Text style={styles.infoValue}>{detectionResult.processingTimeMs}ms</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: detectionResult.vehicleRegion ? '#34C759' : '#FF3B30' }]} />
                <Text style={styles.statusText}>Vùng xe</Text>
              </View>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: detectionResult.licensePlate ? '#34C759' : '#FF3B30' }]} />
                <Text style={styles.statusText}>Biển số</Text>
              </View>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: detectionResult.logoRegion ? '#34C759' : '#FF9500' }]} />
                <Text style={styles.statusText}>Logo</Text>
              </View>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: detectionResult.isReadyForCloud ? '#34C759' : '#FF9500' }]} />
                <Text style={styles.statusText}>Cloud</Text>
              </View>
            </View>
          </>
        ) : (
          <Text style={styles.infoPlaceholder}>
            Chụp ảnh để bắt đầu phát hiện
          </Text>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={toggleCameraFacing}
        >
          <Text style={styles.controlIcon}>🔄</Text>
          <Text style={styles.controlText}>Đổi cam</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]}
          onPress={takePicture}
          disabled={isProcessing}
        >
          <View style={styles.captureButtonOuter}>
            <View style={styles.captureButtonInner} />
          </View>
        </TouchableOpacity>

        <View style={styles.controlButton}>
          {isProcessing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.controlIcon}>📊</Text>
              <Text style={styles.controlText}>Kết quả</Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContainer: {
    width: SCREEN_WIDTH,
    height: CAMERA_HEIGHT,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideFrame: {
    width: SCREEN_WIDTH * 0.9,
    height: CAMERA_HEIGHT * 0.6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderStyle: 'dashed',
    borderRadius: 12,
    position: 'relative',
  },
  guideText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#00FF00',
    borderWidth: 3,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: -2,
    right: -2,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 12,
  },
  boundingBox: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 4,
  },
  bboxLabel: {
    position: 'absolute',
    top: -22,
    left: -2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bboxLabelText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
  },
  infoPanel: {
    width: '100%',
    backgroundColor: '#2a2a4e',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 80,
    justifyContent: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#fff',
  },
  infoLabel: {
    color: '#aaa',
    fontSize: 13,
    marginRight: 4,
  },
  infoValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  statusText: {
    color: '#ccc',
    fontSize: 12,
  },
  infoPlaceholder: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#1a1a2e',
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlIcon: {
    fontSize: 20,
  },
  controlText: {
    color: '#fff',
    fontSize: 10,
    marginTop: 2,
  },
  captureButton: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  text: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 16,
  },
  subText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  icon: {
    fontSize: 64,
  },
  permissionButton: {
    marginTop: 24,
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default VehicleCameraScreen;
