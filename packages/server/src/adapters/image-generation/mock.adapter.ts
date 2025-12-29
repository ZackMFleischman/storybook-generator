import { AspectRatio, ImageGenOptions, GeneratedImage, ImageModelInfo, ReferenceImage } from '@storybook-generator/shared';
import { IImageGenerationAdapter } from './image-generation.interface.js';

// A simple 1x1 PNG placeholder (red pixel)
const PLACEHOLDER_PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
  0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
  0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x18, 0xdd, 0x8d, 0xb4, 0x00, 0x00,
  0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

export class MockImageAdapter implements IImageGenerationAdapter {
  private customImage?: Buffer;
  private messageCounters: Map<string, number> = new Map();

  setCustomImage(buffer: Buffer): void {
    this.customImage = buffer;
  }

  async generateImage(
    prompt: string,
    options: ImageGenOptions
  ): Promise<GeneratedImage> {
    // Simulate some delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      buffer: this.customImage ?? PLACEHOLDER_PNG,
      mimeType: 'image/png',
      revisedPrompt: prompt,
      metadata: {
        model: 'mock-image-model',
        aspectRatio: options.aspectRatio,
        generationTime: 100,
      },
    };
  }

  getModelInfo(): ImageModelInfo {
    return {
      id: 'mock-image-model',
      name: 'Mock Image Model',
      provider: 'google',
      maxResolution: '1024px',
      supportsTextRendering: true,
      supportsReferences: false,
      maxReferences: 0,
    };
  }

  getSupportedAspectRatios(): AspectRatio[] {
    return ['1:1', '3:4', '4:3'];
  }

  // Session-based generation methods (Phase 2)
  async createSession(projectId: string): Promise<string> {
    const sessionId = `mock-session-${projectId}-${Date.now()}`;
    this.messageCounters.set(sessionId, 0);
    return sessionId;
  }

  async generateWithReferences(
    sessionId: string,
    prompt: string,
    referenceImages: ReferenceImage[],
    options: ImageGenOptions
  ): Promise<GeneratedImage> {
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Increment message counter
    const count = (this.messageCounters.get(sessionId) || 0) + 1;
    this.messageCounters.set(sessionId, count);

    return {
      buffer: this.customImage ?? PLACEHOLDER_PNG,
      mimeType: 'image/png',
      revisedPrompt: prompt,
      metadata: {
        model: 'mock-image-model',
        aspectRatio: options.aspectRatio,
        generationTime: 100,
      },
    };
  }

  closeSession(sessionId: string): void {
    this.messageCounters.delete(sessionId);
  }

  getMessageIndex(sessionId: string): number {
    return this.messageCounters.get(sessionId) || 0;
  }
}
