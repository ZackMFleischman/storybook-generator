# Implementation Task: Gemini Session & Image Reference Architecture

## Context

You are implementing **Phase 2** of the storybook generator enhancement plan. This phase adds multi-turn chat sessions and image reference support to the Gemini adapter, enabling consistent character appearances across all pages of a generated storybook.

## Required Reading

Before writing any code, read these files completely:

1. **README.md** - Understand the project structure, tech stack, and existing patterns
2. **IMPLEMENTATION_PLAN.md** - Focus on "Feature 2: Gemini Session & Image Reference Architecture" (sections 2.1-2.7)
3. **gemini_image_generation_js_reference.md** - Understand Gemini's multi-turn chat and image reference capabilities

## Implementation Order

Follow this sequence exactly:

### Step 1: Add Types to Shared Package
**File:** `packages/shared/src/types/generation.ts`

Add these new types:
- `ReferenceImage` - Image data passed to generation
- `ReferenceImageInfo` - Metadata about references (without buffer)
- `GenerationMetadata` - Full context stored with each generated image
- Update `PageImage` to include optional `generationMetadata` field

Export all new types from `packages/shared/src/types/index.ts`

### Step 2: Extend Image Generation Interface
**File:** `packages/server/src/adapters/image-generation/image-generation.interface.ts`

Add new methods to `IImageGenerationAdapter`:
- `createSession(projectId: string): Promise<string>`
- `generateWithReferences(sessionId, prompt, referenceImages[], options): Promise<GeneratedImage>`
- `closeSession(sessionId: string): void`

### Step 3: Implement Session Support in Gemini Adapter
**File:** `packages/server/src/adapters/image-generation/gemini.adapter.ts`

- Add `private sessions: Map<string, Chat>` for session storage
- Implement `createSession()` using `this.client.chats.create()`
- Implement `generateWithReferences()` that:
  - Builds multi-part content array with text + inline images
  - Uses `chat.sendMessage()` instead of `generateContent()`
  - Returns `GeneratedImage` with populated metadata
- Implement `closeSession()` to clean up
- Keep existing `generateImage()` as fallback

### Step 4: Add loadImage to Storage Adapter
**File:** `packages/server/src/adapters/storage/filesystem.adapter.ts`

Add method to load image buffer from path (if not already present):
```typescript
async loadImage(imagePath: string): Promise<Buffer>
```

### Step 5: Refactor Illustration Service
**File:** `packages/server/src/services/illustration.service.ts`

Update `generateAllPages()`:
- Create session at start
- Generate pages SEQUENTIALLY (not parallel)
- Each page receives previous page as reference
- Populate `GenerationMetadata` for each `PageImage`
- Clean up session in finally block

Add helper method:
```typescript
private async loadCharacterReferences(projectId, characterImages?): Promise<ReferenceImage[]>
```

### Step 6: Create Generation Info Modal
**File:** `packages/client/src/components/GenerationInfoModal.tsx` (NEW)

Create modal component that displays:
- Session ID and message index
- Model, aspect ratio, generation time
- List of reference images with thumbnails
- Full prompt text

### Step 7: Update Illustrations Page
**File:** `packages/client/src/components/IllustrationsExport.tsx`

- Add info icon (ℹ️) button to each image card
- Wire up `GenerationInfoModal` to show on click
- Pass `pageImage.generationMetadata` to modal

## Key Technical Details

### Gemini Chat API Usage
```typescript
// Create session
const chat = this.client.chats.create({
  model: this.modelId,
  config: { responseModalities: [Modality.TEXT, Modality.IMAGE] }
});

// Send message with references
const parts = [
  { text: prompt },
  { text: "[Reference: Luna]" },
  { inlineData: { mimeType: "image/png", data: base64Data } }
];
const response = await chat.sendMessage({ message: parts });
```

### Reference Image Limit
Per Gemini recommendations, limit to 3 reference images per call:
- Up to 2 character references
- 1 previous page reference

### Sequential Generation
Pages MUST be generated sequentially because each page needs the previous page as a reference. Do not use `Promise.all()` for pages.

## Testing Your Implementation

After implementing, verify:

1. **Build passes**: `npm run build`
2. **Type checking**: No TypeScript errors
3. **Generate a book**: Create a 4-page storybook and verify:
   - Pages generate one at a time (check server logs)
   - Info icon appears on each illustration
   - Clicking info shows session ID, references, and prompt
4. **Visual consistency**: Characters should look more similar across pages than before

## Notes

- Keep the existing `generateImage()` method working as a fallback
- Don't modify any Phase 1 (completed) functionality
- Focus only on Phase 2 - don't implement Phases 3 or 4 yet
- If you encounter issues with the Gemini API, check the reference doc for correct syntax
