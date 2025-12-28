export type TextPlacement = 'top' | 'bottom' | 'overlay' | 'integrated' | 'none';
export type PageSpread = 'left' | 'right' | 'full';

export interface TextRenderingHints {
  fontStyle: 'handwritten' | 'storybook-serif' | 'playful-sans' | 'custom';
  textArea: 'top-third' | 'bottom-third' | 'left-side' | 'right-side' | 'speech-bubble' | 'integrated';
  textBackground: 'none' | 'solid-white' | 'semi-transparent' | 'banner';
}

export interface ManuscriptPage {
  pageNumber: number;
  spread: PageSpread;
  text: string | null;
  textPlacement: TextPlacement;
  illustrationDescription: string;
  characters: string[];
  mood: string;
  action: string;
  textRenderingHints?: TextRenderingHints;
  continuesFrom?: string;
}

export interface Manuscript {
  pages: ManuscriptPage[];
}

export interface GenerateManuscriptRequest {
  projectId: string;
  wordsPerPage?: number;
  textStyle?: 'rhythmic' | 'narrative' | 'simple';
  additionalGuidance?: string;
}
