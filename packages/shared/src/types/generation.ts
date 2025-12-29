import { AspectRatio } from './project.js';

// Reference Image Types (for session-based generation)
export interface ReferenceImage {
  type: 'character' | 'previous-page' | 'style';
  label: string;        // e.g., "Luna the rabbit", "Page 3"
  buffer: Buffer;       // Image data (not stored, used at generation time)
  mimeType: string;     // e.g., "image/png"
}

// Reference info without the actual buffer (for storage/display)
export interface ReferenceImageInfo {
  type: 'character' | 'previous-page' | 'style';
  label: string;
  sourcePath?: string;  // Path to the reference image file
}

// Detailed metadata stored with each generated image for introspection
export interface GenerationMetadata {
  sessionId: string;
  prompt: string;                         // Full prompt sent to Gemini
  referenceImages: ReferenceImageInfo[];  // What refs were passed (without buffer)
  modelUsed: string;
  generatedAt: string;
  generationTimeMs: number;
  aspectRatio: AspectRatio;
  messageIndex?: number;                  // Position in chat session (1 = first, etc.)
}

// Text Generation Types
export interface TextGenOptions {
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
}

export interface TextGenerationResponse {
  text: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  stopReason: 'end_turn' | 'max_tokens' | 'stop_sequence';
}

export interface TextModelInfo {
  id: string;
  name: string;
  provider: 'anthropic' | 'openai';
  maxContextTokens: number;
  supportsStreaming: boolean;
  supportsStructuredOutput: boolean;
}

// Image Generation Types
export interface ImageGenOptions {
  aspectRatio: AspectRatio;
  numberOfImages?: number;
  style?: string;
}

export interface GeneratedImage {
  buffer: Buffer;
  mimeType: string;
  revisedPrompt?: string;
  metadata: {
    model: string;
    aspectRatio: AspectRatio;
    generationTime: number;
  };
}

export interface ImageModelInfo {
  id: string;
  name: string;
  provider: 'google' | 'openai';
  maxResolution: string;
  supportsTextRendering: boolean;
  supportsReferences: boolean;
  maxReferences: number;
}

// Page Image (stored in project)
export interface PageImage {
  pageNumber: number;
  imagePath: string;
  hasTextBaked: boolean;
  bakedText?: string;
  prompt: string;
  generatedAt: string;
  modelUsed: string;
  aspectRatio: AspectRatio;
  imageType?: 'page' | 'cover' | 'back-cover';  // Distinguish cover images

  // Full generation metadata for introspection (Phase 2)
  generationMetadata?: GenerationMetadata;
}

// Generation Requests
export interface GeneratePageRequest {
  projectId: string;
  pageNumber: number;
  additionalPrompt?: string;
}

export interface GenerateAllPagesRequest {
  projectId: string;
  generationMode?: 'sequential' | 'parallel';
  additionalPrompt?: string;
}

export interface GenerationProgress {
  stage: string;
  current: number;
  total: number;
  message: string;
}

// Export Types
export interface ExportPdfRequest {
  projectId: string;
  pageSize?: '8x8' | '8.5x8.5' | '8x10' | 'a4';
  quality?: 'screen' | 'print';
  includeCover?: boolean;
  includeBackCover?: boolean;
}

export interface ExportResult {
  exportId: string;
  filePath: string;
  fileName: string;
  createdAt: string;
}
