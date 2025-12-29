# Implementation Plan: Storybook Generator Enhancements

## Overview

This plan covers three major feature enhancements to the storybook generator:

1. **Direct Text Editing** - Allow manual editing of text content in addition to AI-powered suggestions
2. **Illustration Feedback & Iteration** - Add feedback/refinement support to the illustrations page
3. **Art Style & Character Reference Images** - Define art style early and generate character reference images

---

## Feature 1: Direct Text Editing

### Current State
- Users can only provide AI suggestions via the `EditableSection` component
- Feedback is accumulated and then batch-applied via AI regeneration
- No way to directly modify text content without AI involvement

### Proposed Changes

#### 1.1 Update EditableSection Component
**File:** `packages/client/src/components/EditableSection.tsx`

Add a new "edit mode" that shows the actual content as editable text:

```typescript
interface EditableSectionProps {
  children: React.ReactNode;
  sectionLabel: string;
  feedback?: string;
  onFeedbackChange: (feedback: string) => void;
  // NEW PROPS:
  editableContent?: string;           // The actual text content to edit
  onContentChange?: (content: string) => void;  // Callback for direct edits
  contentType?: 'text' | 'textarea';  // Single line or multi-line
}
```

**UI Changes:**
- Add toggle between "AI Suggestions" mode and "Manual Edit" mode
- In Manual Edit mode, show the content in an editable input/textarea
- Save button applies direct changes immediately (no AI call)
- Both modes can coexist - user can manually edit AND add AI suggestions

**Implementation Steps:**
1. Add `editMode: 'ai' | 'manual'` state to track which editing mode is active
2. Add a segmented control/tabs to switch between modes
3. In manual mode, render content as editable field
4. On save in manual mode, call `onContentChange` directly
5. Style manual edit mode distinctly (different background color)

#### 1.2 Update OutlineView Component
**File:** `packages/client/src/components/OutlineView.tsx`

For each editable section, pass the actual content and a direct update handler:

| Section | Editable Fields |
|---------|-----------------|
| Title | `outline.title`, `outline.subtitle` |
| Synopsis | `outline.synopsis` |
| Theme | `outline.theme` |
| Cover Description | `outline.coverDescription` |
| Back Cover Description | `outline.backCoverDescription` |
| Back Cover Blurb | `outline.backCoverBlurb` |
| Setting | `setting.location`, `setting.timePeriod`, `setting.atmosphere` |
| Characters | `character.name`, `character.description`, `character.physicalDescription` |
| Plot Points | `plotPoint.title`, `plotPoint.description` |

**Implementation Steps:**
1. Create handlers for direct content updates (e.g., `handleTitleChange`, `handleSynopsisChange`)
2. These handlers update the project store directly without API calls
3. Pass both feedback handler AND content handler to each EditableSection
4. Mark project as "dirty" when manual edits are made

#### 1.3 Update ManuscriptView Component
**File:** `packages/client/src/components/ManuscriptView.tsx`

For each page, allow direct editing of:
- `page.text` - The story text
- `page.illustrationDescription` - The illustration prompt
- `page.mood` - Emotional tone
- `page.action` - What's happening

**Implementation Steps:**
1. Create handlers for page content updates
2. Pass content handlers to EditableSection for each field
3. Allow editing illustration descriptions (useful for fine-tuning image prompts)

#### 1.4 Update ProjectStore
**File:** `packages/client/src/stores/ProjectStore.ts`

Add methods for direct content updates:

```typescript
class ProjectStore {
  // NEW: Direct outline field updates
  updateOutlineField(field: keyof Outline, value: any): void;
  updateCharacter(characterId: string, updates: Partial<Character>): void;
  updatePlotPoint(plotPointId: string, updates: Partial<PlotPoint>): void;
  updateSetting(updates: Partial<Setting>): void;

  // NEW: Direct manuscript page updates
  updateManuscriptPage(pageNumber: number, updates: Partial<ManuscriptPage>): void;

  // NEW: Save changes to server
  saveProject(): Promise<void>;
}
```

**Implementation Steps:**
1. Add MobX actions for each update type
2. Implement `saveProject()` that calls `PUT /api/projects/:id`
3. Track dirty state to show "unsaved changes" indicator
4. Auto-save on navigation or with debouncing

#### 1.5 API Updates
**File:** `packages/server/src/routes/projects.ts`

The existing `PUT /api/projects/:id` endpoint should already support full project updates. Verify it handles partial updates correctly.

---

## Feature 2: Illustration Feedback & Iteration

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

## Feature 3: Art Style & Character Reference Images

### Current State
- `artStyleKeywords` exist in ProjectSettings but are not configurable in UI
- Characters have `physicalDescription` but no reference images
- Character consistency relies entirely on text descriptions

### Proposed Changes

#### 3.1 Add Art Style Selection to TopicInput
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

#### 3.2 Update Outline Generation to Create Character Images
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

#### 3.3 Add Character Reference Prompt Generator
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

#### 3.4 Add Character Image Types
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

#### 3.5 Update Project Type
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

#### 3.6 Update OutlineView to Display Character Images
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

#### 3.7 Add Character Image Regeneration
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

#### 3.8 Add Character Image API Endpoint
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

#### 3.9 Update API Client
**File:** `packages/client/src/api/client.ts`

Add new function:

```typescript
export async function regenerateCharacterImage(data: {
  projectId: string;
  characterId: string;
  feedback?: string;
}): Promise<CharacterImage>;
```

#### 3.10 Update Illustration Generation to Use Character References
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

### Phase 1: Direct Text Editing (Lowest Risk)
1. Update EditableSection component with dual-mode editing
2. Update ProjectStore with direct update methods
3. Update OutlineView to use direct editing
4. Update ManuscriptView to use direct editing
5. Test manual editing workflow

### Phase 2: Illustration Feedback (Medium Complexity)
1. Add IllustrationFeedback to EditStore
2. Add illustration refinement types to shared package
3. Add illustration refinement service methods
4. Add illustration refinement API endpoints
5. Update IllustrationsExport component with editing
6. Add floating action bar to illustrations page
7. Test single and batch regeneration

### Phase 3: Art Style & Character Images (Highest Complexity)
1. Add art style selection to TopicInput
2. Add CharacterImage type and update Project type
3. Add character reference prompt generator
4. Update outline service to generate character images
5. Add character image regeneration endpoint
6. Update OutlineView to display character images
7. Update illustration prompts to reference character images
8. Test end-to-end character consistency

---

## Testing Checklist

### Direct Text Editing
- [ ] Can switch between AI suggestion and manual edit modes
- [ ] Manual edits save immediately without API call
- [ ] Dirty state tracked and shown to user
- [ ] Can combine manual edits with AI suggestions
- [ ] Navigation prompts to save unsaved changes

### Illustration Feedback
- [ ] Can provide feedback on individual page illustrations
- [ ] Can provide feedback on front cover
- [ ] Can provide feedback on back cover
- [ ] Feedback count shown correctly
- [ ] Single image regeneration works
- [ ] Batch regeneration works
- [ ] Original image replaced on regeneration

### Art Style & Character Images
- [ ] Art style preset selection works
- [ ] Custom style keywords input works
- [ ] Character images generated with outline
- [ ] Character images displayed in OutlineView
- [ ] Single character image regeneration works
- [ ] Character image regeneration accepts feedback
- [ ] Page illustrations reference character images

---

## Files to Modify

| File | Changes |
|------|---------|
| `client/src/components/EditableSection.tsx` | Add dual-mode editing |
| `client/src/components/TopicInput.tsx` | Add art style selection |
| `client/src/components/OutlineView.tsx` | Direct editing + character images |
| `client/src/components/ManuscriptView.tsx` | Direct editing |
| `client/src/components/IllustrationsExport.tsx` | Add feedback/iteration |
| `client/src/stores/EditStore.ts` | Add illustration feedback |
| `client/src/stores/ProjectStore.ts` | Add direct update methods |
| `client/src/api/client.ts` | Add new API functions |
| `server/src/routes/generation.ts` | Add new endpoints |
| `server/src/services/outline.service.ts` | Add character image generation |
| `server/src/services/illustration.service.ts` | Add refinement methods |
| `server/src/prompts/illustration.prompts.ts` | Add refinement + character prompts |
| `shared/src/types/generation.ts` | Add new types |
| `shared/src/types/outline.ts` | Add CharacterImage type |
| `shared/src/types/project.ts` | Add characterImages to Project |

## New Files

| File | Purpose |
|------|---------|
| `client/src/components/FloatingActionBar.tsx` | Shared component for pending edits bar |
| `client/src/components/ArtStyleSelector.tsx` | Art style preset selector component |
| `client/src/components/CharacterCard.tsx` | Character display with image |
