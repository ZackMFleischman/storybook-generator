# Children's Storybook Generator

A web application that generates illustrated children's picture books from a simple topic prompt. Users enter a topic, and the app generates a complete storybook with AI-generated text (Claude) and illustrations (Gemini), exportable as a PDF.

## Project Overview

### What It Does

1. **Topic → Outline**: User enters a topic (e.g., "a curious rabbit who learns to share"), AI generates a story outline with characters, setting, and plot points
2. **Outline → Manuscript**: AI expands the outline into page-by-page text with illustration descriptions
3. **Manuscript → Illustrations**: AI generates images for each page based on the illustration descriptions
4. **Export**: Combine everything into a downloadable PDF

### Key Features

- **Iterative Editing**: Users can provide feedback on any section (characters, plot points, pages) and regenerate with changes
- **Age-Appropriate Content**: Supports ages 3-5 (simple vocabulary) and 5-8 (more complex narrative)
- **Configurable**: Page count, tone keywords, art style, text composition mode

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, MobX 6, Emotion (CSS-in-JS), TypeScript, Vite |
| Backend | Express.js, TypeScript |
| Text AI | Claude Opus 4.5 via `@anthropic-ai/sdk` |
| Image AI | Gemini via `@google/genai` |
| PDF | pdf-lib |
| Testing | Jest |

## Project Structure

```
storybook-generator/
├── packages/
│   ├── shared/           # Shared TypeScript types
│   │   └── src/types/
│   │       ├── project.ts      # Project, ProjectSettings, Stage types
│   │       ├── outline.ts      # Outline, Character, PlotPoint, Setting
│   │       ├── manuscript.ts   # Manuscript, ManuscriptPage
│   │       ├── generation.ts   # PageImage, generation request/response types
│   │       └── index.ts        # Barrel export
│   │
│   ├── server/           # Express backend
│   │   └── src/
│   │       ├── index.ts        # Entry point
│   │       ├── app.ts          # Express app setup
│   │       ├── config/         # Environment configuration
│   │       ├── routes/         # API route handlers
│   │       ├── services/       # Business logic (outline, manuscript, illustration, export)
│   │       ├── adapters/       # External integrations (Claude, Gemini, filesystem)
│   │       └── prompts/        # AI prompt templates
│   │
│   └── client/           # React frontend
│       └── src/
│           ├── main.tsx        # React entry point
│           ├── App.tsx         # Main app with wizard stepper
│           ├── stores/         # MobX state management
│           │   ├── RootStore.tsx     # Root store with context provider
│           │   ├── ProjectStore.ts   # Current project state
│           │   ├── UIStore.ts        # Wizard navigation state
│           │   ├── GenerationStore.ts # Generation progress/status
│           │   └── EditStore.ts      # Pending edit feedback tracking
│           ├── components/     # React components
│           │   ├── TopicInput.tsx        # Step 1: Enter topic
│           │   ├── OutlineView.tsx       # Step 2: View/edit outline
│           │   ├── ManuscriptView.tsx    # Step 3: View/edit manuscript
│           │   ├── IllustrationsExport.tsx # Step 4: View images, export PDF
│           │   └── EditableSection.tsx   # Reusable edit feedback wrapper
│           ├── api/            # API client
│           │   └── client.ts   # HTTP functions for all endpoints
│           └── styles/
│               └── global.css  # CSS variables, global styles
│
├── package.json          # Monorepo root with workspaces
├── tsconfig.json         # Base TypeScript config
└── .env                  # API keys (ANTHROPIC_API_KEY, GOOGLE_AI_API_KEY)
```

## Data Models

### Project

The central data structure representing a storybook project:

```typescript
interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  settings: ProjectSettings;
  currentStage: 'outline' | 'manuscript' | 'illustrations' | 'export';

  // Stage outputs (populated as user progresses)
  outline: Outline | null;
  manuscript: Manuscript | null;
  pageImages: PageImage[];
}

interface ProjectSettings {
  targetAge: '3-5' | '5-8';
  targetPageCount: number;           // 8, 12, 16, or 24
  aspectRatio: '1:1' | '3:4' | '4:3' | '2:3' | '3:2';
  toneKeywords: string[];            // e.g., ['whimsical', 'adventurous']
  artStyleKeywords: string[];        // e.g., ['watercolor', 'soft']
  textCompositionMode: 'ai-baked' | 'ai-overlay' | 'manual' | 'none';
  textModel: string;                 // e.g., 'claude-opus-4-5'
  imageModel: string;                // e.g., 'gemini-2.5-flash'
}
```

### Outline

Generated from the topic, contains story structure:

```typescript
interface Outline {
  title: string;
  subtitle?: string;
  synopsis: string;                  // 2-3 sentence summary
  theme: string;                     // Core message
  characters: Character[];
  setting: Setting;
  plotPoints: PlotPoint[];
}

interface Character {
  id: string;                        // e.g., 'char-1'
  name: string;
  role: 'protagonist' | 'supporting' | 'antagonist';
  description: string;               // Personality, motivation
  physicalDescription: string;       // Visual appearance for illustrations
}

interface PlotPoint {
  id: string;                        // e.g., 'plot-1'
  order: number;
  title: string;
  description: string;
  characters: string[];              // Character IDs involved
}
```

### Manuscript

Page-by-page content with text and illustration descriptions:

```typescript
interface Manuscript {
  pages: ManuscriptPage[];
}

interface ManuscriptPage {
  pageNumber: number;
  text: string | null;               // Text appearing on the page
  textPlacement: 'top' | 'bottom' | 'overlay' | 'integrated' | 'none';
  illustrationDescription: string;   // Detailed prompt for image generation
  characters: string[];              // Character IDs (references outline)
  mood: string;                      // Emotional tone
  action: string;                    // What's happening
}
```

### PageImage

Generated illustration for a page:

```typescript
interface PageImage {
  pageNumber: number;
  imagePath: string;                 // Filesystem path
  hasTextBaked: boolean;             // Whether text was rendered into image
  bakedText?: string;
  prompt: string;                    // The prompt used
  generatedAt: string;
  modelUsed: string;
  aspectRatio: AspectRatio;
}
```

## API Endpoints

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create new project |
| GET | `/api/projects/:id` | Get project by ID |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |

### Generation
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/generate/outline` | Generate outline from topic |
| POST | `/api/generate/outline/refine` | Refine outline with feedback |
| POST | `/api/generate/manuscript` | Generate manuscript from outline |
| POST | `/api/generate/manuscript/refine` | Refine manuscript with feedback |
| POST | `/api/generate/page/:pageNumber` | Generate single page illustration |
| POST | `/api/generate/all-pages` | Generate all page illustrations |

### Export
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/export/:projectId/pdf` | Generate PDF |
| GET | `/api/export/:projectId/exports/:exportId` | Download PDF |

### Images
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/images/:projectId/:category/:imageId` | Get image file |

## Architecture Patterns

### Adapter Pattern

External services are abstracted behind interfaces:

```typescript
// Text generation (Claude)
interface ITextGenerationAdapter {
  generateText(systemPrompt: string, userPrompt: string, options?: TextGenOptions): Promise<string>;
  generateStructured<T>(systemPrompt: string, userPrompt: string, options?: TextGenOptions): Promise<T>;
}

// Image generation (Gemini)
interface IImageGenerationAdapter {
  generateImage(prompt: string, options: ImageGenOptions): Promise<GeneratedImage>;
}

// Storage (filesystem, could be S3/DB)
interface IStorageAdapter {
  createProject(projectId: string, metadata: ProjectMetadata): Promise<void>;
  loadProject(projectId: string): Promise<Project>;
  saveProject(project: Project): Promise<void>;
  saveImage(projectId: string, category: ImageCategory, imageId: string, buffer: Buffer): Promise<string>;
  // ...
}
```

### MobX State Management

Frontend uses MobX with a root store pattern:

```typescript
class RootStore {
  projectStore: ProjectStore;    // Current project, project list
  uiStore: UIStore;              // Wizard step, UI state
  generationStore: GenerationStore;  // Generation progress, API calls
  editStore: EditStore;          // Pending feedback for refinement
}

// Access via hooks
const projectStore = useProjectStore();
const editStore = useEditStore();
```

### Iterative Editing Flow

1. User hovers over a section (character, plot point, page) and clicks "Edit"
2. User enters feedback describing desired changes
3. Feedback is stored in `EditStore` (can accumulate multiple edits)
4. User clicks "Apply Changes" which calls refine endpoint
5. AI regenerates content incorporating all feedback
6. Updated content replaces previous version

## Prompt Engineering

Prompts are in `packages/server/src/prompts/`:

- **Outline prompts**: Generate story structure with specific JSON schema
- **Manuscript prompts**: Expand outline into pages with illustration descriptions
- **Illustration prompts**: Build image generation prompts from manuscript pages
- **Refine prompts**: Include current content + user feedback for iteration

All AI responses use structured output (JSON) with explicit schemas.

## Development

### Prerequisites
- Node.js 18+
- npm 9+
- Anthropic API key
- Google AI API key

### Setup

```bash
# Install dependencies
npm install

# Create .env file in project root
echo "ANTHROPIC_API_KEY=your-key-here" >> .env
echo "GOOGLE_AI_API_KEY=your-key-here" >> .env

# Build shared types
npm run build --workspace=packages/shared

# Run development servers
npm run dev
```

### Available Scripts

```bash
npm run dev           # Run both server and client
npm run dev:server    # Run server only (port 3001)
npm run dev:client    # Run client only (port 3000)
npm run build         # Build all packages
npm run test          # Run tests
```

### Project Data Storage

Projects are stored as JSON files in the filesystem:

```
projects/
└── {project-id}/
    ├── project.json          # Project metadata and content
    └── images/
        ├── pages/            # Generated page illustrations
        ├── composed/         # Pages with text overlaid
        └── references/       # User-uploaded reference images
```

## Key Files Reference

| File | Purpose |
|------|---------|
| `shared/src/types/index.ts` | All TypeScript interfaces |
| `server/src/app.ts` | Express app configuration |
| `server/src/services/outline.service.ts` | Outline generation logic |
| `server/src/services/manuscript.service.ts` | Manuscript generation logic |
| `server/src/services/illustration.service.ts` | Image generation logic |
| `server/src/adapters/text-generation/claude.adapter.ts` | Claude API integration |
| `server/src/adapters/image-generation/gemini.adapter.ts` | Gemini API integration |
| `client/src/stores/RootStore.tsx` | MobX store setup and hooks |
| `client/src/components/OutlineView.tsx` | Outline display with editing |
| `client/src/components/ManuscriptView.tsx` | Manuscript display with editing |

## Future Enhancements

The architecture supports:
- **Character sheets**: Generate consistent character reference images
- **Style references**: Upload images to guide art style
- **Multi-turn editing**: Iterative refinement of individual images
- **Database storage**: Replace filesystem adapter with PostgreSQL/MongoDB
- **Cloud storage**: Replace local images with S3/GCS
- **Real-time collaboration**: WebSocket-based multi-user editing
