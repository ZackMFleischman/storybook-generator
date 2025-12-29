import { GoogleGenAI, Modality } from '@google/genai';
import { AspectRatio, ImageGenOptions, GeneratedImage, ImageModelInfo } from '@storybook-generator/shared';
import { IImageGenerationAdapter } from './image-generation.interface.js';
import { getCacheKey, getImageCache, setImageCache } from '../../cache/index.js';

export class GeminiAdapter implements IImageGenerationAdapter {
  private client: GoogleGenAI;
  private modelId: string;

  constructor(apiKey: string, modelId: string = 'gemini-2.5-flash-preview-image-generation') {
    this.client = new GoogleGenAI({ apiKey });
    this.modelId = modelId;
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
            cached: true,
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
