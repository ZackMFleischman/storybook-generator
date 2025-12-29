import { Outline } from './outline.js';
import { Manuscript } from './manuscript.js';
import { PageImage } from './generation.js';

export type Stage = 'outline' | 'manuscript' | 'illustrations' | 'export';
export type TargetAge = '3-5' | '5-8';
export type AspectRatio = '1:1' | '3:4' | '4:3' | '2:3' | '3:2';
export type TextCompositionMode = 'ai-baked' | 'ai-overlay' | 'manual' | 'none';

export interface ProjectSettings {
  targetAge: TargetAge;
  targetPageCount: number;
  aspectRatio: AspectRatio;
  toneKeywords: string[];
  artStyleKeywords: string[];
  textCompositionMode: TextCompositionMode;
  fontStyle: string;
  textModel: string;
  imageModel: string;
}

export interface Project {
  id: string;
  name: string;
  topic: string;
  createdAt: string;
  updatedAt: string;
  settings: ProjectSettings;
  currentStage: Stage;

  // Stage outputs
  outline: Outline | null;
  manuscript: Manuscript | null;
  pageImages: PageImage[];

  // Cover images
  coverImage: PageImage | null;
  backCoverImage: PageImage | null;
}

export interface ProjectSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  currentStage: Stage;
  thumbnailPath?: string;
}

export interface CreateProjectRequest {
  name: string;
  topic?: string;
  settings?: Partial<ProjectSettings>;
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  targetAge: '3-5',
  targetPageCount: 12,
  aspectRatio: '3:4',
  toneKeywords: ['whimsical'],
  artStyleKeywords: ['watercolor', 'soft', 'children book illustration'],
  textCompositionMode: 'ai-baked',
  fontStyle: 'storybook-serif',
  textModel: 'claude-opus-4-5',
  imageModel: 'gemini-2.5-flash',
};
