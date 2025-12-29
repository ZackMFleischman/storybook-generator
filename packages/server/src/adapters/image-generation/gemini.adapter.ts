import { GoogleGenAI, Modality } from '@google/genai';
import { AspectRatio, ImageGenOptions, GeneratedImage, ImageModelInfo, ReferenceImage } from '@storybook-generator/shared';
import { IImageGenerationAdapter } from './image-generation.interface.js';
import { getCacheKey, getImageCache, setImageCache } from '../../cache/index.js';
import { logger } from '../../utils/logger.js';

export class GeminiAdapter implements IImageGenerationAdapter {
  private client: GoogleGenAI;
  private modelId: string;
  private messageCounters: Map<string, number> = new Map();

  constructor(apiKey: string, modelId: string = 'gemini-2.5-flash-preview-image-generation') {
    this.client = new GoogleGenAI({ apiKey });
    this.modelId = modelId;
  }

  // Session tracking (lightweight - just for metadata, no actual Gemini session)
  async createSession(projectId: string): Promise<string> {
    const sessionId = `gen-${projectId}-${Date.now()}`;
    this.messageCounters.set(sessionId, 0);
    logger.gemini.session.created(sessionId);
    return sessionId;
  }

  // Single-turn generation WITH reference images
  // Uses generateContent (not chat) to avoid thought_signature issues
  async generateWithReferences(
    sessionId: string,
    prompt: string,
    referenceImages: ReferenceImage[],
    options: ImageGenOptions
  ): Promise<GeneratedImage> {
    const startTime = Date.now();

    // Build multi-part content with text and images
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    // Add reference images FIRST (so the model sees them before the prompt)
    if (referenceImages.length > 0) {
      logger.gemini.withReferences(referenceImages.length);
    }

    for (const ref of referenceImages) {
      const base64Data = ref.buffer.toString('base64');

      parts.push({ text: `[Reference - ${ref.type}: ${ref.label}]` });
      parts.push({
        inlineData: {
          mimeType: ref.mimeType,
          data: base64Data,
        },
      });
    }

    // Add the main prompt last
    parts.push({ text: prompt });

    // Increment message counter for metadata tracking
    const messageIndex = (this.messageCounters.get(sessionId) || 0) + 1;
    this.messageCounters.set(sessionId, messageIndex);

    // Use single-turn generateContent (not chat session)
    const response = await this.client.models.generateContent({
      model: this.modelId,
      contents: [{ role: 'user', parts }],
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    // Extract image from response
    const imagePart = response.candidates?.[0]?.content?.parts?.find(
      (p: unknown) => p && typeof p === 'object' && 'inlineData' in p
    ) as { inlineData?: { data?: string; mimeType?: string } } | undefined;

    if (!imagePart || !imagePart.inlineData) {
      throw new Error('No image generated in response');
    }

    const buffer = Buffer.from(imagePart.inlineData.data!, 'base64');
    logger.gemini.response(buffer.length);

    return {
      buffer,
      mimeType: imagePart.inlineData.mimeType || 'image/png',
      metadata: {
        model: this.modelId,
        aspectRatio: options.aspectRatio,
        generationTime: Date.now() - startTime,
      },
    };
  }

  closeSession(sessionId: string): void {
    this.messageCounters.delete(sessionId);
    logger.gemini.session.closed(sessionId);
  }

  getMessageIndex(sessionId: string): number {
    return this.messageCounters.get(sessionId) || 0;
  }

  async generateImage(
    prompt: string,
    options: ImageGenOptions & { skipCache?: boolean }
  ): Promise<GeneratedImage> {
    const startTime = Date.now();

    // Check cache first
    const cacheKey = getCacheKey(this.modelId, prompt, options.aspectRatio);
    if (!options?.skipCache) {
      const cached = await getImageCache(cacheKey);
      if (cached) {
        return {
          buffer: cached,
          mimeType: 'image/png',
          metadata: {
            model: this.modelId,
            aspectRatio: options.aspectRatio,
            generationTime: 0,
          },
        };
      }
    }

    const response = await this.client.models.generateContent({
      model: this.modelId,
      contents: prompt,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    // Extract image from response
    const part = response.candidates?.[0]?.content?.parts?.[0];

    if (!part || !('inlineData' in part) || !part.inlineData) {
      throw new Error('No image generated in response');
    }

    const imageData = part.inlineData;
    const buffer = Buffer.from(imageData.data!, 'base64');

    // Store in cache
    await setImageCache(cacheKey, buffer);

    return {
      buffer,
      mimeType: imageData.mimeType || 'image/png',
      metadata: {
        model: this.modelId,
        aspectRatio: options.aspectRatio,
        generationTime: Date.now() - startTime,
      },
    };
  }

  getModelInfo(): ImageModelInfo {
    return {
      id: this.modelId,
      name: this.modelId.includes('flash') ? 'Gemini 2.0 Flash' : 'Gemini Pro',
      provider: 'google',
      maxResolution: '1024px',
      supportsTextRendering: true,
      supportsReferences: true,
      maxReferences: 3,
    };
  }

  getSupportedAspectRatios(): AspectRatio[] {
    return ['1:1', '3:4', '4:3', '2:3', '3:2'];
  }
}
