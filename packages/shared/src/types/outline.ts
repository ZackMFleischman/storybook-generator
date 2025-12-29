export interface Character {
  id: string;
  name: string;
  role: 'protagonist' | 'supporting' | 'antagonist';
  description: string;
  physicalDescription: string;
  age?: string;
}

export interface Setting {
  location: string;
  timePeriod: string;
  atmosphere: string;
  visualDetails: string;
}

export interface PlotPoint {
  id: string;
  order: number;
  title: string;
  description: string;
  characters: string[];
}

export interface Outline {
  title: string;
  subtitle?: string;
  synopsis: string;
  theme: string;
  characters: Character[];
  setting: Setting;
  plotPoints: PlotPoint[];
  // Cover content
  coverDescription: string;      // Front cover illustration description
  backCoverDescription: string;  // Back cover illustration description
  backCoverBlurb: string;        // Marketing blurb for back cover
}

export interface GenerateOutlineRequest {
  projectId: string;
  topic: string;
  targetAge: '3-5' | '5-8';
  pageCount: number;
  toneKeywords?: string[];
  additionalInstructions?: string;
}

export interface OutlineFeedback {
  overall?: string;
  title?: string;
  synopsis?: string;
  theme?: string;
  setting?: string;
  characters?: Record<string, string>;
  plotPoints?: Record<string, string>;
  coverDescription?: string;
  backCoverDescription?: string;
  backCoverBlurb?: string;
}

export interface RefineOutlineRequest {
  projectId: string;
  feedback: OutlineFeedback;
}
