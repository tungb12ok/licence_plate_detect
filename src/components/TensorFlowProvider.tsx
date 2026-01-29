import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';

interface TensorFlowProviderProps {
  children: React.ReactNode;
}

export const TensorFlowProvider: React.FC<TensorFlowProviderProps> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState('Initializing...');

  useEffect(() => {
    const initializeTensorFlow = async () => {
      try {
        setLoadingStatus('Loading TensorFlow.js...');
        
        // Wait for TensorFlow to be ready
        await tf.ready();
        
        setLoadingStatus('TensorFlow backend: ' + tf.getBackend());
        
        // Brief delay to show the status
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('TensorFlow.js is ready');
        console.log('Backend:', tf.getBackend());
        console.log('Version:', tf.version.tfjs);
        
        setIsReady(true);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Failed to initialize TensorFlow:', errorMessage);
        setError(errorMessage);
      }
    };

    initializeTensorFlow();
  }, []);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>TensorFlow Error</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.retryText}>Please restart the app</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>🚗</Text>
          <Text style={styles.logoText}>License Plate</Text>
          <Text style={styles.logoSubtext}>Detection</Text>
        </View>
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
        <Text style={styles.loadingText}>{loadingStatus}</Text>
        <View style={styles.techStack}>
          <Text style={styles.techText}>Powered by TensorFlow.js</Text>
          <Text style={styles.versionText}>
            {Platform.OS === 'ios' ? 'iOS' : 'Android'} • React Native
          </Text>
        </View>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 80,
    marginBottom: 16,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoSubtext: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: '600',
  },
  loader: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
  },
  techStack: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  techText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  versionText: {
    fontSize: 12,
    color: '#555',
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryText: {
    fontSize: 14,
    color: '#666',
  },
});

export default TensorFlowProvider;
