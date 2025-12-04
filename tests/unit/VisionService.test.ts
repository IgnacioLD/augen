import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VisionService } from '../../src/frontend/services/VisionService';

describe('VisionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateOptimalDimensions', () => {
    it('should keep dimensions if within limits', () => {
      const result = VisionService.calculateOptimalDimensions(800, 600);
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
    });

    it('should scale down if exceeds max width', () => {
      const result = VisionService.calculateOptimalDimensions(2400, 1600);
      // Pixels first: 2400*1600=3.84M > 2.07M, so scales by sqrt(2.07M/3.84M)=0.735
      // Then checks max width: 2400*0.735=1764 < 1920, so keeps 1764
      expect(result.width).toBe(1764);
      expect(result.height).toBe(1176);
    });

    it('should scale down if exceeds max height', () => {
      const result = VisionService.calculateOptimalDimensions(1600, 2400);
      // Pixels first: 1600*2400=3.84M > 2.07M, so scales by sqrt(2.07M/3.84M)=0.735
      // Then checks max height: 2400*0.735=1764 < 1920, so keeps 1176x1764
      expect(result.width).toBe(1176);
      expect(result.height).toBe(1764);
    });

    it('should scale down if exceeds max pixels', () => {
      const result = VisionService.calculateOptimalDimensions(3000, 3000);
      // 3000x3000 = 9M pixels, should scale down to ~2MP
      const pixels = result.width * result.height;
      expect(pixels).toBeLessThanOrEqual(2_073_600);
    });

    it('should preserve aspect ratio when scaling', () => {
      const originalWidth = 2400;
      const originalHeight = 1200;
      const originalRatio = originalWidth / originalHeight;

      const result = VisionService.calculateOptimalDimensions(originalWidth, originalHeight);
      const newRatio = result.width / result.height;

      expect(Math.abs(newRatio - originalRatio)).toBeLessThan(0.01);
    });

    it('should handle square images', () => {
      const result = VisionService.calculateOptimalDimensions(2000, 2000);
      expect(result.width).toBe(result.height);
    });
  });

  describe('validateImageFile', () => {
    it('should validate correct image file', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const result = VisionService.validateImageFile(file);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject non-image file', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const result = VisionService.validateImageFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('File must be an image');
    });

    it('should reject file that is too large', () => {
      const largeContent = new Array(21 * 1024 * 1024).fill('a').join('');
      const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });
      const result = VisionService.validateImageFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Image too large (max 20MB)');
    });

    it('should accept various image types', () => {
      const types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

      types.forEach((type) => {
        const file = new File(['content'], `test.${type.split('/')[1]}`, { type });
        const result = VisionService.validateImageFile(file);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('fileToBase64', () => {
    it.skip('should convert file to base64 (requires full canvas support)', async () => {
      // Skipped: happy-dom doesn't fully support canvas.getContext('2d')
      // This functionality is tested in E2E tests with real browser
    });

    it.skip('should compress large images (requires full canvas support)', async () => {
      // Skipped: happy-dom doesn't fully support canvas.getContext('2d')
      // This functionality is tested in E2E tests with real browser
    });

    it.skip('should use lower quality for large files (requires full canvas support)', async () => {
      // Skipped: happy-dom doesn't fully support canvas.getContext('2d')
      // This functionality is tested in E2E tests with real browser
    });

    it.skip('should use higher quality for smaller files (requires full canvas support)', async () => {
      // Skipped: happy-dom doesn't fully support canvas.getContext('2d')
      // This functionality is tested in E2E tests with real browser
    });
  });
});
