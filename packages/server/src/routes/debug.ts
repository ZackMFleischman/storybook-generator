import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { config } from '../config/index.js';

export function createDebugRouter(): Router {
  const router = Router();

  // Test basic Gemini image generation
  router.get('/test-image', async (req: Request, res: Response) => {
    const testPrompt = (req.query.prompt as string) || 'A cute cartoon rabbit in a meadow, children\'s book illustration style';
    const modelId = (req.query.model as string) || config.defaultImageModel;

    console.log('=== Debug Image Generation Test ===');
    console.log('Model:', modelId);
    console.log('Prompt:', testPrompt);
    console.log('API Key present:', !!config.googleAiApiKey);

    try {
      const client = new GoogleGenAI({ apiKey: config.googleAiApiKey });

      console.log('Calling Gemini API...');
      const response = await client.models.generateContent({
        model: modelId,
        contents: testPrompt,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      console.log('Response received');
      console.log('Candidates:', response.candidates?.length);

      // Log full response structure for debugging
      const candidate = response.candidates?.[0];
      console.log('Content parts:', candidate?.content?.parts?.length);

      if (candidate?.content?.parts) {
        for (let i = 0; i < candidate.content.parts.length; i++) {
          const part = candidate.content.parts[i];
          if ('text' in part) {
            console.log(`Part ${i}: TEXT - "${part.text?.substring(0, 100)}..."`);
          } else if ('inlineData' in part) {
            console.log(`Part ${i}: IMAGE - mimeType: ${part.inlineData?.mimeType}, dataLength: ${part.inlineData?.data?.length}`);
          } else {
            console.log(`Part ${i}: UNKNOWN -`, Object.keys(part));
          }
        }
      }

      // Find image part
      const imagePart = candidate?.content?.parts?.find(
        (part) => 'inlineData' in part && part.inlineData
      );

      if (imagePart && 'inlineData' in imagePart && imagePart.inlineData) {
        const imageData = imagePart.inlineData;
        const buffer = Buffer.from(imageData.data as string, 'base64');

        console.log('Success! Image size:', buffer.length, 'bytes');

        // Return image directly
        res.setHeader('Content-Type', imageData.mimeType || 'image/png');
        res.send(buffer);
      } else {
        // Return diagnostic info
        res.status(400).json({
          error: 'No image in response',
          model: modelId,
          prompt: testPrompt,
          candidateCount: response.candidates?.length,
          parts: candidate?.content?.parts?.map((p) => Object.keys(p)),
          finishReason: candidate?.finishReason,
        });
      }
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({
        error: 'Image generation failed',
        message: error instanceof Error ? error.message : String(error),
        model: modelId,
        prompt: testPrompt,
      });
    }
  });

  // List available models info
  router.get('/models', (req: Request, res: Response) => {
    res.json({
      currentConfig: {
        defaultImageModel: config.defaultImageModel,
        defaultTextModel: config.defaultTextModel,
      },
      recommendedImageModels: [
        { id: 'gemini-2.5-flash-preview-image-generation', description: 'Gemini 2.5 Flash with image generation' },
        { id: 'imagen-3.0-generate-002', description: 'Imagen 3 (dedicated image model)' },
      ],
      textOnlyModels: [
        { id: 'gemini-2.0-flash-exp', description: 'Text only - will NOT generate images' },
        { id: 'gemini-1.5-pro', description: 'Text only - will NOT generate images' },
      ],
    });
  });

  return router;
}
