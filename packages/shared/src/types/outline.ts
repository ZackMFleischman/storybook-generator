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
}

export interface GenerateOutlineRequest {
  projectId: string;
  topic: string;
  targetAge: '3-5' | '5-8';
  pageCount: number;
  toneKeywords?: string[];
  additionalInstructions?: string;
}
