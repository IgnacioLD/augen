import { apiClient, type VisionAnalysisRequest } from './ApiClient';
import type { LanguageCode } from '../../shared/types/languages';

/**
 * Image compression result
 */
export interface ImageCompressionResult {
  base64: string;
  originalWidth: number;
  originalHeight: number;
  compressedWidth: number;
  compressedHeight: number;
  originalSize: number;
  compressedSize: number;
  quality: number;
}

/**
 * Image dimensions
 */
export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Vision Service for image processing and analysis
 */
export class VisionService {
  private static readonly MAX_WIDTH = 1920; // Good balance for text readability
  private static readonly MAX_HEIGHT = 1920;
  private static readonly MAX_PIXELS = 2_073_600; // ~2MP max to keep under API limits

  /**
   * Calculate optimal dimensions for an image
   * Ensures image stays within size limits while preserving aspect ratio
   */
  static calculateOptimalDimensions(
    originalWidth: number,
    originalHeight: number
  ): ImageDimensions {
    let width = originalWidth;
    let height = originalHeight;

    // Calculate current pixels
    const currentPixels = width * height;

    // If image is too large by pixel count, scale down
    if (currentPixels > this.MAX_PIXELS) {
      const scale = Math.sqrt(this.MAX_PIXELS / currentPixels);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    // Ensure dimensions don't exceed max width/height
    if (width > this.MAX_WIDTH) {
      const scale = this.MAX_WIDTH / width;
      width = this.MAX_WIDTH;
      height = Math.round(height * scale);
    }

    if (height > this.MAX_HEIGHT) {
      const scale = this.MAX_HEIGHT / height;
      height = this.MAX_HEIGHT;
      width = Math.round(width * scale);
    }

    return { width, height };
  }

  /**
   * Convert a file to base64 with compression
   */
  static async fileToBase64(file: File): Promise<ImageCompressionResult> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      img.onload = () => {
        // Calculate optimal dimensions
        const { width, height } = this.calculateOptimalDimensions(img.width, img.height);

        canvas.width = width;
        canvas.height = height;

        // Draw and compress image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64 with compression
        // Use JPEG for photos (smaller) but maintain quality for text
        const quality = file.size > 2_000_000 ? 0.7 : 0.8; // Lower quality for larger files
        const dataURL = canvas.toDataURL('image/jpeg', quality);

        const base64 = dataURL.split(',')[1] || '';
        const compressedSize = Math.round(base64.length * 0.75); // Approximate compressed size

        // Development logging (removed in production build)
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            `Image compressed: ${img.width}x${img.height} -> ${width}x${height}, quality: ${quality}`
          );
          console.warn(`File size reduced: ${file.size} -> ~${compressedSize} bytes`);
        }

        resolve({
          base64,
          originalWidth: img.width,
          originalHeight: img.height,
          compressedWidth: width,
          compressedHeight: height,
          originalSize: file.size,
          compressedSize,
          quality,
        });
      };

      img.onerror = () => reject(new Error('Failed to load image'));

      // Load the image
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          img.src = result;
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Analyze an image with AI
   */
  static async analyzeImage(
    base64Image: string,
    options: {
      fullDescription?: boolean;
      language?: LanguageCode;
      customPrompt?: string | null;
    } = {}
  ): Promise<string> {
    const request: VisionAnalysisRequest = {
      image: base64Image,
      fullDescription: options.fullDescription || false,
      language: options.language || 'en',
      customPrompt: options.customPrompt || null,
    };

    const response = await apiClient.analyzeImage(request);
    return response.description;
  }

  /**
   * Process and analyze a file in one step
   */
  static async processAndAnalyze(
    file: File,
    options: {
      fullDescription?: boolean;
      language?: LanguageCode;
      customPrompt?: string | null;
    } = {}
  ): Promise<{
    description: string;
    compressionResult: ImageCompressionResult;
  }> {
    // Compress the image
    const compressionResult = await this.fileToBase64(file);

    // Analyze it
    const description = await this.analyzeImage(compressionResult.base64, options);

    return {
      description,
      compressionResult,
    };
  }

  /**
   * Validate image file
   */
  static validateImageFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return { valid: false, error: 'File must be an image' };
    }

    // Check file size (max 20MB before compression)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      return { valid: false, error: 'Image too large (max 20MB)' };
    }

    return { valid: true };
  }
}
