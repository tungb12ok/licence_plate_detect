import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { VehicleDetectionResult, BoundingBox } from '../types/detection';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DetectionResultScreenProps {
  result: VehicleDetectionResult;
  onRetake: () => void;
  onUploadToCloud: () => void;
  isUploading: boolean;
}

export const DetectionResultScreen: React.FC<DetectionResultScreenProps> = ({
  result,
  onRetake,
  onUploadToCloud,
  isUploading,
}) => {
  const imageHeight = SCREEN_WIDTH * 0.75;

  // Scale factors
  const scaleX = SCREEN_WIDTH / result.imageWidth;
  const scaleY = imageHeight / result.imageHeight;

  const renderBoundingBox = (
    bbox: BoundingBox | undefined,
    color: string,
    label: string,
    confidence?: number
  ) => {
    if (!bbox) return null;

    return (
      <View
        key={label}
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
          <Text style={styles.bboxLabelText}>
            {label} {confidence ? `(${(confidence * 100).toFixed(0)}%)` : ''}
          </Text>
        </View>
      </View>
    );
  };

  const handleUpload = () => {
    if (!result.isReadyForCloud) {
      Alert.alert(
        'Dữ liệu chưa sẵn sàng',
        'Ảnh không đủ thông tin để xử lý. Vui lòng chụp lại với độ rõ nét tốt hơn.'
      );
      return;
    }
    onUploadToCloud();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Kết quả phát hiện</Text>
        <Text style={styles.subtitle}>
          Xử lý trong {result.processingTimeMs}ms
        </Text>
      </View>

      {/* Image with bounding boxes */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: result.imageUri }}
          style={[styles.image, { height: imageHeight }]}
          resizeMode="contain"
        />
        
        {/* Bounding boxes overlay */}
        <View style={[styles.boxesOverlay, { height: imageHeight }]}>
          {renderBoundingBox(
            result.vehicleRegion?.bbox,
            '#007AFF',
            result.vehicleRegion?.type === 'front' ? 'Đầu xe' : 'Đuôi xe',
            result.vehicleRegion?.confidence
          )}
          {renderBoundingBox(
            result.licensePlate?.bbox,
            '#34C759',
            'Biển số',
            result.licensePlate?.confidence
          )}
          {renderBoundingBox(
            result.logoRegion?.bbox,
            '#FF9500',
            'Logo',
            result.logoRegion?.confidence
          )}
        </View>
      </View>

      {/* Detection details */}
      <View style={styles.detailsSection}>
        <Text style={styles.sectionTitle}>Chi tiết phát hiện</Text>

        {/* Vehicle Region */}
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <View style={[styles.detailDot, { backgroundColor: '#007AFF' }]} />
            <Text style={styles.detailTitle}>Vùng xe</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: result.vehicleRegion ? '#34C759' : '#FF3B30' }
            ]}>
              <Text style={styles.statusBadgeText}>
                {result.vehicleRegion ? 'Phát hiện' : 'Không tìm thấy'}
              </Text>
            </View>
          </View>
          {result.vehicleRegion && (
            <View style={styles.detailContent}>
              <Text style={styles.detailText}>
                Loại: {result.vehicleRegion.type === 'front' ? 'Đầu xe' : 'Đuôi xe'}
              </Text>
              <Text style={styles.detailText}>
                Độ tin cậy: {(result.vehicleRegion.confidence * 100).toFixed(1)}%
              </Text>
              <Text style={styles.detailText}>
                Vị trí: ({Math.round(result.vehicleRegion.bbox.x)}, {Math.round(result.vehicleRegion.bbox.y)})
              </Text>
              <Text style={styles.detailText}>
                Kích thước: {Math.round(result.vehicleRegion.bbox.width)}x{Math.round(result.vehicleRegion.bbox.height)}
              </Text>
            </View>
          )}
        </View>

        {/* License Plate */}
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <View style={[styles.detailDot, { backgroundColor: '#34C759' }]} />
            <Text style={styles.detailTitle}>Biển số xe</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: result.licensePlate ? '#34C759' : '#FF3B30' }
            ]}>
              <Text style={styles.statusBadgeText}>
                {result.licensePlate ? 'Phát hiện' : 'Không tìm thấy'}
              </Text>
            </View>
          </View>
          {result.licensePlate && (
            <View style={styles.detailContent}>
              <Text style={styles.detailText}>
                Độ tin cậy: {(result.licensePlate.confidence * 100).toFixed(1)}%
              </Text>
              <Text style={styles.detailText}>
                Vị trí: ({Math.round(result.licensePlate.bbox.x)}, {Math.round(result.licensePlate.bbox.y)})
              </Text>
              <Text style={styles.detailText}>
                Kích thước: {Math.round(result.licensePlate.bbox.width)}x{Math.round(result.licensePlate.bbox.height)}
              </Text>
              <Text style={styles.detailHint}>
                * Cần gửi lên Cloud để đọc nội dung biển số
              </Text>
            </View>
          )}
        </View>

        {/* Logo */}
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <View style={[styles.detailDot, { backgroundColor: '#FF9500' }]} />
            <Text style={styles.detailTitle}>Logo xe</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: result.logoRegion ? '#FF9500' : '#999' }
            ]}>
              <Text style={styles.statusBadgeText}>
                {result.logoRegion ? 'Phát hiện' : 'Tùy chọn'}
              </Text>
            </View>
          </View>
          {result.logoRegion && (
            <View style={styles.detailContent}>
              <Text style={styles.detailText}>
                Độ tin cậy: {(result.logoRegion.confidence * 100).toFixed(1)}%
              </Text>
              <Text style={styles.detailText}>
                Vị trí: ({Math.round(result.logoRegion.bbox.x)}, {Math.round(result.logoRegion.bbox.y)})
              </Text>
              <Text style={styles.detailHint}>
                * Cần gửi lên Cloud để nhận diện hãng xe
              </Text>
            </View>
          )}
        </View>

        {/* Vehicle Color */}
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <View style={[
              styles.colorPreview,
              { backgroundColor: result.vehicleColor?.dominant || '#ccc' }
            ]} />
            <Text style={styles.detailTitle}>Màu xe</Text>
            <View style={[styles.statusBadge, { backgroundColor: '#007AFF' }]}>
              <Text style={styles.statusBadgeText}>
                {result.vehicleColor?.name || 'Chưa xác định'}
              </Text>
            </View>
          </View>
          {result.vehicleColor && (
            <View style={styles.detailContent}>
              <Text style={styles.detailText}>
                Mã màu: {result.vehicleColor.dominant}
              </Text>
              <Text style={styles.detailText}>
                RGB: ({result.vehicleColor.rgb.r}, {result.vehicleColor.rgb.g}, {result.vehicleColor.rgb.b})
              </Text>
              <Text style={styles.detailText}>
                Độ tin cậy: {(result.vehicleColor.confidence * 100).toFixed(1)}%
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Cloud status */}
      <View style={styles.cloudSection}>
        <Text style={styles.sectionTitle}>Trạng thái Cloud</Text>
        <View style={styles.cloudCard}>
          <View style={styles.cloudStatus}>
            <View style={[
              styles.cloudDot,
              { 
                backgroundColor: 
                  result.cloudUploadStatus === 'uploaded' ? '#34C759' :
                  result.cloudUploadStatus === 'uploading' ? '#FF9500' :
                  result.cloudUploadStatus === 'failed' ? '#FF3B30' : '#999'
              }
            ]} />
            <Text style={styles.cloudStatusText}>
              {result.cloudUploadStatus === 'uploaded' ? 'Đã tải lên' :
               result.cloudUploadStatus === 'uploading' ? 'Đang tải...' :
               result.cloudUploadStatus === 'failed' ? 'Tải thất bại' : 'Chờ xử lý'}
            </Text>
          </View>
          <Text style={styles.cloudHint}>
            {result.isReadyForCloud 
              ? '✅ Dữ liệu sẵn sàng để gửi lên Cloud xử lý chi tiết'
              : '⚠️ Dữ liệu chưa đủ chất lượng, nên chụp lại'
            }
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.retakeButton} onPress={onRetake}>
          <Text style={styles.retakeButtonText}>📷 Chụp lại</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.uploadButton,
            (!result.isReadyForCloud || isUploading) && styles.uploadButtonDisabled
          ]}
          onPress={handleUpload}
          disabled={!result.isReadyForCloud || isUploading}
        >
          <Text style={styles.uploadButtonText}>
            {isUploading ? '⏳ Đang tải...' : '☁️ Gửi Cloud'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 30,
  },
  header: {
    backgroundColor: '#1a1a2e',
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 13,
    color: '#aaa',
    marginTop: 4,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    backgroundColor: '#000',
    position: 'relative',
  },
  image: {
    width: '100%',
  },
  boxesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  boundingBox: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 4,
  },
  bboxLabel: {
    position: 'absolute',
    top: -20,
    left: -2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bboxLabelText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  detailsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  colorPreview: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  detailTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  detailContent: {
    marginTop: 12,
    paddingLeft: 22,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  detailHint: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  cloudSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  cloudCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cloudStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cloudDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  cloudStatusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  cloudHint: {
    fontSize: 13,
    color: '#666',
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  retakeButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  retakeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  uploadButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  uploadButtonDisabled: {
    backgroundColor: '#ccc',
  },
  uploadButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});

export default DetectionResultScreen;
