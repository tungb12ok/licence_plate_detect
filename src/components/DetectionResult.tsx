import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Detection } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DetectionResultProps {
  imageUri: string;
  detections: Detection[];
  onRetake: () => void;
  onSave: () => void;
}

export const DetectionResult: React.FC<DetectionResultProps> = ({
  imageUri,
  detections,
  onRetake,
  onSave,
}) => {
  const imageHeight = SCREEN_WIDTH * 0.75;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Detection Results</Text>

      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUri }}
          style={[styles.image, { height: imageHeight }]}
          resizeMode="contain"
        />
        
        {/* Overlay detection boxes on image */}
        {detections.map((detection, index) => {
          // Scale bounding box to display size
          const scaleX = SCREEN_WIDTH / (SCREEN_WIDTH * 1.2);
          const scaleY = imageHeight / (imageHeight * 1.2);
          
          return (
            <View
              key={index}
              style={[
                styles.detectionBox,
                {
                  left: detection.bbox[0] * scaleX + 10,
                  top: detection.bbox[1] * scaleY + 10,
                  width: detection.bbox[2] * scaleX,
                  height: detection.bbox[3] * scaleY,
                },
              ]}
            >
              <View style={styles.labelContainer}>
                <Text style={styles.labelText}>
                  {detection.class}
                </Text>
                <Text style={styles.confidenceText}>
                  {(detection.score * 100).toFixed(1)}%
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Detection list */}
      <View style={styles.detectionList}>
        <Text style={styles.listTitle}>
          Found {detections.length} detection(s)
        </Text>
        {detections.map((detection, index) => (
          <View key={index} style={styles.detectionItem}>
            <View style={styles.detectionBadge}>
              <Text style={styles.badgeText}>{index + 1}</Text>
            </View>
            <View style={styles.detectionInfo}>
              <Text style={styles.detectionClass}>{detection.class}</Text>
              <Text style={styles.detectionScore}>
                Confidence: {(detection.score * 100).toFixed(1)}%
              </Text>
              <Text style={styles.detectionCoords}>
                Position: ({Math.round(detection.bbox[0])}, {Math.round(detection.bbox[1])})
              </Text>
            </View>
          </View>
        ))}
        
        {detections.length === 0 && (
          <Text style={styles.noDetectionText}>
            No license plates detected. Try taking another photo with better lighting or positioning.
          </Text>
        )}
      </View>

      {/* Action buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.retakeButton} onPress={onRetake}>
          <Text style={styles.retakeButtonText}>Retake</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.saveButton, detections.length === 0 && styles.saveButtonDisabled]} 
          onPress={onSave}
          disabled={detections.length === 0}
        >
          <Text style={styles.saveButtonText}>Save Result</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    backgroundColor: '#000',
    position: 'relative',
    marginBottom: 16,
  },
  image: {
    width: '100%',
  },
  detectionBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#00FF00',
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
    borderRadius: 4,
  },
  labelContainer: {
    position: 'absolute',
    top: -28,
    left: -2,
    flexDirection: 'row',
    backgroundColor: '#00FF00',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  labelText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 4,
  },
  confidenceText: {
    color: '#000',
    fontSize: 12,
  },
  detectionList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  detectionItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  detectionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  detectionInfo: {
    flex: 1,
  },
  detectionClass: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
  },
  detectionScore: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  detectionCoords: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  noDetectionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  retakeButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  retakeButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DetectionResult;
