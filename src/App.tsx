import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import {
  TensorFlowProvider,
  VehicleCameraScreen,
  DetectionResultScreen,
  HistoryScreen,
} from './components';
import { vehicleDetectionService, cloudUploadService } from './services';
import { VehicleDetectionResult } from './types/detection';

type AppScreen = 'camera' | 'result' | 'history';

const MainApp: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('camera');
  const [isServiceReady, setIsServiceReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [detectionResult, setDetectionResult] = useState<VehicleDetectionResult | null>(null);
  const [history, setHistory] = useState<VehicleDetectionResult[]>([]);

  // Initialize service
  useEffect(() => {
    const init = async () => {
      const success = await vehicleDetectionService.initialize();
      setIsServiceReady(success);
      if (!success) {
        Alert.alert('Lỗi', 'Không thể khởi tạo dịch vụ phát hiện');
      }
    };
    init();
  }, []);

  // Handle image capture
  const handleCapture = useCallback(async (uri: string) => {
    if (!isServiceReady) {
      Alert.alert('Chưa sẵn sàng', 'Dịch vụ đang khởi tạo, vui lòng đợi...');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Process image with vehicle detection service
      const result = await vehicleDetectionService.processImage(uri);
      setDetectionResult(result);
      setCurrentScreen('result');
      
      // Add to history
      setHistory(prev => [result, ...prev].slice(0, 50)); // Keep last 50
    } catch (error) {
      console.error('Detection error:', error);
      Alert.alert('Lỗi xử lý', 'Không thể xử lý ảnh. Vui lòng thử lại.');
    } finally {
      setIsProcessing(false);
    }
  }, [isServiceReady]);

  // Handle retake
  const handleRetake = useCallback(() => {
    setDetectionResult(null);
    setCurrentScreen('camera');
  }, []);

  // Handle upload to cloud
  const handleUploadToCloud = useCallback(async () => {
    if (!detectionResult) return;

    setIsUploading(true);
    
    try {
      const payload = vehicleDetectionService.prepareCloudPayload(detectionResult);
      const result = await cloudUploadService.uploadWithRetry(payload, 3);
      
      if (result.success) {
        Alert.alert(
          'Thành công',
          `Đã gửi lên Cloud!\nJob ID: ${result.jobId}\n\nAI model trên cloud sẽ xử lý chi tiết:\n- Đọc nội dung biển số\n- Nhận diện hãng xe\n- Phân tích chi tiết khác`,
          [{ text: 'OK', onPress: handleRetake }]
        );
        
        // Update result status
        setDetectionResult(prev => prev ? {
          ...prev,
          cloudUploadStatus: 'uploaded'
        } : null);
      } else {
        Alert.alert('Lỗi', `Không thể tải lên: ${result.error}`);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi tải lên cloud');
    } finally {
      setIsUploading(false);
    }
  }, [detectionResult, handleRetake]);

  // Clear history
  const handleClearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  // Handle history item selection
  const handleSelectHistoryItem = useCallback((item: VehicleDetectionResult) => {
    setDetectionResult(item);
    setCurrentScreen('result');
  }, []);

  // Render navigation
  const renderNavigation = () => (
    <View style={styles.navigation}>
      <TouchableOpacity
        style={[styles.navItem, currentScreen === 'camera' && styles.navItemActive]}
        onPress={handleRetake}
      >
        <Text style={styles.navIcon}>📷</Text>
        <Text style={[styles.navText, currentScreen === 'camera' && styles.navTextActive]}>
          Camera
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.navItem, currentScreen === 'history' && styles.navItemActive]}
        onPress={() => setCurrentScreen('history')}
      >
        <Text style={styles.navIcon}>📋</Text>
        <Text style={[styles.navText, currentScreen === 'history' && styles.navTextActive]}>
          Lịch sử ({history.length})
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Render current screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'camera':
        return (
          <VehicleCameraScreen
            onCapture={handleCapture}
            detectionResult={detectionResult}
            isProcessing={isProcessing}
          />
        );
      
      case 'result':
        return detectionResult ? (
          <DetectionResultScreen
            result={detectionResult}
            onRetake={handleRetake}
            onUploadToCloud={handleUploadToCloud}
            isUploading={isUploading}
          />
        ) : null;
      
      case 'history':
        return (
          <View style={styles.historyContainer}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Lịch sử phát hiện</Text>
              {history.length > 0 && (
                <TouchableOpacity onPress={handleClearHistory}>
                  <Text style={styles.clearButton}>Xóa tất cả</Text>
                </TouchableOpacity>
              )}
            </View>
            {history.length === 0 ? (
              <View style={styles.emptyHistory}>
                <Text style={styles.emptyIcon}>📷</Text>
                <Text style={styles.emptyText}>Chưa có lịch sử</Text>
                <Text style={styles.emptySubtext}>Chụp ảnh xe để bắt đầu</Text>
              </View>
            ) : (
              <View style={styles.historyList}>
                {history.map((item, index) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.historyItem}
                    onPress={() => handleSelectHistoryItem(item)}
                  >
                    <View style={[
                      styles.historyColorDot,
                      { backgroundColor: item.vehicleColor?.dominant || '#ccc' }
                    ]} />
                    <View style={styles.historyItemInfo}>
                      <Text style={styles.historyItemTitle}>
                        {item.vehicleRegion?.type === 'front' ? 'Đầu xe' : 'Đuôi xe'} - {item.vehicleColor?.name || 'N/A'}
                      </Text>
                      <Text style={styles.historyItemSubtitle}>
                        {new Date(item.timestamp).toLocaleString('vi-VN')}
                      </Text>
                    </View>
                    <View style={styles.historyItemStatus}>
                      {item.licensePlate && <Text style={styles.statusIcon}>🚗</Text>}
                      {item.logoRegion && <Text style={styles.statusIcon}>🏷️</Text>}
                      {item.cloudUploadStatus === 'uploaded' && <Text style={styles.statusIcon}>☁️</Text>}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        );
      
      default:
        return null;
    }
  };

  // Show loading if service not ready
  if (!isServiceReady) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingIcon}>🚗</Text>
        <Text style={styles.loadingText}>Đang khởi tạo...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      {/* Main content */}
      <View style={styles.content}>
        {renderScreen()}
      </View>
      
      {/* Bottom navigation */}
      {currentScreen !== 'result' && renderNavigation()}
    </SafeAreaView>
  );
};

// Main App with TensorFlow Provider
const App: React.FC = () => {
  return (
    <TensorFlowProvider>
      <MainApp />
    </TensorFlowProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    flex: 1,
  },
  navigation: {
    flexDirection: 'row',
    backgroundColor: '#2a2a4e',
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navItemActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  navIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  navText: {
    fontSize: 12,
    color: '#888',
  },
  navTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  historyContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  clearButton: {
    color: '#FF3B30',
    fontSize: 14,
  },
  emptyHistory: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  historyList: {
    padding: 16,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
  historyColorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  historyItemInfo: {
    flex: 1,
  },
  historyItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  historyItemSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  historyItemStatus: {
    flexDirection: 'row',
    gap: 4,
  },
  statusIcon: {
    fontSize: 16,
  },
});

export default App;
