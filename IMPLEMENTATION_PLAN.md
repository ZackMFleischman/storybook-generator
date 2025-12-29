# Implementation Plan: Storybook Generator Enhancements

## Overview

This plan covers three major feature enhancements to the storybook generator:

1. **Direct Text Editing** - Allow manual editing of text content in addition to AI-powered suggestions - **COMPLETED**
2. **Illustration Feedback & Iteration** - Add feedback/refinement support to the illustrations page
3. **Art Style & Character Reference Images** - Define art style early and generate character reference images

---

## Feature 1: Direct Text Editing - COMPLETED

### Implementation Summary

Dual-mode editing has been implemented in the `EditableSection` component, allowing users to either:
- **Manual Edit**: Directly edit text content and save immediately to the server
- **AI Suggestions**: Describe desired changes for AI-powered regeneration

### What Was Implemented

#### EditableSection Component
**File:** `packages/client/src/components/EditableSection.tsx`

- Added toggle between "Manual Edit" and "AI Suggestions" modes
- Manual Edit mode shows content in an editable input/textarea
- Clicking "Save Changes" in Manual Edit mode saves immediately to server
- AI Suggestions mode works as before (queue feedback, apply via floating bar)
- New props: `editableContent`, `onContentChange`, `contentType`

#### ProjectStore
**File:** `packages/client/src/stores/ProjectStore.ts`

Added methods that update and immediately save to server:
- `updateOutlineField()` - Update any outline field (title, synopsis, etc.)
- `updateCharacter()` - Update a specific character
- `updatePlotPoint()` - Update a specific plot point
- `updateSetting()` - Update setting fields
- `updateManuscriptPage()` - Update a manuscript page
- `saveProject()` - Persist changes via `PUT /api/projects/:id`

#### OutlineView & ManuscriptView
**Files:** `packages/client/src/components/OutlineView.tsx`, `ManuscriptView.tsx`

- Each EditableSection now receives `editableContent` and `onContentChange` props
- Editable fields: title, synopsis, cover descriptions, character descriptions, plot point descriptions, setting location, page text
- Floating bar only appears for AI suggestions (manual edits save immediately)

---

## Feature 2: Gemini Session & Image Reference Architecture

### Current State
- `gemini.adapter.ts` uses simple `generateContent()` calls with text-only prompts
- No support for multi-turn chat sessions
- No support for passing reference images (despite `supportsReferences: true`)
- Each image generation is independent - no visual continuity between pages
- Character consistency relies entirely on text descriptions

### Why This Matters
The Gemini API documentation strongly recommends multi-turn chat for storybook generation:
- Maintains style and character memory across pages
- Reduces prompt repetition
- Dramatically improves visual consistency
- Enables image-to-image refinement

### Proposed Changes

#### 2.1 Extend Image Generation Interface
**File:** `packages/server/src/adapters/image-generation/image-generation.interface.ts`

Add session-based generation methods:

```typescript
interface IImageGenerationAdapter {
  // EXISTING
  generateImage(prompt: string, options: ImageGenOptions): Promise<GeneratedImage>;
  getModelInfo(): ImageModelInfo;
  getSupportedAspectRatios(): AspectRatio[];

  // NEW: Session-based generation
  createSession(projectId: string): Promise<string>;  // Returns sessionId
  generateWithReferences(
    sessionId: string,
    prompt: string,
    referenceImages: ReferenceImage[],
    options: ImageGenOptions
  ): Promise<GeneratedImage>;
  closeSession(sessionId: string): void;
}
```

#### 2.2 Add Reference Image Types & Generation Metadata
**File:** `packages/shared/src/types/generation.ts`

```typescript
export interface ReferenceImage {
  type: 'character' | 'previous-page' | 'style';
  label: string;        // e.g., "Luna the rabbit", "Page 3"
  buffer: Buffer;       // Image data (not stored, used at generation time)
  mimeType: string;     // e.g., "image/png"
}

export interface SessionInfo {
  sessionId: string;
  projectId: string;
  createdAt: string;
  lastUsed: string;
}

// NEW: Detailed metadata stored with each generated image for introspection
export interface GenerationMetadata {
  sessionId: string;
  prompt: string;                    // Full prompt sent to Gemini
  referenceImages: ReferenceImageInfo[];  // What refs were passed (without buffer)
  modelUsed: string;
  generatedAt: string;
  generationTimeMs: number;
  aspectRatio: AspectRatio;
  messageIndex?: number;             // Position in chat session (1 = first, etc.)
}

// Reference info without the actual buffer (for storage/display)
export interface ReferenceImageInfo {
  type: 'character' | 'previous-page' | 'style';
  label: string;
  sourcePath?: string;               // Path to the reference image file
}
```

#### 2.3 Update PageImage to Include Generation Metadata
**File:** `packages/shared/src/types/generation.ts`

Update PageImage to store the full generation context:

```typescript
export interface PageImage {
  pageNumber: number;
  imagePath: string;
  hasTextBaked: boolean;
  bakedText?: string;
  prompt: string;
  generatedAt: string;
  modelUsed: string;
  aspectRatio: AspectRatio;
  imageType?: 'page' | 'cover' | 'back-cover';

  // NEW: Full generation metadata for introspection
  generationMetadata?: GenerationMetadata;
}
```

#### 2.4 Implement Session Support in Gemini Adapter
**File:** `packages/server/src/adapters/image-generation/gemini.adapter.ts`

Major refactor to support sessions:

```typescript
export class GeminiAdapter implements IImageGenerationAdapter {
  private client: GoogleGenAI;
  private modelId: string;
  private sessions: Map<string, Chat> = new Map();  // NEW: Session storage

  // NEW: Create a chat session for a project
  async createSession(projectId: string): Promise<string> {
    const sessionId = `session-${projectId}-${Date.now()}`;

    const chat = this.client.chats.create({
      model: this.modelId,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    this.sessions.set(sessionId, chat);
    return sessionId;
  }

  // NEW: Generate image with reference images in context
  async generateWithReferences(
    sessionId: string,
    prompt: string,
    referenceImages: ReferenceImage[],
    options: ImageGenOptions
  ): Promise<GeneratedImage> {
    const chat = this.sessions.get(sessionId);
    if (!chat) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Build multi-part content with text and images
    const parts: Part[] = [
      { text: prompt }
    ];

    // Add reference images as inline data
    for (const ref of referenceImages) {
      parts.push({
        text: `[Reference: ${ref.label}]`
      });
      parts.push({
        inlineData: {
          mimeType: ref.mimeType,
          data: ref.buffer.toString('base64'),
        }
      });
    }

    const response = await chat.sendMessage({ message: parts });

    // Extract image from response (same as existing logic)
    const part = response.candidates?.[0]?.content?.parts?.find(
      p => 'inlineData' in p
    );

    if (!part || !('inlineData' in part) || !part.inlineData) {
      throw new Error('No image generated in response');
    }

    return {
      buffer: Buffer.from(part.inlineData.data!, 'base64'),
      mimeType: part.inlineData.mimeType || 'image/png',
      metadata: {
        model: this.modelId,
        aspectRatio: options.aspectRatio,
        generationTime: 0,
      },
    };
  }

  // NEW: Clean up session
  closeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  // EXISTING: Keep for simple single-image generation
  async generateImage(prompt: string, options: ImageGenOptions): Promise<GeneratedImage> {
    // ... existing implementation unchanged ...
  }
}
```

#### 2.5 Update Illustration Service for Sequential Generation
**File:** `packages/server/src/services/illustration.service.ts`

Change from parallel to sequential generation with context:

```typescript
class IllustrationService {
  async generateAllPages(
    projectId: string,
    manuscript: Manuscript,
    outline: Outline,
    settings: ProjectSettings,
    characterImages?: CharacterImage[]  // NEW: Pass character refs
  ): Promise<PageImage[]> {
    const results: PageImage[] = [];

    // Create session for this generation run
    const sessionId = await this.imageAdapter.createSession(projectId);

    try {
      // Load character reference images
      const charRefs = await this.loadCharacterReferences(projectId, characterImages);

      // Generate pages SEQUENTIALLY (not parallel)
      for (const page of manuscript.pages) {
        // Build reference images array
        const references: ReferenceImage[] = [...charRefs];

        // Add previous page as reference (if exists)
        if (results.length > 0) {
          const prevPage = results[results.length - 1];
          const prevBuffer = await this.storage.loadImage(prevPage.imagePath);
          references.push({
            type: 'previous-page',
            label: `Page ${prevPage.pageNumber}`,
            buffer: prevBuffer,
            mimeType: 'image/png',
          });
        }

        // Limit to 3 references max (Gemini recommendation)
        const limitedRefs = references.slice(0, 3);

        const prompt = getIllustrationPrompt({
          page,
          characters: outline.characters,
          setting: outline.setting,
          targetAge: settings.targetAge,
          artStyleKeywords: settings.artStyleKeywords,
        });

        const result = await this.imageAdapter.generateWithReferences(
          sessionId,
          prompt,
          limitedRefs,
          { aspectRatio: settings.aspectRatio }
        );

        // Save image and create PageImage record
        const imagePath = await this.storage.saveImage(
          projectId,
          'pages',
          `page-${page.pageNumber}`,
          result.buffer
        );

        results.push({
          pageNumber: page.pageNumber,
          imagePath,
          hasTextBaked: false,
          prompt,
          generatedAt: new Date().toISOString(),
          modelUsed: this.imageAdapter.getModelInfo().id,
          aspectRatio: settings.aspectRatio,
          imageType: 'page',
        });
      }

      return results;
    } finally {
      // Clean up session
      this.imageAdapter.closeSession(sessionId);
    }
  }

  private async loadCharacterReferences(
    projectId: string,
    characterImages?: CharacterImage[]
  ): Promise<ReferenceImage[]> {
    if (!characterImages || characterImages.length === 0) {
      return [];
    }

    const refs: ReferenceImage[] = [];

    // Load up to 2 main character images
    for (const charImg of characterImages.slice(0, 2)) {
      const buffer = await this.storage.loadImage(charImg.imagePath);
      refs.push({
        type: 'character',
        label: charImg.characterId,  // Will be enhanced with name later
        buffer,
        mimeType: 'image/png',
      });
    }

    return refs;
  }
}
```

#### 2.6 Update Cover Generation to Use Sessions
**File:** `packages/server/src/services/illustration.service.ts`

Covers can share session with pages for style consistency:

```typescript
async generateAllWithCovers(
  projectId: string,
  manuscript: Manuscript,
  outline: Outline,
  settings: ProjectSettings,
  characterImages?: CharacterImage[]
): Promise<{
  cover: PageImage;
  pages: PageImage[];
  backCover: PageImage;
}> {
  const sessionId = await this.imageAdapter.createSession(projectId);

  try {
    const charRefs = await this.loadCharacterReferences(projectId, characterImages);

    // 1. Generate front cover FIRST (establishes style)
    const cover = await this.generateCoverWithSession(
      sessionId, projectId, outline, settings, charRefs
    );

    // 2. Generate pages sequentially
    const pages = await this.generatePagesWithSession(
      sessionId, projectId, manuscript, outline, settings, charRefs, cover
    );

    // 3. Generate back cover last
    const backCover = await this.generateBackCoverWithSession(
      sessionId, projectId, outline, settings, charRefs
    );

    return { cover, pages, backCover };
  } finally {
    this.imageAdapter.closeSession(sessionId);
  }
}
```

#### 2.7 Add Generation Introspection UI Component
**File:** `packages/client/src/components/GenerationInfoModal.tsx` (NEW)

Add an info button to each illustration that shows exactly what inputs generated it:

```typescript
interface GenerationInfoModalProps {
  pageImage: PageImage;
  isOpen: boolean;
  onClose: () => void;
}

export const GenerationInfoModal: React.FC<GenerationInfoModalProps> = ({
  pageImage,
  isOpen,
  onClose
}) => {
  const metadata = pageImage.generationMetadata;

  if (!metadata) {
    return <Modal>No generation metadata available</Modal>;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader>Generation Details</ModalHeader>
      <ModalBody>
        <Section title="Session">
          <InfoRow label="Session ID" value={metadata.sessionId} />
          <InfoRow label="Message #" value={metadata.messageIndex || 'N/A'} />
        </Section>

        <Section title="Model">
          <InfoRow label="Model" value={metadata.modelUsed} />
          <InfoRow label="Aspect Ratio" value={metadata.aspectRatio} />
          <InfoRow label="Generation Time" value={`${metadata.generationTimeMs}ms`} />
        </Section>

        <Section title="Reference Images">
          {metadata.referenceImages.length === 0 ? (
            <EmptyState>No reference images used</EmptyState>
          ) : (
            metadata.referenceImages.map((ref, i) => (
              <ReferenceCard key={i}>
                <Tag>{ref.type}</Tag>
                <Label>{ref.label}</Label>
                {ref.sourcePath && <Thumbnail src={ref.sourcePath} />}
              </ReferenceCard>
            ))
          )}
        </Section>

        <Section title="Prompt">
          <PromptDisplay>{metadata.prompt}</PromptDisplay>
        </Section>
      </ModalBody>
    </Modal>
  );
};
```

**UI Integration in IllustrationsExport.tsx:**

Each image card gets an info button:

```
┌─────────────────────────────────────┐
│     PAGE 3                    [ℹ️] [Edit] │
│     [Image]                              │
│     Text: "Luna hopped through..."       │
│     Prompt: "A small gray rabbit..."     │
└─────────────────────────────────────┘
         │
         ▼ (click info icon)
┌─────────────────────────────────────┐
│ Generation Details              [×] │
├─────────────────────────────────────┤
│ SESSION                             │
│   Session ID: session-abc-12345     │
│   Message #: 4 (of 8)               │
│                                     │
│ MODEL                               │
│   Model: gemini-2.5-flash           │
│   Aspect Ratio: 3:4                 │
│   Generation Time: 3420ms           │
│                                     │
│ REFERENCE IMAGES                    │
│   ┌────┐ ┌────┐                     │
│   │char│ │prev│                     │
│   │Luna│ │pg 2│                     │
│   └────┘ └────┘                     │
│                                     │
│ PROMPT                              │
│ ┌─────────────────────────────────┐ │
│ │ Create a children's book        │ │
│ │ illustration showing Luna...    │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Implementation Order

1. Add `ReferenceImage`, `GenerationMetadata`, `ReferenceImageInfo` types to shared package
2. Update `PageImage` to include optional `generationMetadata` field
3. Extend `IImageGenerationAdapter` interface with session methods
4. Implement session methods in `GeminiAdapter`
5. Add `loadImage` method to storage adapter (if not exists)
6. Refactor `IllustrationService.generateAllPages()` to sequential + populate metadata
7. Update cover generation to use sessions
8. Create `GenerationInfoModal.tsx` component
9. Add info button to `IllustrationsExport.tsx` for each image
10. Test end-to-end with a full book generation

### Success Criteria

- [ ] Sessions can be created and stored in memory
- [ ] Reference images are correctly encoded as base64 inline data
- [ ] Pages generate sequentially, each receiving previous page as context
- [ ] Character references are passed to each page generation
- [ ] Sessions are properly cleaned up after generation
- [ ] Fallback works if session methods fail (use existing `generateImage`)
- [ ] GenerationMetadata is populated and stored with each PageImage
- [ ] Info modal shows session ID, message index, references, and full prompt

### Testing Notes

- Generate a 4-page book and verify character appearance is consistent across pages
- Compare results with and without session-based generation
- Monitor memory usage with multiple active sessions
- Test session cleanup on errors/timeouts
- Click info icon on each page and verify metadata displays correctly
- Verify reference image thumbnails load in the modal

---

## Feature 3: Illustration Feedback & Iteration

### Current State
- `IllustrationsExport.tsx` is read-only
- No way to provide feedback on generated images
- No way to regenerate individual images
- No batch regeneration with feedback

### Proposed Changes

#### 2.1 Add Illustration Feedback to EditStore
**File:** `packages/client/src/stores/EditStore.ts`

Add illustration feedback tracking:

```typescript
class EditStore {
  // EXISTING
  outlineFeedback: OutlineFeedback;
  manuscriptFeedback: ManuscriptFeedback;

  // NEW: Illustration feedback
  illustrationFeedback: IllustrationFeedback;
}

interface IllustrationFeedback {
  cover?: string;              // Feedback for front cover
  backCover?: string;          // Feedback for back cover
  pages: Map<number, string>;  // Feedback per page number
}
```

**New Methods:**
```typescript
// Setters
setCoverFeedback(feedback: string): void;
setBackCoverFeedback(feedback: string): void;
setPageIllustrationFeedback(pageNumber: number, feedback: string): void;

// Getters
get hasIllustrationFeedback(): boolean;
get illustrationFeedbackCount(): number;

// Actions
clearIllustrationFeedback(): void;
applyIllustrationFeedback(): Promise<void>;  // Batch apply
applySingleIllustrationFeedback(pageNumber: number | 'cover' | 'back-cover'): Promise<void>;
```

#### 2.2 Update IllustrationsExport Component
**File:** `packages/client/src/components/IllustrationsExport.tsx`

Transform from read-only gallery to editable view:

**UI Changes:**
1. Wrap each image in `EditableSection` component
2. Show feedback input when editing
3. Add floating action bar (like OutlineView/ManuscriptView) when feedback pending
4. Add individual "Regenerate" button per image
5. Add "Apply All Changes" button for batch regeneration

**Layout:**
```
┌─────────────────────────────────────────┐
│ [Back]  Illustrations         [Export]  │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     FRONT COVER               [Edit] │
│  │     [Image]                        │ │
│  │     Title: "The Curious Rabbit"    │ │
│  │     Prompt: "A colorful..."        │ │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     PAGE 1                    [Edit] │
│  │     [Image]                        │ │
│  │     Text: "Once upon a time..."    │ │
│  │     Prompt: "A small rabbit..."    │ │
│  └─────────────────────────────────┘   │
│                                         │
│  ... more pages ...                     │
│                                         │
├─────────────────────────────────────────┤
│ 3 pending edits  [Clear All] [Apply]    │ <- Floating bar
└─────────────────────────────────────────┘
```

**Implementation Steps:**
1. Import and use `useEditStore()` hook
2. Wrap each image card in `EditableSection`
3. Show image details (prompt used, page text) alongside image
4. Add floating action bar component (extract from OutlineView as shared)
5. Connect to new EditStore illustration methods

#### 2.3 Add Illustration Refinement API Endpoint
**File:** `packages/server/src/routes/generation.ts`

Add new endpoint:

```typescript
// Refine single illustration
POST /api/generate/illustration/refine
Request: {
  projectId: string;
  target: 'cover' | 'back-cover' | number;  // Page number or cover type
  feedback: string;
}
Response: PageImage

// Batch refine illustrations
POST /api/generate/illustrations/refine
Request: {
  projectId: string;
  feedback: IllustrationFeedback;
}
Response: {
  cover?: PageImage;
  backCover?: PageImage;
  pages: PageImage[];
}
```

#### 2.4 Add Illustration Refinement Service
**File:** `packages/server/src/services/illustration.service.ts`

Add refinement methods:

```typescript
class IllustrationService {
  // EXISTING
  generatePage(...): Promise<PageImage>;
  generateCover(...): Promise<PageImage>;
  generateBackCover(...): Promise<PageImage>;
  generateAllPages(...): Promise<PageImage[]>;

  // NEW: Refinement methods
  async refinePageIllustration(
    projectId: string,
    pageNumber: number,
    feedback: string
  ): Promise<PageImage>;

  async refineCover(
    projectId: string,
    coverType: 'cover' | 'back-cover',
    feedback: string
  ): Promise<PageImage>;

  async refineAllIllustrations(
    projectId: string,
    feedback: IllustrationFeedback
  ): Promise<IllustrationRefinementResult>;
}
```

**Refinement Logic:**
1. Load existing image metadata (prompt, page context)
2. Construct new prompt incorporating:
   - Original illustration description from manuscript
   - Original prompt that was used
   - User's refinement feedback
   - Character descriptions (for consistency)
   - Art style keywords
3. Generate new image
4. Replace old image in storage
5. Update project with new PageImage metadata

#### 2.5 Add Illustration Refinement Prompts
**File:** `packages/server/src/prompts/illustration.prompts.ts`

Add new function:

```typescript
function getIllustrationRefinePrompt(context: {
  originalPrompt: string;
  illustrationDescription: string;
  pageText?: string;
  feedback: string;
  characters: Character[];
  artStyleKeywords: string[];
}): string;
```

**Prompt Template:**
```
You are refining an existing children's book illustration.

ORIGINAL ILLUSTRATION DESCRIPTION:
${illustrationDescription}

ORIGINAL PROMPT USED:
${originalPrompt}

${pageText ? `TEXT ON THIS PAGE: "${pageText}"` : ''}

USER FEEDBACK FOR REFINEMENT:
${feedback}

${characterDescriptions}

Art Style: ${artStyleKeywords.join(', ')}

Create a refined version of this illustration that addresses the user's feedback while maintaining consistency with the established art style and character designs.
```

#### 2.6 Update API Client
**File:** `packages/client/src/api/client.ts`

Add new API functions:

```typescript
// Single illustration refinement
export async function refineIllustration(data: {
  projectId: string;
  target: 'cover' | 'back-cover' | number;
  feedback: string;
}): Promise<PageImage>;

// Batch illustration refinement
export async function refineAllIllustrations(data: {
  projectId: string;
  feedback: IllustrationFeedback;
}): Promise<IllustrationRefinementResult>;
```

#### 2.7 Update Shared Types
**File:** `packages/shared/src/types/generation.ts`

Add new types:

```typescript
export interface IllustrationFeedback {
  cover?: string;
  backCover?: string;
  pages: Record<number, string>;
}

export interface RefineIllustrationRequest {
  projectId: string;
  target: 'cover' | 'back-cover' | number;
  feedback: string;
}

export interface RefineAllIllustrationsRequest {
  projectId: string;
  feedback: IllustrationFeedback;
}

export interface IllustrationRefinementResult {
  cover?: PageImage;
  backCover?: PageImage;
  pages: PageImage[];
}
```

---

## Feature 4: Art Style & Character Reference Images

### Current State
- `artStyleKeywords` exist in ProjectSettings but are not configurable in UI
- Characters have `physicalDescription` but no reference images
- Character consistency relies entirely on text descriptions

### Proposed Changes

#### 4.1 Add Art Style Selection to TopicInput
**File:** `packages/client/src/components/TopicInput.tsx`

Add art style configuration to the initial page:

**UI Addition:**
```
┌─────────────────────────────────────────┐
│ Create Your Storybook                   │
├─────────────────────────────────────────┤
│ What's your story about?                │
│ ┌─────────────────────────────────────┐ │
│ │ A curious rabbit who learns to...   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Target Age:  [3-5 years ▼]              │
│ Page Count:  [12 pages ▼]               │
│                                         │
│ Art Style:   [Watercolor ▼]             │  <- NEW
│              ○ Watercolor (soft, dreamy)│
│              ○ Digital cartoon (bright) │
│              ○ Colored pencil (warm)    │
│              ○ Flat vector (modern)     │
│              ○ Custom...                │
│                                         │
│ [Additional style keywords...]          │  <- NEW (optional)
│                                         │
│           [Generate Outline]            │
└─────────────────────────────────────────┘
```

**Implementation Steps:**
1. Add `artStyle` state with preset options
2. Add optional `customStyleKeywords` textarea
3. Update form submission to include art style in settings
4. Store in ProjectSettings via GenerationStore

**Preset Art Styles:**
```typescript
const ART_STYLE_PRESETS = {
  'watercolor': ['watercolor', 'soft edges', 'dreamy', 'gentle colors'],
  'digital-cartoon': ['digital illustration', 'bright colors', 'clean lines', 'playful'],
  'colored-pencil': ['colored pencil', 'textured', 'warm tones', 'hand-drawn feel'],
  'flat-vector': ['flat design', 'vector illustration', 'bold colors', 'minimal shading'],
  'storybook-classic': ['classic storybook', 'painterly', 'detailed backgrounds', 'nostalgic'],
};
```

#### 4.2 Update Outline Generation to Create Character Images
**File:** `packages/server/src/services/outline.service.ts`

After generating the outline, automatically generate character reference images:

```typescript
async generateOutline(request: GenerateOutlineRequest): Promise<Outline> {
  // EXISTING: Generate outline via Claude
  const outline = await this.textAdapter.generateStructured<Outline>(...);

  // NEW: Generate character reference images
  const characterImages = await this.generateCharacterReferences(
    request.projectId,
    outline.characters,
    project.settings.artStyleKeywords
  );

  // NEW: Store character image references
  project.characterImages = characterImages;

  // Save and return
  await this.storage.saveProject(project);
  return outline;
}

private async generateCharacterReferences(
  projectId: string,
  characters: Character[],
  artStyleKeywords: string[]
): Promise<CharacterImage[]> {
  const images: CharacterImage[] = [];

  for (const character of characters) {
    const prompt = getCharacterReferencePrompt(character, artStyleKeywords);
    const result = await this.imageAdapter.generateImage(prompt, { aspectRatio: '1:1' });

    const imagePath = await this.storage.saveImage(
      projectId,
      'references',
      `char-${character.id}`,
      result.imageBuffer
    );

    images.push({
      characterId: character.id,
      imagePath,
      prompt,
      generatedAt: new Date().toISOString(),
    });
  }

  return images;
}
```

#### 4.3 Add Character Reference Prompt Generator
**File:** `packages/server/src/prompts/illustration.prompts.ts`

Add new function:

```typescript
export function getCharacterReferencePrompt(
  character: Character,
  artStyleKeywords: string[]
): string {
  return `Create a character reference sheet for a children's book character.

CHARACTER NAME: ${character.name}
ROLE: ${character.role}

PHYSICAL DESCRIPTION:
${character.physicalDescription}

PERSONALITY (for expression guidance):
${character.description}

Art Style: ${artStyleKeywords.join(', ')}, suitable for a children's picture book

Requirements:
- Show the character in a neutral standing pose
- Clear view of face, body, and clothing
- Simple, uncluttered background (solid color or gradient)
- Character should fill most of the frame
- Consistent with children's book illustration style
- This image will be used as a reference for all other illustrations

DO NOT include:
- Multiple poses or views
- Text or labels
- Complex backgrounds
- Other characters`;
}
```

#### 4.4 Add Character Image Types
**File:** `packages/shared/src/types/outline.ts`

Add new type:

```typescript
export interface CharacterImage {
  characterId: string;
  imagePath: string;
  prompt: string;
  generatedAt: string;
  modelUsed?: string;
}
```

Update Character interface:
```typescript
export interface Character {
  id: string;
  name: string;
  role: 'protagonist' | 'supporting' | 'antagonist';
  description: string;
  physicalDescription: string;
  age?: string;
  // NEW
  referenceImagePath?: string;  // Path to character reference image
}
```

#### 4.5 Update Project Type
**File:** `packages/shared/src/types/project.ts`

Add character images to Project:

```typescript
export interface Project {
  // EXISTING
  id: string;
  name: string;
  settings: ProjectSettings;
  outline: Outline | null;
  manuscript: Manuscript | null;
  pageImages: PageImage[];
  coverImage: PageImage | null;
  backCoverImage: PageImage | null;

  // NEW
  characterImages: CharacterImage[];
}
```

#### 4.6 Update OutlineView to Display Character Images
**File:** `packages/client/src/components/OutlineView.tsx`

Update the Characters section to show reference images:

```
┌─────────────────────────────────────────┐
│ Characters                              │
├─────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────────────┐ │
│ │   [Image]   │ │ LUNA (Protagonist)  │ │
│ │             │ │                     │ │
│ │  [Regen]    │ │ A curious young     │ │
│ └─────────────┘ │ rabbit with soft    │ │
│                 │ gray fur...         │ │
│                 │                [Edit]│ │
│                 └─────────────────────┘ │
│                                         │
│ ┌─────────────┐ ┌─────────────────────┐ │
│ │   [Image]   │ │ OAK (Supporting)    │ │
│ │             │ │                     │ │
│ │  [Regen]    │ │ A wise old owl...   │ │
│ └─────────────┘ │                     │ │
│                 └─────────────────────┘ │
└─────────────────────────────────────────┘
```

**Implementation Steps:**
1. Fetch character images from project
2. Display image alongside character details
3. Add "Regenerate" button that opens feedback modal
4. On regenerate, call new API endpoint

#### 4.7 Add Character Image Regeneration
**File:** `packages/server/src/services/outline.service.ts`

Add regeneration method:

```typescript
async regenerateCharacterImage(
  projectId: string,
  characterId: string,
  feedback?: string
): Promise<CharacterImage> {
  const project = await this.storage.loadProject(projectId);
  const character = project.outline?.characters.find(c => c.id === characterId);

  if (!character) throw new Error('Character not found');

  // Build prompt with optional feedback
  let prompt = getCharacterReferencePrompt(character, project.settings.artStyleKeywords);

  if (feedback) {
    prompt += `\n\nADDITIONAL REFINEMENT INSTRUCTIONS:\n${feedback}`;
  }

  const result = await this.imageAdapter.generateImage(prompt, { aspectRatio: '1:1' });

  const imagePath = await this.storage.saveImage(
    projectId,
    'references',
    `char-${characterId}`,
    result.imageBuffer
  );

  // Update character images array
  const existingIndex = project.characterImages.findIndex(
    ci => ci.characterId === characterId
  );

  const newImage: CharacterImage = {
    characterId,
    imagePath,
    prompt,
    generatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    project.characterImages[existingIndex] = newImage;
  } else {
    project.characterImages.push(newImage);
  }

  await this.storage.saveProject(project);
  return newImage;
}
```

#### 4.8 Add Character Image API Endpoint
**File:** `packages/server/src/routes/generation.ts`

Add new endpoint:

```typescript
// Regenerate character reference image
POST /api/generate/character-image
Request: {
  projectId: string;
  characterId: string;
  feedback?: string;  // Optional refinement feedback
}
Response: CharacterImage
```

#### 4.9 Update API Client
**File:** `packages/client/src/api/client.ts`

Add new function:

```typescript
export async function regenerateCharacterImage(data: {
  projectId: string;
  characterId: string;
  feedback?: string;
}): Promise<CharacterImage>;
```

#### 4.10 Update Illustration Generation to Use Character References
**File:** `packages/server/src/prompts/illustration.prompts.ts`

Update `getIllustrationPrompt` to reference character images:

```typescript
export function getIllustrationPrompt(context: {
  page: ManuscriptPage;
  characters: Character[];
  setting: Setting;
  targetAge: TargetAge;
  artStyleKeywords: string[];
  characterImages?: CharacterImage[];  // NEW
  // ...
}): string {
  // ... existing prompt building ...

  // NEW: Add character image references
  if (context.characterImages && context.characterImages.length > 0) {
    prompt += `\n\nCHARACTER REFERENCE IMAGES ARE PROVIDED:
For each character appearing in this scene, reference images have been generated.
Ensure each character matches their reference image exactly in terms of:
- Physical proportions and body type
- Facial features and expression style
- Clothing colors and design
- Any distinctive accessories or markings`;
  }

  return prompt;
}
```

**Note:** The actual image references would need to be passed to the image generation adapter. This may require updates to the Gemini adapter to support reference images (which it claims to support via `supportsReferences: true`).

---

## Implementation Order

### Phase 1: Direct Text Editing - COMPLETED
1. ~~Update EditableSection component with dual-mode editing~~
2. ~~Update ProjectStore with direct update methods~~
3. ~~Update OutlineView to use direct editing~~
4. ~~Update ManuscriptView to use direct editing~~
5. ~~Test manual editing workflow~~

### Phase 2: Gemini Session & Image Reference Architecture (Foundation)
1. Add `ReferenceImage` and `SessionInfo` types to shared package
2. Extend `IImageGenerationAdapter` interface with session methods
3. Implement session methods in `GeminiAdapter` (createSession, generateWithReferences, closeSession)
4. Add `loadImage` method to storage adapter (if not exists)
5. Refactor `IllustrationService.generateAllPages()` to sequential with context
6. Update cover generation to use sessions
7. Test end-to-end with a full book generation

### Phase 3: Illustration Feedback & Iteration (Medium Complexity)
1. Add IllustrationFeedback to EditStore
2. Add illustration refinement types to shared package
3. Add illustration refinement service methods (using sessions)
4. Add illustration refinement API endpoints
5. Update IllustrationsExport component with editing
6. Add floating action bar to illustrations page
7. Test single and batch regeneration

### Phase 4: Art Style & Character Images (Highest Complexity)
1. Add art style selection to TopicInput
2. Add CharacterImage type and update Project type
3. Add character reference prompt generator
4. Update outline service to generate character images
5. Add character image regeneration endpoint
6. Update OutlineView to display character images
7. Wire character images into illustration generation (via Phase 2 infrastructure)
8. Test end-to-end character consistency

---

## Testing Checklist

### Direct Text Editing - COMPLETED
- [x] Can switch between AI suggestion and manual edit modes
- [x] Manual edits save immediately to server
- [x] Can use AI suggestions independently (floating bar appears)
- [x] Both modes available on all editable sections

### Gemini Session & Image Reference Architecture
- [ ] Sessions can be created and stored in memory
- [ ] Reference images correctly encoded as base64 inline data
- [ ] Pages generate sequentially with previous page as context
- [ ] Session cleanup works properly (manual close + timeout)
- [ ] Fallback to non-session generation if session fails
- [ ] Character consistency improved across pages (visual comparison)
- [ ] Memory usage acceptable with multiple sessions
- [ ] GenerationMetadata populated and stored with each PageImage
- [ ] Info icon (ℹ️) appears on each illustration card
- [ ] Info modal displays session ID and message index
- [ ] Info modal displays list of reference images used
- [ ] Info modal displays full prompt text
- [ ] Reference image thumbnails load correctly in modal

### Illustration Feedback
- [ ] Can provide feedback on individual page illustrations
- [ ] Can provide feedback on front cover
- [ ] Can provide feedback on back cover
- [ ] Feedback count shown correctly
- [ ] Single image regeneration works (uses session for consistency)
- [ ] Batch regeneration works
- [ ] Original image replaced on regeneration

### Art Style & Character Images
- [ ] Art style preset selection works
- [ ] Custom style keywords input works
- [ ] Character images generated with outline
- [ ] Character images displayed in OutlineView
- [ ] Single character image regeneration works
- [ ] Character image regeneration accepts feedback
- [ ] Page illustrations receive character images as references

---

## Files to Modify

| File | Changes | Phase | Status |
|------|---------|-------|--------|
| `client/src/components/EditableSection.tsx` | Add dual-mode editing | 1 | DONE |
| `client/src/components/OutlineView.tsx` | Direct editing + character images | 1,4 | DONE (direct editing) |
| `client/src/components/ManuscriptView.tsx` | Direct editing | 1 | DONE |
| `client/src/stores/ProjectStore.ts` | Add direct update methods | 1 | DONE |
| `server/src/adapters/image-generation/image-generation.interface.ts` | Add session methods | 2 | |
| `server/src/adapters/image-generation/gemini.adapter.ts` | Implement sessions + refs | 2 | |
| `server/src/adapters/storage/filesystem.adapter.ts` | Add loadImage method | 2 | |
| `server/src/services/illustration.service.ts` | Sequential generation + sessions | 2,3 | |
| `shared/src/types/generation.ts` | Add ReferenceImage, SessionInfo, GenerationMetadata | 2 | |
| `client/src/components/IllustrationsExport.tsx` | Add feedback/iteration + debug info | 3 | |
| `client/src/stores/EditStore.ts` | Add illustration feedback | 3 | |
| `client/src/api/client.ts` | Add new API functions | 3,4 | |
| `server/src/routes/generation.ts` | Add new endpoints | 3,4 | |
| `client/src/components/TopicInput.tsx` | Add art style selection | 4 | |
| `server/src/services/outline.service.ts` | Add character image generation | 4 | |
| `server/src/prompts/illustration.prompts.ts` | Add refinement + character prompts | 3,4 | |
| `shared/src/types/outline.ts` | Add CharacterImage type | 4 | |
| `shared/src/types/project.ts` | Add characterImages to Project | 4 | |

## New Files

| File | Purpose | Phase |
|------|---------|-------|
| `client/src/components/GenerationInfoModal.tsx` | Modal showing generation metadata (session, refs, prompt) | 2 |
| `client/src/components/FloatingActionBar.tsx` | Shared component for pending edits bar | 3 |
| `client/src/components/ArtStyleSelector.tsx` | Art style preset selector component | 4 |
| `client/src/components/CharacterCard.tsx` | Character display with image | 4 |
