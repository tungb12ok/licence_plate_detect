import * as tf from '@tensorflow/tfjs';
import { 
  BoundingBox, 
  VehicleRegion, 
  LicensePlateRegion, 
  LogoRegion,
  ColorInfo,
} from '../types/detection';

/**
 * Service xử lý hình ảnh để phát hiện các vùng trên xe
 * Đây là bước tiền xử lý trước khi gửi lên cloud
 */
class ImageProcessingService {
  
  /**
   * Phát hiện vùng xe (đầu/đít xe) dựa trên edge detection và contour analysis
   */
  async detectVehicleRegion(
    imageTensor: tf.Tensor3D,
    imageWidth: number,
    imageHeight: number
  ): Promise<VehicleRegion | null> {
    const tensorsToDispose: tf.Tensor[] = [];

    try {
      // Convert to grayscale
      const gray = imageTensor.mean(2);
      tensorsToDispose.push(gray);
      
      // Edge detection using Sobel
      const sobelX = tf.tensor2d([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]);
      const sobelY = tf.tensor2d([[-1, -2, -1], [0, 0, 0], [1, 2, 1]]);
      tensorsToDispose.push(sobelX, sobelY);
      
      const expanded = gray.expandDims(0).expandDims(-1);
      const kernelX = sobelX.expandDims(-1).expandDims(-1);
      const kernelY = sobelY.expandDims(-1).expandDims(-1);
      tensorsToDispose.push(expanded, kernelX, kernelY);
      
      const gradX = tf.conv2d(expanded as tf.Tensor4D, kernelX as tf.Tensor4D, 1, 'same');
      const gradY = tf.conv2d(expanded as tf.Tensor4D, kernelY as tf.Tensor4D, 1, 'same');
      tensorsToDispose.push(gradX, gradY);
      
      const magnitude = tf.sqrt(tf.add(tf.square(gradX), tf.square(gradY))).squeeze();
      tensorsToDispose.push(magnitude);
      
      // Normalize và threshold
      const maxVal = (magnitude as tf.Tensor2D).max();
      const normalized = (magnitude as tf.Tensor2D).div(maxVal);
      const threshold = normalized.greater(0.15);
      tensorsToDispose.push(maxVal, normalized, threshold);
      
      // Tìm vùng có nhiều edge nhất (thường là vùng xe)
      const edgeData = await threshold.data();
      
      // Chia hình thành grid để tìm vùng tập trung edge
      const gridSize = 8;
      const cellWidth = Math.floor(imageWidth / gridSize);
      const cellHeight = Math.floor(imageHeight / gridSize);
      
      let maxDensity = 0;
      let bestRegion = { x: 0, y: 0, width: 0, height: 0 };
      
      // Scan qua các vùng để tìm vehicle region
      for (let gy = 0; gy < gridSize - 2; gy++) {
        for (let gx = 0; gx < gridSize - 2; gx++) {
          let density = 0;
          const startX = gx * cellWidth;
          const startY = gy * cellHeight;
          const regionWidth = cellWidth * 3;
          const regionHeight = cellHeight * 3;
          
          // Tính edge density trong vùng
          for (let y = startY; y < startY + regionHeight && y < imageHeight; y++) {
            for (let x = startX; x < startX + regionWidth && x < imageWidth; x++) {
              const idx = y * imageWidth + x;
              if (edgeData[idx]) density++;
            }
          }
          
          density /= (regionWidth * regionHeight);
          
          if (density > maxDensity) {
            maxDensity = density;
            bestRegion = {
              x: startX,
              y: startY,
              width: regionWidth,
              height: regionHeight
            };
          }
        }
      }
      
      if (maxDensity > 0.05) {
        // Xác định đầu hay đít xe dựa vào vị trí vertical
        const centerY = bestRegion.y + bestRegion.height / 2;
        const type: 'front' | 'rear' = centerY > imageHeight * 0.5 ? 'rear' : 'front';
        
        return {
          type,
          bbox: bestRegion,
          confidence: Math.min(maxDensity * 5, 0.95)
        };
      }
      
      return null;
    } catch (error) {
      console.error('Vehicle detection error:', error);
      return null;
    } finally {
      tensorsToDispose.forEach(t => t.dispose());
    }
  }

  /**
   * Phát hiện vùng biển số dựa trên tỷ lệ aspect ratio và edge density
   * Biển số VN thường có tỷ lệ 4:1 hoặc 2:1
   */
  async detectLicensePlateRegion(
    imageTensor: tf.Tensor3D,
    imageWidth: number,
    imageHeight: number,
    vehicleRegion?: VehicleRegion | null
  ): Promise<LicensePlateRegion | null> {
    const tensorsToDispose: tf.Tensor[] = [];

    try {
      // Convert to grayscale
      const gray = imageTensor.mean(2);
      tensorsToDispose.push(gray);
      
      // Edge detection
      const sobelX = tf.tensor2d([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]);
      tensorsToDispose.push(sobelX);
      
      const expanded = gray.expandDims(0).expandDims(-1);
      const kernelX = sobelX.expandDims(-1).expandDims(-1);
      tensorsToDispose.push(expanded, kernelX);
      
      const edges = tf.abs(tf.conv2d(expanded as tf.Tensor4D, kernelX as tf.Tensor4D, 1, 'same')).squeeze();
      tensorsToDispose.push(edges);
      
      const edgeData = await edges.data();
      const maxEdgeTensor = (edges as tf.Tensor2D).max();
      tensorsToDispose.push(maxEdgeTensor);
      const maxEdgeData = await maxEdgeTensor.data();
      const maxEdge = maxEdgeData[0];
      
      // Vùng tìm kiếm (ưu tiên trong vehicle region nếu có)
      let searchStartX = 0;
      let searchStartY = Math.floor(imageHeight * 0.4);
      let searchEndX = imageWidth;
      let searchEndY = imageHeight;
      
      if (vehicleRegion) {
        searchStartX = vehicleRegion.bbox.x;
        searchStartY = vehicleRegion.bbox.y + vehicleRegion.bbox.height * 0.3;
        searchEndX = vehicleRegion.bbox.x + vehicleRegion.bbox.width;
        searchEndY = vehicleRegion.bbox.y + vehicleRegion.bbox.height;
      }
      
      // Tìm vùng có density edge cao với aspect ratio phù hợp
      const candidates: Array<{ bbox: BoundingBox; score: number }> = [];
      
      // Scan với các kích thước biển số khác nhau
      const plateSizes = [
        { w: imageWidth * 0.25, h: imageWidth * 0.065 },
        { w: imageWidth * 0.15, h: imageWidth * 0.075 },
      ];
      
      for (const size of plateSizes) {
        const stepX = size.w * 0.3;
        const stepY = size.h * 0.5;
        
        for (let y = searchStartY; y < searchEndY - size.h; y += stepY) {
          for (let x = searchStartX; x < searchEndX - size.w; x += stepX) {
            let edgeDensity = 0;
            let horizontalEdges = 0;
            
            for (let dy = 0; dy < size.h; dy++) {
              for (let dx = 0; dx < size.w; dx++) {
                const idx = Math.floor(y + dy) * imageWidth + Math.floor(x + dx);
                const edgeVal = (edgeData[idx] || 0) / maxEdge;
                edgeDensity += edgeVal;
                
                if (edgeVal > 0.3) horizontalEdges++;
              }
            }
            
            edgeDensity /= (size.w * size.h);
            const horizontalRatio = horizontalEdges / (size.w * size.h);
            
            if (edgeDensity > 0.15 && horizontalRatio > 0.1) {
              candidates.push({
                bbox: { x: Math.floor(x), y: Math.floor(y), width: Math.floor(size.w), height: Math.floor(size.h) },
                score: edgeDensity * 0.6 + horizontalRatio * 0.4
              });
            }
          }
        }
      }
      
      if (candidates.length === 0) return null;
      
      candidates.sort((a, b) => b.score - a.score);
      const best = candidates[0];
      
      return {
        bbox: best.bbox,
        confidence: Math.min(best.score * 2, 0.9)
      };
    } catch (error) {
      console.error('License plate detection error:', error);
      return null;
    } finally {
      tensorsToDispose.forEach(t => t.dispose());
    }
  }

  /**
   * Phát hiện vùng logo (thường ở giữa đầu xe hoặc đít xe)
   */
  async detectLogoRegion(
    imageTensor: tf.Tensor3D,
    imageWidth: number,
    imageHeight: number,
    vehicleRegion?: VehicleRegion | null
  ): Promise<LogoRegion | null> {
    const tensorsToDispose: tf.Tensor[] = [];

    try {
      const gray = imageTensor.mean(2);
      tensorsToDispose.push(gray);
      
      const laplacian = tf.tensor2d([
        [0, 1, 0],
        [1, -4, 1],
        [0, 1, 0]
      ]);
      tensorsToDispose.push(laplacian);
      
      const expanded = gray.expandDims(0).expandDims(-1);
      const kernel = laplacian.expandDims(-1).expandDims(-1);
      tensorsToDispose.push(expanded, kernel);
      
      const response = tf.abs(tf.conv2d(expanded as tf.Tensor4D, kernel as tf.Tensor4D, 1, 'same')).squeeze();
      tensorsToDispose.push(response);
      
      const responseData = await response.data();
      const maxResponseTensor = (response as tf.Tensor2D).max();
      tensorsToDispose.push(maxResponseTensor);
      const maxResponseData = await maxResponseTensor.data();
      const maxResponse = maxResponseData[0];
      
      let searchCenterX = imageWidth / 2;
      let searchCenterY = imageHeight * 0.3;
      let searchRadius = imageWidth * 0.3;
      
      if (vehicleRegion) {
        searchCenterX = vehicleRegion.bbox.x + vehicleRegion.bbox.width / 2;
        searchCenterY = vehicleRegion.bbox.y + vehicleRegion.bbox.height * 0.2;
        searchRadius = vehicleRegion.bbox.width * 0.3;
      }
      
      const logoSizes = [
        imageWidth * 0.06,
        imageWidth * 0.08,
        imageWidth * 0.1
      ];
      
      let bestLogo: { bbox: BoundingBox; score: number } | null = null;
      
      for (const logoSize of logoSizes) {
        const halfSize = logoSize / 2;
        
        for (let y = searchCenterY - searchRadius; y < searchCenterY + searchRadius; y += logoSize * 0.5) {
          for (let x = searchCenterX - searchRadius; x < searchCenterX + searchRadius; x += logoSize * 0.5) {
            if (x < halfSize || y < halfSize || x > imageWidth - halfSize || y > imageHeight - halfSize) continue;
            
            let blobScore = 0;
            let pixelCount = 0;
            
            for (let dy = -halfSize; dy < halfSize; dy++) {
              for (let dx = -halfSize; dx < halfSize; dx++) {
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > halfSize) continue;
                
                const px = Math.floor(x + dx);
                const py = Math.floor(y + dy);
                if (px < 0 || py < 0 || px >= imageWidth || py >= imageHeight) continue;
                
                const idx = py * imageWidth + px;
                blobScore += (responseData[idx] || 0) / maxResponse;
                pixelCount++;
              }
            }
            
            if (pixelCount > 0) {
              blobScore /= pixelCount;
              
              if (!bestLogo || blobScore > bestLogo.score) {
                bestLogo = {
                  bbox: {
                    x: Math.floor(x - halfSize),
                    y: Math.floor(y - halfSize),
                    width: Math.floor(logoSize),
                    height: Math.floor(logoSize)
                  },
                  score: blobScore
                };
              }
            }
          }
        }
      }
      
      if (bestLogo && bestLogo.score > 0.1) {
        return {
          bbox: bestLogo.bbox,
          confidence: Math.min(bestLogo.score * 3, 0.85)
        };
      }
      
      return null;
    } catch (error) {
      console.error('Logo detection error:', error);
      return null;
    } finally {
      tensorsToDispose.forEach(t => t.dispose());
    }
  }

  /**
   * Phát hiện màu xe chủ đạo
   */
  async detectVehicleColor(
    imageTensor: tf.Tensor3D,
    vehicleRegion?: VehicleRegion | null
  ): Promise<ColorInfo | null> {
    const tensorsToDispose: tf.Tensor[] = [];
    
    try {
      const [height, width] = imageTensor.shape;
      
      let regionData: Float32Array | Int32Array | Uint8Array;
      let regionWidth: number;
      let regionHeight: number;
      
      if (vehicleRegion) {
        const { x, y, width: w, height: h } = vehicleRegion.bbox;
        const normalized = imageTensor.div(255);
        tensorsToDispose.push(normalized);
        
        const cropped = normalized.slice(
          [Math.max(0, y), Math.max(0, x), 0],
          [Math.min(h, height - y), Math.min(w, width - x), 3]
        );
        tensorsToDispose.push(cropped);
        
        regionData = await cropped.data();
        regionWidth = Math.min(vehicleRegion.bbox.width, width - vehicleRegion.bbox.x);
        regionHeight = Math.min(vehicleRegion.bbox.height, height - vehicleRegion.bbox.y);
      } else {
        const startY = Math.floor(height * 0.3);
        const startX = Math.floor(width * 0.2);
        const cropHeight = Math.floor(height * 0.4);
        const cropWidth = Math.floor(width * 0.6);
        
        const cropped = imageTensor.slice([startY, startX, 0], [cropHeight, cropWidth, 3]).div(255);
        tensorsToDispose.push(cropped);
        
        regionData = await cropped.data();
        regionWidth = cropWidth;
        regionHeight = cropHeight;
      }
      
      const colorHistogram: { [key: string]: { count: number; r: number; g: number; b: number } } = {};
      const pixelCount = regionWidth * regionHeight;
      
      for (let i = 0; i < regionData.length; i += 3) {
        const r = Math.round(regionData[i] * 255);
        const g = Math.round(regionData[i + 1] * 255);
        const b = Math.round(regionData[i + 2] * 255);
        
        const qr = Math.floor(r / 32) * 32;
        const qg = Math.floor(g / 32) * 32;
        const qb = Math.floor(b / 32) * 32;
        const key = `${qr},${qg},${qb}`;
        
        if (!colorHistogram[key]) {
          colorHistogram[key] = { count: 0, r: 0, g: 0, b: 0 };
        }
        colorHistogram[key].count++;
        colorHistogram[key].r += r;
        colorHistogram[key].g += g;
        colorHistogram[key].b += b;
      }
      
      let dominantColor = { r: 0, g: 0, b: 0, count: 0 };
      
      for (const key in colorHistogram) {
        const color = colorHistogram[key];
        if (color.count > dominantColor.count) {
          dominantColor = {
            r: Math.round(color.r / color.count),
            g: Math.round(color.g / color.count),
            b: Math.round(color.b / color.count),
            count: color.count
          };
        }
      }
      
      const hsl = this.rgbToHsl(dominantColor.r, dominantColor.g, dominantColor.b);
      const colorName = this.getColorName(hsl.h, hsl.s, hsl.l);
      const hex = this.rgbToHex(dominantColor.r, dominantColor.g, dominantColor.b);
      
      return {
        dominant: hex,
        name: colorName,
        confidence: dominantColor.count / pixelCount,
        rgb: { r: dominantColor.r, g: dominantColor.g, b: dominantColor.b }
      };
    } catch (error) {
      console.error('Color detection error:', error);
      return null;
    } finally {
      tensorsToDispose.forEach(t => t.dispose());
    }
  }

  private rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }
    
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  private getColorName(h: number, s: number, l: number): string {
    if (l >= 85 && s <= 15) return 'Trắng';
    if (l <= 15) return 'Đen';
    if (s <= 15 && l > 55 && l < 85) return 'Bạc';
    if (s <= 15) return 'Xám';
    
    if ((h >= 0 && h <= 20) || h >= 340) return 'Đỏ';
    if (h > 20 && h <= 45) return 'Cam';
    if (h > 45 && h <= 65) return 'Vàng';
    if (h > 65 && h <= 160) return 'Xanh lá';
    if (h > 160 && h <= 200) return 'Xanh ngọc';
    if (h > 200 && h <= 250) return 'Xanh dương';
    if (h > 250 && h <= 290) return 'Tím';
    if (h > 290 && h < 340) return 'Hồng';
    
    return 'Không xác định';
  }
}

export const imageProcessingService = new ImageProcessingService();
export default imageProcessingService;
