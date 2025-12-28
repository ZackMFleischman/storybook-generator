# Children's Illustration Book Generator - Implementation Plan

## Overview

A web application that auto-generates children's picture books (ages 3-8) through a **flexible, configurable pipeline**. The default stages are:

1. **Topic → Outline** - Generate story structure from a topic
2. **Outline → Manuscript** - Generate page-by-page text and illustration descriptions
3. **Art Style & Characters** - Establish visual style and character consistency (optional, skippable)
4. **Page Illustrations** - Generate all page images
5. **Text Composition** - Add text to pages (can be AI-generated or manual, or skipped if text baked into images)
6. **Export** - Generate final PDF

**Key Flexibility Features:**

-   Stages can be **skipped** (e.g., skip character sheets for faster generation)
-   Stages can be **combined** (e.g., generate illustrations with text already rendered)
-   Stages can be **revisited** (non-linear navigation)
-   New stages can be **added** without breaking existing projects

---

## Tech Stack

| Layer    | Technology                                                       |
| -------- | ---------------------------------------------------------------- |
| Frontend | React, MobX, Emotion, TypeScript                                 |
| Backend  | Express.js, TypeScript                                           |
| Text AI  | **Claude Opus 4.5** (default), pluggable to other LLMs           |
| Image AI | **Gemini 3 Pro** (default), Gemini 2.5 Flash, DALL-E (pluggable) |
| Testing  | Jest                                                             |
| PDF      | pdf-lib or puppeteer                                             |

### Text Generation Models

| Model               | ID                           | Best For                                            | Provider  |
| ------------------- | ---------------------------- | --------------------------------------------------- | --------- |
| **Claude Opus 4.5** | `claude-opus-4-5-20251101`   | Creative writing, story generation, nuanced editing | Anthropic |
| Claude Sonnet 4.5   | `claude-sonnet-4-5-20250929` | Faster, cost-effective option                       | Anthropic |
| GPT-4 Turbo         | `gpt-4-turbo`                | Alternative if needed                               | OpenAI    |

**Why Claude Opus 4.5 for creative writing:**

-   Superior creative and narrative capabilities
-   Better at maintaining consistent tone and voice
-   Excellent at age-appropriate content for children
-   Strong instruction following for structured outputs (JSON outlines, manuscripts)

### Image Generation Models

| Model            | ID                           | Best For                                            | Max Resolution | Reference Images                |
| ---------------- | ---------------------------- | --------------------------------------------------- | -------------- | ------------------------------- |
| **Gemini 3 Pro** | `gemini-3-pro-image-preview` | High quality, text rendering, character consistency | 4K             | Up to 14 (6 objects + 5 humans) |
| Gemini 2.5 Flash | `gemini-2.5-flash-image`     | Fast generation, prototyping                        | 1024px         | Up to 3                         |
| DALL-E 3         | `dall-e-3`                   | Alternative style, different aesthetic              | 1024px         | Limited                         |

**Why Gemini 3 Pro as default:**

-   **Excels at text rendering** - Can generate images with text already on them
-   **Multi-turn chat editing** - Iterative refinement in conversation context
-   **Reference images** - Up to 14 images for style/character consistency
-   **Multiple aspect ratios** - 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
-   **Thinking mode** - Internal reasoning for complex compositions
-   **4K resolution** - Print-ready quality

---

## Architecture

### Core Design Principles

1. **Adapter Pattern for Storage**: Start with filesystem (JSON + images in folders), interface designed for drop-in DB/S3 migration
2. **Adapter Pattern for Image Generation**: Pluggable providers (Gemini, DALL-E, future models)
3. **Command Pattern for Undo/Redo**: All edits stored as reversible commands
4. **Flexible Pipeline Architecture**: Stages are modular, skippable, and can be added/removed
5. **Multi-turn Generation Sessions**: Leverage Gemini's chat-based iterative refinement

### Storage Adapter Interface

```typescript
interface IStorageAdapter {
    // Project lifecycle
    createProject(projectId: string, metadata: ProjectMetadata): Promise<void>;
    loadProject(projectId: string): Promise<ProjectState>;
    saveProject(projectId: string, state: ProjectState): Promise<void>;
    deleteProject(projectId: string): Promise<void>;
    listProjects(): Promise<ProjectSummary[]>;

    // Image operations
    saveImage(projectId: string, category: ImageCategory, imageId: string, buffer: Buffer): Promise<string>;
    loadImage(projectId: string, category: ImageCategory, imageId: string): Promise<Buffer>;
    deleteImage(projectId: string, category: ImageCategory, imageId: string): Promise<void>;

    // Export operations
    saveExport(projectId: string, exportId: string, buffer: Buffer): Promise<string>;
}

type ImageCategory = "character-sheets" | "pages" | "composed" | "references";
```

### Flexible Pipeline Architecture

The pipeline is defined as a sequence of **stage definitions** that can be configured per-project:

```typescript
// Stage system - allows adding, removing, reordering stages
interface StageDefinition {
    id: string;
    name: string;
    description: string;

    // Dependencies
    requiredStages: string[]; // Must complete before this stage
    optionalInputFrom: string[]; // Can use output from these stages if available

    // Configuration
    isRequired: boolean; // false = can be skipped
    canRevisit: boolean; // true = can go back and re-edit

    // ===========================================
    // User Input Configuration
    // ===========================================

    // Inputs the user can/must provide before generation
    inputs: StageInput[];

    // Whether to show input form before generation starts
    showInputForm: "always" | "optional" | "never";

    // Generate button label (e.g., "Generate Outline", "Create Illustrations")
    generateLabel: string;

    // Component to render
    component: React.ComponentType<StageProps>;

    // Validation
    isComplete: (project: Project) => boolean;
    canEnter: (project: Project) => boolean;
    validateInputs: (inputs: StageInputValues) => ValidationResult;
}

// Defines a single input field for a stage
interface StageInput {
    id: string;
    name: string; // Display label
    description?: string; // Help text

    // Input type determines the UI component
    type: StageInputType;

    // Validation
    required: boolean;
    defaultValue?: any;

    // Conditional display
    showWhen?: (project: Project, currentInputs: StageInputValues) => boolean;

    // For dependent defaults (e.g., pre-fill from previous stage)
    deriveDefault?: (project: Project) => any;
}

type StageInputType =
    | { kind: "text"; placeholder?: string; multiline?: boolean; maxLength?: number }
    | { kind: "textarea"; placeholder?: string; rows?: number }
    | { kind: "select"; options: SelectOption[] }
    | { kind: "multi-select"; options: SelectOption[]; max?: number }
    | { kind: "toggle"; onLabel?: string; offLabel?: string }
    | { kind: "slider"; min: number; max: number; step: number; unit?: string }
    | { kind: "image-upload"; maxImages: number; acceptedTypes: string[] }
    | { kind: "image-select"; source: "character-sheets" | "pages" | "references" }
    | { kind: "color-palette"; maxColors: number }
    | { kind: "prompt-builder"; suggestions?: string[] }; // Rich prompt input with suggestions

interface SelectOption {
    value: string;
    label: string;
    description?: string;
    icon?: string;
}

// Values collected from user before generation
interface StageInputValues {
    [inputId: string]: any;
}

interface ValidationResult {
    valid: boolean;
    errors: { inputId: string; message: string }[];
}

// Default pipeline configuration with full input definitions
const DEFAULT_PIPELINE: StageDefinition[] = [
    {
        id: "outline",
        name: "Story Outline",
        description: "Generate the story structure from your topic",
        requiredStages: [],
        isRequired: true,
        canRevisit: true,
        showInputForm: "always",
        generateLabel: "Generate Outline",

        inputs: [
            {
                id: "topic",
                name: "Story Topic",
                description: "What is your story about?",
                type: { kind: "textarea", placeholder: "A curious rabbit who learns to share...", rows: 3 },
                required: true,
            },
            {
                id: "targetAge",
                name: "Target Age",
                type: {
                    kind: "select",
                    options: [
                        { value: "3-5", label: "Ages 3-5", description: "Simple words, short sentences" },
                        { value: "5-8", label: "Ages 5-8", description: "More vocabulary, longer narrative" },
                    ],
                },
                required: true,
                defaultValue: "3-5",
            },
            {
                id: "pageCount",
                name: "Page Count",
                type: {
                    kind: "select",
                    options: [
                        { value: "12", label: "12 pages", description: "Short story" },
                        { value: "16", label: "16 pages", description: "Standard" },
                        { value: "24", label: "24 pages", description: "Longer story" },
                        { value: "32", label: "32 pages", description: "Full picture book" },
                    ],
                },
                required: true,
                defaultValue: "16",
            },
            {
                id: "tone",
                name: "Story Tone",
                type: {
                    kind: "multi-select",
                    options: [
                        { value: "whimsical", label: "Whimsical" },
                        { value: "adventurous", label: "Adventurous" },
                        { value: "calming", label: "Calming" },
                        { value: "funny", label: "Funny" },
                        { value: "educational", label: "Educational" },
                    ],
                    max: 3,
                },
                required: false,
                defaultValue: ["whimsical"],
            },
            {
                id: "additionalInstructions",
                name: "Additional Instructions",
                description: "Any specific requirements for the story?",
                type: { kind: "textarea", placeholder: "Include a character named Luna...", rows: 2 },
                required: false,
            },
        ],
    },

    {
        id: "manuscript",
        name: "Manuscript",
        description: "Generate page-by-page text and illustration descriptions",
        requiredStages: ["outline"],
        isRequired: true,
        canRevisit: true,
        showInputForm: "optional", // Can generate with defaults or customize
        generateLabel: "Generate Manuscript",

        inputs: [
            {
                id: "wordsPerPage",
                name: "Words Per Page",
                description: "Target word count for each page",
                type: { kind: "slider", min: 10, max: 100, step: 5, unit: "words" },
                required: false,
                deriveDefault: (project) => (project.settings.targetAge === "3-5" ? 20 : 40),
            },
            {
                id: "textStyle",
                name: "Text Style",
                type: {
                    kind: "select",
                    options: [
                        { value: "rhythmic", label: "Rhythmic/Rhyming", description: "Poetic, read-aloud friendly" },
                        { value: "narrative", label: "Narrative", description: "Standard storytelling" },
                        { value: "simple", label: "Simple Sentences", description: "Easy to read" },
                    ],
                },
                required: false,
                defaultValue: "narrative",
            },
            {
                id: "additionalGuidance",
                name: "Additional Guidance",
                type: { kind: "textarea", placeholder: "Emphasize the moral lesson on page 12...", rows: 2 },
                required: false,
            },
        ],
    },

    {
        id: "art-style",
        name: "Art Style & Characters",
        description: "Establish visual style and generate character reference sheets",
        requiredStages: ["outline"],
        optionalInputFrom: ["manuscript"],
        isRequired: false,
        canRevisit: true,
        showInputForm: "always",
        generateLabel: "Generate Character Sheets",

        inputs: [
            {
                id: "artStyle",
                name: "Art Style",
                type: {
                    kind: "select",
                    options: [
                        { value: "watercolor", label: "Watercolor", description: "Soft, dreamy illustrations" },
                        { value: "digital-cartoon", label: "Digital Cartoon", description: "Bright, bold, modern" },
                        { value: "pencil-sketch", label: "Pencil & Ink", description: "Classic storybook feel" },
                        { value: "collage", label: "Collage/Mixed Media", description: "Textured, artistic" },
                        { value: "flat-vector", label: "Flat Vector", description: "Clean, minimal, modern" },
                        { value: "custom", label: "Custom (describe below)", description: "Your own style" },
                    ],
                },
                required: true,
                defaultValue: "watercolor",
            },
            {
                id: "customStylePrompt",
                name: "Style Description",
                description: "Describe the art style in detail",
                type: {
                    kind: "prompt-builder",
                    suggestions: [
                        "soft pastel colors",
                        "bold outlines",
                        "whimsical and playful",
                        "realistic proportions",
                        "exaggerated expressions",
                    ],
                },
                required: false,
                showWhen: (project, inputs) => inputs.artStyle === "custom",
            },
            {
                id: "styleReferences",
                name: "Style Reference Images",
                description: "Upload images that show the style you want",
                type: { kind: "image-upload", maxImages: 5, acceptedTypes: ["image/png", "image/jpeg", "image/webp"] },
                required: false,
            },
            {
                id: "characterPhotos",
                name: "Character Reference Photos",
                description: "Upload photos of real people/animals to base characters on",
                type: { kind: "image-upload", maxImages: 5, acceptedTypes: ["image/png", "image/jpeg", "image/webp"] },
                required: false,
            },
            {
                id: "colorPalette",
                name: "Color Palette",
                description: "Choose dominant colors for the illustrations",
                type: { kind: "color-palette", maxColors: 6 },
                required: false,
            },
        ],
    },

    {
        id: "illustrations",
        name: "Page Illustrations",
        description: "Generate all page images",
        requiredStages: ["manuscript"],
        optionalInputFrom: ["art-style"],
        isRequired: true,
        canRevisit: true,
        showInputForm: "always",
        generateLabel: "Generate All Pages",

        inputs: [
            {
                id: "generationMode",
                name: "Generation Mode",
                type: {
                    kind: "select",
                    options: [
                        {
                            value: "sequential",
                            label: "Sequential",
                            description: "Slower but more consistent (uses previous pages as context)",
                        },
                        { value: "parallel", label: "Parallel", description: "Faster but may have more variation" },
                    ],
                },
                required: true,
                defaultValue: "sequential",
            },
            {
                id: "textComposition",
                name: "Text on Images",
                type: {
                    kind: "select",
                    options: [
                        {
                            value: "ai-baked",
                            label: "AI Renders Text",
                            description: "Text generated as part of the image",
                        },
                        {
                            value: "ai-overlay",
                            label: "AI Overlay (2-pass)",
                            description: "Generate image, then add text",
                        },
                        {
                            value: "manual",
                            label: "Manual (next stage)",
                            description: "Position text yourself in compose stage",
                        },
                        { value: "none", label: "No Text", description: "Illustration-only pages" },
                    ],
                },
                required: true,
                defaultValue: "ai-baked",
            },
            {
                id: "fontStyle",
                name: "Text Font Style",
                description: "For AI-rendered text",
                type: {
                    kind: "select",
                    options: [
                        { value: "handwritten", label: "Handwritten", description: "Friendly, casual feel" },
                        { value: "storybook-serif", label: "Storybook Serif", description: "Classic children's book" },
                        { value: "playful-sans", label: "Playful Sans", description: "Modern, clean, fun" },
                        { value: "integrated", label: "Integrated with Art", description: "Text as part of the scene" },
                    ],
                },
                required: false,
                defaultValue: "storybook-serif",
                showWhen: (project, inputs) => ["ai-baked", "ai-overlay"].includes(inputs.textComposition),
            },
            {
                id: "aspectRatio",
                name: "Page Aspect Ratio",
                type: {
                    kind: "select",
                    options: [
                        { value: "1:1", label: "Square (1:1)" },
                        { value: "3:4", label: "Portrait (3:4)", description: "Standard picture book" },
                        { value: "4:3", label: "Landscape (4:3)" },
                        { value: "2:3", label: "Tall Portrait (2:3)" },
                    ],
                },
                required: true,
                defaultValue: "3:4",
            },
            {
                id: "additionalPrompt",
                name: "Additional Style Instructions",
                description: "Extra guidance for all page illustrations",
                type: { kind: "textarea", placeholder: "Always show the sun in outdoor scenes...", rows: 2 },
                required: false,
            },
        ],
    },

    {
        id: "compose",
        name: "Text & Layout",
        description: "Position and style text on pages",
        requiredStages: ["illustrations"],
        isRequired: false,
        canRevisit: true,
        showInputForm: "never", // This stage is all manual editing
        generateLabel: "Apply Text",

        inputs: [
            // Compose stage inputs are handled by the canvas UI, not a form
            // These are global defaults that apply to all pages
            {
                id: "defaultFont",
                name: "Default Font",
                type: {
                    kind: "select",
                    options: [
                        { value: "Patrick Hand", label: "Patrick Hand" },
                        { value: "Quicksand", label: "Quicksand" },
                        { value: "Nunito", label: "Nunito" },
                        { value: "Comic Neue", label: "Comic Neue" },
                    ],
                },
                required: true,
                defaultValue: "Patrick Hand",
            },
            {
                id: "defaultFontSize",
                name: "Default Font Size",
                type: { kind: "slider", min: 12, max: 48, step: 2, unit: "pt" },
                required: true,
                defaultValue: 24,
            },
        ],
    },

    {
        id: "export",
        name: "Export",
        description: "Generate final PDF",
        requiredStages: ["illustrations"],
        optionalInputFrom: ["compose"],
        isRequired: true,
        canRevisit: true,
        showInputForm: "always",
        generateLabel: "Export PDF",

        inputs: [
            {
                id: "pageSize",
                name: "Page Size",
                type: {
                    kind: "select",
                    options: [
                        { value: "8x8", label: '8" × 8"', description: "Square format" },
                        { value: "8.5x8.5", label: '8.5" × 8.5"', description: "Standard square" },
                        { value: "8x10", label: '8" × 10"', description: "Portrait format" },
                        { value: "a4", label: "A4", description: "International standard" },
                    ],
                },
                required: true,
                defaultValue: "8.5x8.5",
            },
            {
                id: "quality",
                name: "Quality",
                type: {
                    kind: "select",
                    options: [
                        { value: "screen", label: "Screen (72 DPI)", description: "Smaller file, for viewing" },
                        { value: "print", label: "Print Ready (300 DPI)", description: "Larger file, for printing" },
                    ],
                },
                required: true,
                defaultValue: "print",
            },
            {
                id: "includeCover",
                name: "Include Cover Page",
                type: { kind: "toggle", onLabel: "Yes", offLabel: "No" },
                required: false,
                defaultValue: true,
            },
            {
                id: "includeBackCover",
                name: "Include Back Cover",
                type: { kind: "toggle", onLabel: "Yes", offLabel: "No" },
                required: false,
                defaultValue: true,
            },
            {
                id: "pageNumbers",
                name: "Page Numbers",
                type: {
                    kind: "select",
                    options: [
                        { value: "none", label: "None" },
                        { value: "bottom-center", label: "Bottom Center" },
                        { value: "bottom-outside", label: "Bottom Outside Edge" },
                    ],
                },
                required: false,
                defaultValue: "none",
            },
        ],
    },
];

// Project stores which stages are enabled/skipped
interface ProjectPipeline {
    stages: string[]; // Active stage IDs in order
    skippedStages: string[]; // Explicitly skipped
    completedStages: string[]; // Finished stages
    currentStage: string; // Where user is now
}

// Store user inputs per stage
interface ProjectStageInputs {
    [stageId: string]: StageInputValues;
}
```

### Stage Input Form UX

The `StageInputForm` component renders inputs dynamically based on stage configuration:

```typescript
// StageInputForm.tsx
interface StageInputFormProps {
    stage: StageDefinition;
    project: Project;
    values: StageInputValues;
    onChange: (values: StageInputValues) => void;
    onGenerate: () => void;
}

function StageInputForm({ stage, project, values, onChange, onGenerate }: StageInputFormProps) {
    // Filter inputs based on showWhen conditions
    const visibleInputs = stage.inputs.filter((input) => !input.showWhen || input.showWhen(project, values));

    // Compute defaults including derived defaults
    const valuesWithDefaults = useMemo(() => {
        const result = { ...values };
        for (const input of stage.inputs) {
            if (result[input.id] === undefined) {
                result[input.id] = input.deriveDefault ? input.deriveDefault(project) : input.defaultValue;
            }
        }
        return result;
    }, [values, project, stage.inputs]);

    // Validate before generation
    const validation = stage.validateInputs(valuesWithDefaults);

    return (
        <div className="stage-input-form">
            <h2>{stage.name}</h2>
            <p>{stage.description}</p>

            {visibleInputs.map((input) => (
                <InputField
                    key={input.id}
                    input={input}
                    value={valuesWithDefaults[input.id]}
                    onChange={(value) => onChange({ ...valuesWithDefaults, [input.id]: value })}
                />
            ))}

            {!validation.valid && <ValidationErrors errors={validation.errors} />}

            <Button onClick={onGenerate} disabled={!validation.valid}>
                {stage.generateLabel}
            </Button>
        </div>
    );
}

// Input field renderer based on type
function InputField({ input, value, onChange }: InputFieldProps) {
    switch (input.type.kind) {
        case "text":
            return <TextInput {...input} value={value} onChange={onChange} />;
        case "textarea":
            return <TextArea {...input} value={value} onChange={onChange} />;
        case "select":
            return <Select {...input} value={value} onChange={onChange} />;
        case "multi-select":
            return <MultiSelect {...input} value={value} onChange={onChange} />;
        case "toggle":
            return <Toggle {...input} value={value} onChange={onChange} />;
        case "slider":
            return <Slider {...input} value={value} onChange={onChange} />;
        case "image-upload":
            return <ImageUpload {...input} value={value} onChange={onChange} />;
        case "color-palette":
            return <ColorPalette {...input} value={value} onChange={onChange} />;
        case "prompt-builder":
            return <PromptBuilder {...input} value={value} onChange={onChange} />;
        default:
            return null;
    }
}
```

### Stage Input Storage

Inputs are stored in the project and passed to generation:

```typescript
interface Project {
    // ... other fields ...

    // User inputs collected at each stage
    stageInputs: ProjectStageInputs;
}

// Example stored inputs
const exampleStageInputs: ProjectStageInputs = {
    outline: {
        topic: "A curious rabbit who learns to share with forest friends",
        targetAge: "3-5",
        pageCount: "16",
        tone: ["whimsical", "educational"],
        additionalInstructions: "Include a wise owl character",
    },
    manuscript: {
        wordsPerPage: 25,
        textStyle: "rhythmic",
    },
    "art-style": {
        artStyle: "watercolor",
        styleReferences: ["ref-001.png", "ref-002.png"],
        characterPhotos: [],
        colorPalette: ["#FFB6C1", "#87CEEB", "#98FB98"],
    },
    illustrations: {
        generationMode: "sequential",
        textComposition: "ai-baked",
        fontStyle: "handwritten",
        aspectRatio: "3:4",
    },
    export: {
        pageSize: "8.5x8.5",
        quality: "print",
        includeCover: true,
        includeBackCover: true,
    },
};
```

### Inputs Flow to Generation

Stage inputs are merged with project context when calling generation:

```typescript
async function generateStageContent(
    stage: StageDefinition,
    project: Project,
    inputs: StageInputValues
): Promise<GenerationResult> {
    // Build generation context from project + stage inputs
    const context: GenerationContext = {
        project,
        stageInputs: inputs,

        // Previous stage outputs (based on dependencies)
        outline: project.outline,
        manuscript: project.manuscript,
        artStyle: project.artStyle,

        // Reference images (for art-style and illustrations stages)
        referenceImages: await loadReferenceImages(project, inputs),
    };

    // Call appropriate generation service
    switch (stage.id) {
        case "outline":
            return outlineService.generate(context);
        case "manuscript":
            return manuscriptService.generate(context);
        case "art-style":
            return artStyleService.generate(context);
        case "illustrations":
            return illustrationService.generate(context);
        case "export":
            return exportService.generate(context);
    }
}
```

### Text Composition Strategies

Since Gemini excels at rendering text, we support multiple approaches:

```typescript
type TextCompositionStrategy =
    | "ai-baked" // Text rendered directly in image generation (skip compose stage)
    | "ai-overlay" // Generate illustration, then second AI pass adds text
    | "manual-overlay" // Traditional: user positions text manually
    | "hybrid"; // AI suggests, user adjusts

interface TextCompositionConfig {
    strategy: TextCompositionStrategy;

    // For ai-baked strategy
    textInPrompt: boolean; // Include text in image generation prompt
    fontStyle?: string; // "handwritten", "storybook", "clean sans-serif"
    textPlacementHint?: string; // "top", "bottom", "integrated"

    // For ai-overlay strategy
    overlayModel?: string; // Model to use for text addition pass
    preserveIllustration: boolean; // Use inpainting vs full regeneration

    // For manual-overlay
    defaultFont: string;
    defaultFontSize: number;
    defaultTextColor: string;
}
```

**Filesystem Implementation (MVP)**:

```
/projects
  /{project-id}
    /project.json           # All project state
    /images
      /character-sheets
        /{character-id}-{pose}.png
      /pages
        /page-{number}.png
      /composed
        /page-{number}.png
      /references
        /{image-id}.png
    /exports
      /{timestamp}-export.pdf
```

### Image Generation Adapter Interface

```typescript
interface IImageGenerationAdapter {
    // Basic generation
    generateImage(prompt: string, options: ImageGenOptions): Promise<GeneratedImage>;

    // Generation with reference images (for character consistency)
    generateWithReference(
        prompt: string,
        referenceImages: ReferenceImage[],
        options: ImageGenOptions
    ): Promise<GeneratedImage>;

    // Multi-turn chat session for iterative refinement
    createSession(): IGenerationSession;
    resumeSession(sessionId: string): IGenerationSession;

    // Model info
    getModelInfo(): ModelInfo;
    getSupportedAspectRatios(): AspectRatio[];
    getMaxReferenceImages(): { objects: number; humans: number };
}

// Gemini's multi-turn chat for iterative image editing
interface IGenerationSession {
    sessionId: string;

    // Send message and get response (text and/or image)
    send(message: string, images?: Buffer[], options?: SessionOptions): Promise<GenerationResponse>;

    // Get conversation history for context preservation
    getHistory(): ConversationTurn[];

    // For Gemini 3 Pro: preserve "thought signatures" across turns
    getThoughtContext(): string | null;
}

interface ImageGenOptions {
    aspectRatio: AspectRatio; // '1:1' | '2:3' | '3:4' | '4:3' | '16:9' etc.
    resolution?: "1k" | "2k" | "4k"; // Gemini 3 Pro only
    responseModalities: ("TEXT" | "IMAGE")[];
    style?: string;
    numberOfImages?: number; // Note: Gemini may not always honor exact count
}

type AspectRatio = "1:1" | "2:3" | "3:2" | "3:4" | "4:3" | "4:5" | "5:4" | "9:16" | "16:9" | "21:9";

interface ReferenceImage {
    buffer: Buffer;
    mimeType: "image/png" | "image/jpeg" | "image/webp";
    purpose: "style" | "character" | "object" | "setting";
    description?: string; // What this reference is showing
}

interface GeneratedImage {
    buffer: Buffer;
    mimeType: string;
    revisedPrompt?: string;
    metadata: {
        model: string;
        aspectRatio: AspectRatio;
        hasSynthIdWatermark: boolean; // All Gemini images have this
        generationTime: number;
    };
}

interface GenerationResponse {
    text?: string; // Explanatory text from model
    images: GeneratedImage[];
    thoughtSignature?: string; // For Gemini 3 Pro thinking mode
}
```

### Text Generation Adapter Interface

```typescript
interface ITextGenerationAdapter {
    // Basic text generation
    generateText(systemPrompt: string, userPrompt: string, options?: TextGenOptions): Promise<TextGenerationResponse>;

    // Structured output (for JSON responses like outlines)
    generateStructured<T>(
        systemPrompt: string,
        userPrompt: string,
        schema: JSONSchema,
        options?: TextGenOptions
    ): Promise<T>;

    // Streaming for real-time UI updates
    streamText(systemPrompt: string, userPrompt: string, options?: TextGenOptions): AsyncIterable<string>;

    // Model info
    getModelInfo(): TextModelInfo;
}

interface TextGenOptions {
    maxTokens?: number;
    temperature?: number; // 0-1, higher = more creative
    stopSequences?: string[];
}

interface TextGenerationResponse {
    text: string;
    usage: {
        inputTokens: number;
        outputTokens: number;
    };
    stopReason: "end_turn" | "max_tokens" | "stop_sequence";
}

interface TextModelInfo {
    id: string;
    name: string;
    provider: "anthropic" | "openai";
    maxContextTokens: number;
    costPer1MInputTokens: number;
    costPer1MOutputTokens: number;
    supportsStreaming: boolean;
    supportsStructuredOutput: boolean;
}
```

### Model Registry & Switching System

A central registry makes it easy for both developers and users to switch models:

```typescript
// Model registry - single source of truth for all available models
interface ModelRegistry {
    textModels: Map<string, TextModelConfig>;
    imageModels: Map<string, ImageModelConfig>;

    // Get adapter instance for a model
    getTextAdapter(modelId: string): ITextGenerationAdapter;
    getImageAdapter(modelId: string): IImageGenerationAdapter;

    // List available models (for UI dropdowns)
    listTextModels(): TextModelConfig[];
    listImageModels(): ImageModelConfig[];

    // Check if API key is configured for a provider
    isProviderConfigured(provider: string): boolean;
}

interface TextModelConfig {
    id: string;
    name: string;
    provider: "anthropic" | "openai";
    description: string;
    isDefault: boolean;
    capabilities: {
        creativity: "high" | "medium" | "low";
        speed: "fast" | "medium" | "slow";
        cost: "high" | "medium" | "low";
    };
    // Factory function to create adapter
    createAdapter: (apiKey: string) => ITextGenerationAdapter;
}

interface ImageModelConfig {
    id: string;
    name: string;
    provider: "google" | "openai";
    description: string;
    isDefault: boolean;
    capabilities: {
        maxResolution: string;
        supportsTextRendering: boolean;
        supportsReferences: boolean;
        maxReferences: number;
        supportsMultiTurn: boolean;
    };
    createAdapter: (apiKey: string) => IImageGenerationAdapter;
}

// Default model registry configuration
const MODEL_REGISTRY: ModelRegistryConfig = {
    textModels: {
        "claude-opus-4-5": {
            id: "claude-opus-4-5-20251101",
            name: "Claude Opus 4.5",
            provider: "anthropic",
            description: "Best for creative writing and nuanced storytelling",
            isDefault: true,
            capabilities: { creativity: "high", speed: "medium", cost: "high" },
        },
        "claude-sonnet-4-5": {
            id: "claude-sonnet-4-5-20250929",
            name: "Claude Sonnet 4.5",
            provider: "anthropic",
            description: "Faster and more cost-effective",
            isDefault: false,
            capabilities: { creativity: "medium", speed: "fast", cost: "medium" },
        },
        "gpt-4-turbo": {
            id: "gpt-4-turbo",
            name: "GPT-4 Turbo",
            provider: "openai",
            description: "OpenAI alternative",
            isDefault: false,
            capabilities: { creativity: "medium", speed: "fast", cost: "medium" },
        },
    },
    imageModels: {
        "gemini-3-pro": {
            id: "gemini-3-pro-image-preview",
            name: "Gemini 3 Pro",
            provider: "google",
            description: "Best quality, 4K, excellent text rendering",
            isDefault: true,
            capabilities: {
                maxResolution: "4K",
                supportsTextRendering: true,
                supportsReferences: true,
                maxReferences: 14,
                supportsMultiTurn: true,
            },
        },
        "gemini-2-5-flash": {
            id: "gemini-2.5-flash-image",
            name: "Gemini 2.5 Flash",
            provider: "google",
            description: "Faster generation, good for prototyping",
            isDefault: false,
            capabilities: {
                maxResolution: "1K",
                supportsTextRendering: true,
                supportsReferences: true,
                maxReferences: 3,
                supportsMultiTurn: true,
            },
        },
        "dalle-3": {
            id: "dall-e-3",
            name: "DALL-E 3",
            provider: "openai",
            description: "OpenAI alternative with different aesthetic",
            isDefault: false,
            capabilities: {
                maxResolution: "1K",
                supportsTextRendering: false,
                supportsReferences: false,
                maxReferences: 0,
                supportsMultiTurn: false,
            },
        },
    },
};
```

### Model Selection in Project Settings

Users can select models at the project level, and optionally override per-generation:

```typescript
interface ProjectSettings {
    // ... other settings ...

    // Model selection (user-facing)
    models: {
        text: string; // Model ID from registry, e.g., 'claude-opus-4-5'
        image: string; // Model ID from registry, e.g., 'gemini-3-pro'
    };
}

// Per-generation override (optional)
interface GenerationRequest {
    // ... generation params ...

    // Optional model override for this specific generation
    modelOverride?: {
        text?: string;
        image?: string;
    };
}
```

### Developer Model Switching

For developers, switching the default model is a one-line config change:

```typescript
// config/models.ts
export const DEFAULT_TEXT_MODEL = "claude-opus-4-5"; // Change this to switch
export const DEFAULT_IMAGE_MODEL = "gemini-3-pro"; // Change this to switch

// Or via environment variable
const DEFAULT_TEXT_MODEL = process.env.DEFAULT_TEXT_MODEL || "claude-opus-4-5";
const DEFAULT_IMAGE_MODEL = process.env.DEFAULT_IMAGE_MODEL || "gemini-3-pro";
```

### Adding a New Model

To add a new model (for developers):

```typescript
// 1. Create adapter implementing the interface
class NewModelAdapter implements ITextGenerationAdapter {
    // ... implement all methods
}

// 2. Register in model registry
modelRegistry.registerTextModel({
    id: "new-model-id",
    name: "New Model Name",
    provider: "new-provider",
    description: "Description for users",
    isDefault: false,
    capabilities: {
        /* ... */
    },
    createAdapter: (apiKey) => new NewModelAdapter(apiKey),
});

// 3. Add API key to environment
// NEW_PROVIDER_API_KEY=...
```

---

## Data Models

### Project State

```typescript
interface Project {
    id: string;
    name: string;
    createdAt: string; // ISO date
    updatedAt: string;
    settings: ProjectSettings;
    currentStage: Stage;

    // Stage outputs
    outline: Outline | null;
    manuscript: Manuscript | null;
    artStyle: ArtStyle | null;
    pageImages: PageImage[];
    composedPages: ComposedPage[];
}

type Stage = "outline" | "manuscript" | "art-style" | "illustrations" | "compose" | "export";

interface ProjectSettings {
    // Book settings
    targetAge: "3-5" | "5-8";
    targetPageCount: number; // 24 or 32 typically
    bookDimensions: { width: number; height: number }; // inches
    aspectRatio: AspectRatio; // for page images

    // Style settings
    toneKeywords: string[]; // ['whimsical', 'adventurous', 'calming']
    artStyleKeywords: string[]; // ['watercolor', 'digital', 'pencil']
    colorPalette?: string[]; // optional hex colors

    // Image generation settings
    imageModel: "gemini-2.5-flash-image" | "gemini-3-pro-image-preview" | "dalle-3";
    imageResolution: "1k" | "2k" | "4k"; // 4k only for Gemini 3 Pro
    generationMode: "parallel" | "sequential"; // for page illustrations

    // Text generation settings
    textModel: "gpt-4" | "gpt-4-turbo";

    // Text composition settings
    textComposition: TextCompositionConfig;

    // Pipeline settings
    pipeline: ProjectPipeline;
}
```

### Outline

```typescript
interface Outline {
    title: string;
    subtitle?: string;
    synopsis: string; // 2-3 sentence summary
    theme: string; // core message/lesson

    characters: Character[];
    setting: Setting;
    plotPoints: PlotPoint[];

    editHistory: EditHistoryStack;
}

interface Character {
    id: string;
    name: string;
    role: "protagonist" | "supporting" | "antagonist";
    description: string; // personality, motivation
    physicalDescription: string; // appearance details for image generation
    age?: string;
}

interface Setting {
    location: string;
    timePeriod: string;
    atmosphere: string;
    visualDetails: string; // for image generation
}

interface PlotPoint {
    id: string;
    order: number;
    title: string;
    description: string;
    characters: string[]; // character IDs involved
}
```

### Manuscript

```typescript
interface Manuscript {
    pages: ManuscriptPage[];
    editHistory: EditHistoryStack;
}

interface ManuscriptPage {
    pageNumber: number;
    spread: "left" | "right" | "full"; // for layout planning

    // Content
    text: string | null; // null = illustration-only page
    textPlacement: "top" | "bottom" | "overlay" | "integrated" | "none";

    // For image generation
    illustrationDescription: string;
    characters: string[]; // character IDs in this scene
    mood: string;
    action: string; // what's happening

    // Text-in-image hints (for ai-baked strategy)
    textRenderingHints?: {
        fontStyle: "handwritten" | "storybook-serif" | "playful-sans" | "custom";
        textArea: "top-third" | "bottom-third" | "left-side" | "right-side" | "speech-bubble" | "integrated";
        textBackground: "none" | "solid-white" | "semi-transparent" | "banner";
    };

    // Continuity notes
    continuesFrom?: string; // notes about visual continuity from previous page
}
```

### Art Style & Character Sheets

```typescript
interface ArtStyle {
    styleDescription: string; // detailed art direction prompt
    styleReferencePrompt: string; // prompt used to establish style

    characterSheets: CharacterSheet[];

    // User-provided reference images
    userReferences: UserReference[];

    editHistory: EditHistoryStack;
}

interface CharacterSheet {
    characterId: string;
    characterName: string;

    // Multiple views for consistency
    views: CharacterView[];

    // Extracted/refined description for use in page prompts
    consolidatedDescription: string;
}

interface CharacterView {
    id: string;
    viewType: "front" | "side" | "back" | "action" | "expression";
    imagePath: string;
    prompt: string;
}

interface UserReference {
    id: string;
    imagePath: string;
    purpose: "style" | "character" | "setting";
    description: string;
}
```

### Page Images & Composition

```typescript
interface PageImage {
    pageNumber: number;
    imagePath: string;

    // Text composition
    hasTextBaked: boolean; // true if text was rendered in the image
    bakedText?: string; // the text that was baked in (for reference)

    // Generation metadata
    prompt: string;
    characterRefsUsed: string[]; // paths to character sheet images used
    generatedAt: string;
    modelUsed: string;
    aspectRatio: AspectRatio;
    resolution: string;

    // For iterative refinement (multi-turn sessions)
    sessionId?: string; // Gemini chat session for this page
    generationTurn: number; // Which iteration this is

    // For regeneration
    thoughtSignature?: string; // Gemini 3 Pro thinking context
}

interface ComposedPage {
    pageNumber: number;
    baseImagePath: string; // the illustration
    composedImagePath: string; // with text overlaid

    textOverlays: TextOverlay[];
}

interface TextOverlay {
    id: string;
    text: string;

    // Positioning (percentages for responsive scaling)
    x: number; // 0-100
    y: number; // 0-100
    width: number; // percentage of page width

    // Styling
    fontFamily: string;
    fontSize: number; // points
    fontWeight: "normal" | "bold";
    fontStyle: "normal" | "italic";
    color: string; // hex
    backgroundColor?: string; // optional text box background
    textAlign: "left" | "center" | "right";
    lineHeight: number;
}
```

### Edit History (Undo/Redo)

```typescript
interface EditHistoryStack {
    entries: EditHistoryEntry[];
    currentIndex: number; // -1 = no history, points to current state
}

interface EditHistoryEntry {
    id: string;
    timestamp: string;
    type: "manual" | "ai-edit" | "ai-generate" | "ai-regenerate";

    // For reverting
    patch: JsonPatch[]; // RFC 6902 JSON Patch format
    inversePatch: JsonPatch[];

    // Metadata
    description: string; // human-readable description

    // For AI edits
    aiContext?: {
        selection?: SelectionRange;
        prompt: string;
        model: string;
    };
}

interface SelectionRange {
    path: string; // JSON path to the field being edited
    startOffset: number;
    endOffset: number;
}

interface JsonPatch {
    op: "add" | "remove" | "replace" | "move" | "copy";
    path: string;
    value?: any;
    from?: string;
}
```

---

## API Endpoints

### Projects

```
GET    /api/projects              # List all projects
POST   /api/projects              # Create new project
GET    /api/projects/:id          # Get project state
PUT    /api/projects/:id          # Update project
DELETE /api/projects/:id          # Delete project
```

### Generation

```
POST   /api/generate/outline      # Generate outline from topic
POST   /api/generate/manuscript   # Generate manuscript from outline
POST   /api/generate/art-style    # Generate character sheets & style
POST   /api/generate/page/:num    # Generate single page illustration
POST   /api/generate/all-pages    # Generate all page illustrations
POST   /api/generate/edit         # AI-assisted edit (any stage)
```

### Images

```
GET    /api/projects/:id/images/:category/:imageId   # Get image
POST   /api/projects/:id/images/upload               # Upload reference image
DELETE /api/projects/:id/images/:category/:imageId   # Delete image
```

### Export

```
POST   /api/projects/:id/export/pdf    # Generate PDF
GET    /api/projects/:id/exports       # List exports
GET    /api/projects/:id/exports/:id   # Download export
```

### Settings

```
GET    /api/settings/models       # Get available AI models
GET    /api/settings/fonts        # Get available fonts
```

---

## Frontend Architecture

### MobX Store Structure

```typescript
// Root store
class RootStore {
  projectStore: ProjectStore
  uiStore: UIStore
  generationStore: GenerationStore
}

// Project state management
class ProjectStore {
  @observable currentProject: Project | null
  @observable projectList: ProjectSummary[]
  @observable isDirty: boolean

  @action loadProject(id: string): Promise<void>
  @action saveProject(): Promise<void>
  @action updateOutline(outline: Outline): void
  @action updateManuscript(manuscript: Manuscript): void
  // ... etc

  @action undo(): void
  @action redo(): void
  @computed get canUndo(): boolean
  @computed get canRedo(): boolean
}

// UI state
class UIStore {
  @observable currentStage: Stage
  @observable selectedPageNumber: number | null
  @observable editMode: 'view' | 'edit' | 'ai-edit'
  @observable selection: SelectionRange | null
  @observable aiEditPrompt: string

  @observable sidebarOpen: boolean
  @observable settingsModalOpen: boolean
}

// Generation status
class GenerationStore {
  @observable isGenerating: boolean
  @observable generationProgress: GenerationProgress | null
  @observable generationQueue: GenerationTask[]

  @action generateOutline(topic: string): Promise<void>
  @action generateManuscript(): Promise<void>
  @action generateArtStyle(additionalPrompt?: string): Promise<void>
  @action generatePageImage(pageNumber: number): Promise<void>
  @action generateAllPageImages(): Promise<void>
  @action aiEdit(selection: SelectionRange, prompt: string): Promise<void>
}
```

### Component Hierarchy

```
App
├── Header
│   ├── ProjectTitle (editable)
│   ├── StageIndicator (breadcrumb showing progress)
│   ├── UndoRedoButtons
│   └── SettingsButton
│
├── Sidebar
│   ├── ProjectList (when on home)
│   ├── OutlineNavigator (when editing outline)
│   ├── PageThumbnails (when editing manuscript/images)
│   └── SettingsPanel
│
├── MainContent
│   ├── HomeView
│   │   ├── NewProjectButton
│   │   └── ProjectGrid
│   │
│   ├── OutlineEditor
│   │   ├── TitleEditor
│   │   ├── SynopsisEditor
│   │   ├── CharacterList
│   │   │   └── CharacterCard (expandable)
│   │   ├── SettingEditor
│   │   └── PlotPointList
│   │       └── PlotPointCard (draggable)
│   │
│   ├── ManuscriptEditor
│   │   ├── PageNavigator
│   │   ├── PageEditor
│   │   │   ├── TextEditor (rich text)
│   │   │   └── IllustrationDescriptionEditor
│   │   └── PagePreview
│   │
│   ├── ArtStyleEditor
│   │   ├── StylePromptEditor
│   │   ├── ReferenceImageUploader
│   │   ├── CharacterSheetGrid
│   │   │   └── CharacterSheetCard
│   │   │       └── CharacterViewThumbnail
│   │   └── RegenerateControls
│   │
│   ├── IllustrationEditor
│   │   ├── PageGrid
│   │   │   └── PageThumbnail
│   │   ├── PageDetailView
│   │   │   ├── FullSizeImage
│   │   │   ├── PromptViewer
│   │   │   └── RegenerateButton
│   │   └── GenerationModeToggle
│   │
│   ├── ComposeEditor
│   │   ├── PageCanvas
│   │   │   ├── ImageLayer
│   │   │   └── TextOverlayLayer
│   │   │       └── DraggableTextBox
│   │   ├── FontPicker
│   │   ├── TextStyleControls
│   │   └── PageNavigator
│   │
│   └── ExportView
│       ├── ExportSettings
│       ├── PreviewCarousel
│       └── ExportButton
│
├── AIEditModal
│   ├── SelectionPreview
│   ├── PromptInput
│   ├── GenerateButton
│   └── AcceptRejectButtons
│
└── GenerationStatusBar
    ├── ProgressIndicator
    ├── CurrentTask
    └── CancelButton
```

### Stage-Specific UX

#### Stage 1: Outline Editor

**Initial State**:

-   Large text input: "What's your story about?"
-   Example prompts as suggestions
-   Settings panel for age range, tone, page count

**After Generation**:

-   Structured view of outline components
-   Each section (title, synopsis, characters, setting, plot points) is editable
-   Click to edit manually, or select text and click "AI Edit" button
-   Drag-and-drop reordering for plot points
-   "Add Character" / "Add Plot Point" buttons
-   "Regenerate Section" buttons on each card

**AI Edit Flow**:

1. User selects text (or entire section)
2. "Edit with AI" button appears (or keyboard shortcut)
3. Modal opens with selection shown
4. User types instruction ("make this character younger", "add more conflict here")
5. AI generates new version
6. User sees diff/comparison
7. Accept or reject (reject = undo)

#### Stage 2: Manuscript Editor

**Layout**:

-   Left: Page list with thumbnails
-   Center: Current page editor
-   Right: Preview of how page might look

**Page Editor**:

-   Toggle: "Text on this page" yes/no
-   Text editor (rich text, but limited formatting for children's book)
-   Word count indicator with target range
-   Illustration description (textarea with AI suggestions)
-   Notes field for continuity

**AI Edit**: Same flow as outline, can select text or illustration description

#### Stage 3: Art Style Editor

**Layout**:

-   Top: Style controls
-   Middle: Character sheet grid
-   Bottom: Reference images

**Style Controls**:

-   Art style dropdown presets (watercolor, digital cartoon, pencil sketch, etc.)
-   Custom style prompt textarea
-   Color palette picker (optional)
-   "Generate Style" button

**Character Sheets**:

-   Grid of character cards
-   Each card shows:
    -   Character name
    -   Generated views (front, side, action pose)
    -   Description used
    -   "Regenerate" button per view
    -   "Regenerate All" button per character
-   Can upload reference images per character

**Reference Images**:

-   Drag-and-drop upload zone
-   Tag images as: style reference, character reference, setting reference
-   These get included in generation prompts

#### Stage 4: Illustration Editor

**Layout**:

-   Left: Page thumbnail strip (vertical)
-   Center: Selected page full view
-   Right: Generation controls

**Generation Controls**:

-   Mode toggle: Sequential / Parallel
    -   Sequential: Uses previous pages as context, slower but more consistent
    -   Parallel: Faster but may have more variation
-   "Generate All" button
-   Per-page "Regenerate" button
-   Prompt editor (pre-filled from manuscript, editable)

**Progress View** (during generation):

-   Shows all pages as grid
-   Completed pages show thumbnail
-   In-progress page shows spinner
-   Queued pages show placeholder
-   Can cancel remaining

#### Stage 5: Compose Editor

**Layout**:

-   Center: Large canvas showing page
-   Right: Controls panel
-   Bottom: Page strip

**Canvas**:

-   Zoomable/pannable
-   Image layer (locked)
-   Text overlay layer
-   Text boxes are draggable/resizable
-   Snap-to-grid optional
-   Alignment guides

**Controls**:

-   Font family dropdown
-   Font size slider
-   Color picker
-   Background toggle (none, solid, semi-transparent)
-   Text alignment buttons
-   "Apply to all pages" checkbox for style changes

**Quick Actions**:

-   "Auto-position text" - AI suggests placement
-   "Copy style from page X"

#### Stage 6: Export

**Settings**:

-   Page size (8.5x8.5, 8x10, custom)
-   Quality (screen, print-ready)
-   Include cover? (front, back)
-   Page numbers?

**Preview**:

-   Flipbook-style preview
-   Or page grid view

**Export**:

-   "Generate PDF" button
-   Download when ready
-   Save to project

---

## AI Prompt Engineering

### Outline Generation System Prompt

```
You are a children's picture book author specializing in books for ages {targetAge}.

Create an outline for a {pageCount}-page picture book based on the given topic.

Requirements:
- Age-appropriate vocabulary and themes
- Clear protagonist with relatable goal
- Simple but engaging conflict/challenge
- Satisfying resolution with gentle moral/lesson
- Visual storytelling potential (describe scenes that would make great illustrations)
- Diversity and inclusion in characters when possible

Output JSON format:
{
  "title": "...",
  "synopsis": "2-3 sentences summarizing the story",
  "theme": "Core message in one phrase",
  "characters": [...],
  "setting": {...},
  "plotPoints": [...]
}

Tone keywords to incorporate: {toneKeywords}
Art style to keep in mind: {artStyleKeywords}
```

### Manuscript Generation System Prompt

```
You are writing the manuscript for a children's picture book.

Given the outline, create the page-by-page manuscript.

For each page, provide:
1. text: The actual text that appears on the page (or null for illustration-only pages)
   - Use simple sentences appropriate for {targetAge} year olds
   - Max {wordsPerPage} words per page
   - Read-aloud friendly rhythm

2. illustrationDescription: Detailed description for the illustrator
   - What characters are present (use their names)
   - What they're doing (pose, action, expression)
   - Setting details visible in this scene
   - Mood and atmosphere
   - Any important objects or details
   - Composition suggestions (close-up, wide shot, etc.)

3. continuesFrom: Note about visual continuity from previous page

Maintain story pacing:
- Pages 1-3: Setup and introduction
- Pages 4-8: Adventure begins, rising action
- Pages 9-12: Challenge/conflict peaks
- Pages 13-15: Resolution
- Page 16: Ending/conclusion

Use the exact character descriptions from the outline for consistency.
```

### Character Sheet Generation Prompt Template

```
Create a character illustration for a children's picture book:

Character: {characterName}
Description: {physicalDescription}
Personality: {description}

Art Style: {styleDescription}
{if userReferences: "Reference the uploaded images for style guidance."}

Generate a {viewType} view of the character:
- Clear, full figure visible
- Characteristic pose that shows personality
- Consistent with the book's visual style
- Suitable for ages {targetAge}
- {viewSpecificInstructions}

The character should look exactly the same in every illustration of this book.
```

### Page Illustration Prompt Template

```
Create an illustration for page {pageNumber} of a children's picture book.

Scene Description:
{illustrationDescription}

Characters in scene:
{for each character:}
- {characterName}: {characterDescription}
  [Reference character sheet images are attached]

Art Style: {styleDescription}
Mood: {mood}
Setting: {settingDescription}

{if sequential and previousPageImage:}
Continuity note: This follows directly from the previous page. Maintain consistent:
- Character appearances
- Environmental details
- Lighting and color palette
- Art style

Composition: {compositionNotes}

Important: Match the established character designs exactly.
```

### AI Edit Prompt Template

```
You are editing a section of a children's picture book {stage}.

Current content:
---
{selectedText}
---

User instruction: {userPrompt}

Context:
{if outline: "This is part of the story outline."}
{if manuscript: "This is page {pageNumber} of the manuscript."}
{relevant context from surrounding content}

Generate the edited version that:
1. Follows the user's instruction
2. Maintains consistency with the rest of the {stage}
3. Keeps the same approximate length unless instructed otherwise
4. Preserves the tone and style of the book
5. Remains age-appropriate for {targetAge} year olds

Output only the edited text, no explanations.
```

### Text-Baked Image Generation Prompt Template

When using the `ai-baked` text composition strategy, include text directly in image prompts:

```
Create a children's book illustration for ages {targetAge}.

Scene: {illustrationDescription}

{if characters:}
Characters in scene:
{for each character:}
- {characterName}: {physicalDescription}
{end for}

Art Style: {artStyleKeywords}
Mood: {mood}

TEXT TO INCLUDE IN IMAGE:
"{pageText}"

Text rendering instructions:
- Render the text as part of the illustration
- Font style: {fontStyle} (e.g., "friendly handwritten", "clean storybook serif")
- Text placement: {textPlacement} (e.g., "at the top of the image with room for illustration below")
- Text should be clearly legible against the background
- {if textBackground: "Add a subtle {textBackground} behind the text for readability"}
- Text color should complement the illustration

The text is an essential part of the image - it must be included and readable.
Make sure the illustration composition leaves appropriate space for the text.
```

### Multi-Turn Image Refinement Prompts

For iterating on generated images using Gemini's chat feature:

**Initial generation in session:**

```
Create the first page illustration for a children's book about {topic}.
[Include full page details as above]
```

**Refinement follow-ups:**

```
Keep everything the same, but:
- Make the character's expression more {emotion}
- Adjust the text placement to be more centered
- Make the colors warmer/cooler
```

```
The text is hard to read. Regenerate with:
- Stronger contrast between text and background
- Slightly larger font size
- A subtle white glow behind the text
```

```
Perfect! Now create page 2, maintaining the same style.
[Include page 2 details]
```

This conversational approach maintains consistency across pages since Gemini retains context from previous turns.

---

## MVP Phases

### Phase 1: Skeleton (End-to-End Pipe with AI Text Baking)

**Goal**: Topic in → PDF out, minimal UI, **text baked directly into images**

This phase proves the simplest possible pipeline by leveraging Gemini's text rendering:

-   Skip character sheets (no art-style stage)
-   Skip manual text composition (text in images)
-   4 stages: Outline → Manuscript → Illustrations (with text) → Export

**Backend**:

-   [x] Express server setup with TypeScript
-   [x] Filesystem storage adapter (basic)
-   [x] Gemini 2.0 Flash adapter (basic image generation)
-   [x] Claude Opus 4.5 adapter for text generation (using @anthropic-ai/sdk)
-   [x] Basic endpoints: create project, generate outline, generate manuscript, generate pages, export PDF
-   [x] PDF generation from images (pdf-lib)

**Frontend**:

-   [ ] Basic React + MobX setup (in progress - stores started)
-   [ ] Simple wizard flow (next/back buttons)
-   [ ] Topic input page with basic settings
-   [ ] Outline display (read-only)
-   [ ] Manuscript display (read-only)
-   [ ] Page image gallery (read-only) - images include text!
-   [ ] Export/download button

**Key Simplification**:

-   Text composition strategy: `ai-baked` (text rendered in image generation prompt)
-   No character sheets - rely on detailed prompts only
-   No editing - regenerate entire stage if unhappy
-   Fixed aspect ratio (1:1 or 3:4)

**Outcome**: Can generate a complete storybook from topic to PDF in one session

---

### Phase 2: Flexible Pipeline + Stage Skipping

**Goal**: Make pipeline configurable, allow revisiting stages

**Backend**:

-   [ ] Pipeline configuration in project settings
-   [ ] Stage dependency validation
-   [ ] Conditional stage skipping

**Frontend**:

-   [ ] Stage navigator (shows all stages, completed/skipped/current)
-   [ ] "Skip this stage" button for optional stages
-   [ ] Back navigation to previous stages
-   [ ] Warning when going back invalidates later work
-   [ ] Pipeline settings in project settings modal

**Outcome**: Users can skip character sheets or text composition as desired

---

### Phase 3: Editing Foundation

**Goal**: Add manual editing and undo/redo to all stages

**Backend**:

-   [ ] Edit history storage in project.json
-   [ ] JSON Patch generation utilities

**Frontend**:

-   [ ] Editable fields for outline (title, synopsis, characters, plot points)
-   [ ] Editable fields for manuscript (text, illustration description)
-   [ ] Undo/redo command infrastructure (HistoryManager)
-   [ ] Undo/redo buttons in header
-   [ ] Keyboard shortcuts (Ctrl+Z, Ctrl+Y)
-   [ ] "Dirty" indicator (unsaved changes)
-   [ ] Auto-save with debounce

**Outcome**: Users can manually refine all generated content

---

### Phase 4: AI-Assisted Editing

**Goal**: Highlight text → prompt AI to edit

**Backend**:

-   [ ] AI edit endpoint
-   [ ] Selection-aware prompt construction
-   [ ] Streaming responses (for better UX)

**Frontend**:

-   [ ] Text selection detection
-   [ ] "Edit with AI" button/context menu
-   [ ] AI edit modal with prompt input
-   [ ] Before/after comparison view
-   [ ] Accept/reject workflow
-   [ ] Loading states during generation

**Outcome**: Users can iterate on content using natural language

---

### Phase 5: Multi-Turn Image Refinement

**Goal**: Leverage Gemini's chat-based image editing

Instead of regenerating from scratch, use multi-turn sessions:

**Backend**:

-   [ ] Session management (create, resume, store)
-   [ ] Session persistence in project storage
-   [ ] Conversation history tracking

**Frontend**:

-   [ ] Per-page "Refine" button (opens chat-like interface)
-   [ ] Image refinement prompt input
-   [ ] Show before/after comparison
-   [ ] Session history display
-   [ ] "Start fresh" vs "Continue refining" choice

**Outcome**: Iterative image refinement without losing context

---

### Phase 6: Character Consistency System

**Goal**: Art style stage with character sheets (optional stage)

**Backend**:

-   [ ] Character sheet generation endpoint
-   [ ] Multi-view generation per character (front, side, action)
-   [ ] Reference image inclusion in page prompts
-   [ ] Style description extraction/storage

**Frontend**:

-   [ ] Art style stage UI (skippable)
-   [ ] Style prompt editor with presets
-   [ ] Reference image upload with drag-and-drop
-   [ ] Character sheet grid view
-   [ ] Per-character and per-view regeneration

**Update page generation**:

-   [ ] Include character sheet images as references (up to 6+5 for Gemini 3 Pro)
-   [ ] Character selection per page

**Outcome**: Much improved character consistency when enabled

---

### Phase 7: Text Composition Options

**Goal**: Support all text composition strategies

**Backend**:

-   [ ] Text composition strategy selection
-   [ ] AI overlay endpoint (second-pass text addition)
-   [ ] Manual overlay composition (Sharp/Canvas)
-   [ ] Font loading and rendering

**Frontend**:

-   [ ] Strategy selector: "AI Baked" | "AI Overlay" | "Manual" | "Hybrid"
-   [ ] For Manual/Hybrid: Canvas-based page editor
-   [ ] Draggable/resizable text boxes
-   [ ] Font picker (Google Fonts subset)
-   [ ] Text styling controls
-   [ ] "Apply style to all pages"

**Outcome**: Users choose their preferred text handling approach

---

### Phase 8: Model Selection & Advanced Generation

**Goal**: Model flexibility, parallel generation, progress UI

**Backend**:

-   [ ] DALL-E adapter implementation
-   [ ] Gemini 3 Pro support (4K, more references)
-   [ ] Model-specific prompt adjustments
-   [ ] Parallel generation with Promise.allSettled
-   [ ] Sequential generation with reference chaining
-   [ ] WebSocket progress reporting

**Frontend**:

-   [ ] Image model dropdown in settings
-   [ ] Model comparison info (resolution, references, cost)
-   [ ] Generation mode toggle (parallel/sequential)
-   [ ] Real-time progress display
-   [ ] Page-by-page status indicators
-   [ ] Cancel/resume generation

**Outcome**: Power users can optimize for quality vs speed

---

### Phase 9: Polish & Production

**Goal**: Production-ready quality

**Features**:

-   [ ] Project list/management UI with thumbnails
-   [ ] Duplicate/template projects
-   [ ] Export options (page size, quality, format)
-   [ ] Print-ready PDF (300 DPI, CMYK option, bleed)
-   [ ] Cover page generation
-   [ ] Better error handling and recovery
-   [ ] Batch API support for high-volume generation
-   [ ] Cost tracking/estimation
-   [ ] Responsive design for tablet

**Outcome**: Polished, feature-complete application

---

## File Structure

**Tests are colocated with source files** (`*.test.ts` alongside `*.ts`):

```
storybook-generator/
├── package.json
├── tsconfig.json
├── jest.config.js
├── .env.example
├── README.md
│
├── packages/
│   ├── shared/                    # Shared types and utilities
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── project.ts
│   │   │   │   ├── outline.ts
│   │   │   │   ├── manuscript.ts
│   │   │   │   ├── art-style.ts
│   │   │   │   ├── generation.ts
│   │   │   │   └── index.ts
│   │   │   ├── utils/
│   │   │   │   ├── patch.ts
│   │   │   │   ├── patch.test.ts              # Colocated test
│   │   │   │   ├── validation.ts
│   │   │   │   └── validation.test.ts         # Colocated test
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── server/                    # Express backend
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── app.ts
│   │   │   ├── app.integration.test.ts        # Integration tests
│   │   │   ├── config/
│   │   │   │   └── index.ts
│   │   │   ├── routes/
│   │   │   │   ├── projects.ts
│   │   │   │   ├── projects.test.ts
│   │   │   │   ├── generation.ts
│   │   │   │   ├── generation.test.ts
│   │   │   │   ├── images.ts
│   │   │   │   └── export.ts
│   │   │   ├── services/
│   │   │   │   ├── project.service.ts
│   │   │   │   ├── project.service.test.ts
│   │   │   │   ├── outline.service.ts
│   │   │   │   ├── outline.service.test.ts
│   │   │   │   ├── manuscript.service.ts
│   │   │   │   ├── art-style.service.ts
│   │   │   │   ├── illustration.service.ts
│   │   │   │   ├── composition.service.ts
│   │   │   │   ├── export.service.ts
│   │   │   │   └── ai-edit.service.ts
│   │   │   ├── adapters/
│   │   │   │   ├── storage/
│   │   │   │   │   ├── storage.interface.ts
│   │   │   │   │   ├── filesystem.adapter.ts
│   │   │   │   │   ├── filesystem.adapter.test.ts
│   │   │   │   │   ├── mock.adapter.ts        # Mock for testing
│   │   │   │   │   └── index.ts
│   │   │   │   ├── image-generation/
│   │   │   │   │   ├── image-generation.interface.ts
│   │   │   │   │   ├── gemini.adapter.ts
│   │   │   │   │   ├── dalle.adapter.ts
│   │   │   │   │   ├── mock.adapter.ts        # Mock for testing
│   │   │   │   │   ├── adapters.test.ts       # Tests ALL adapters implement interface
│   │   │   │   │   └── index.ts
│   │   │   │   └── text-generation/
│   │   │   │       ├── text-generation.interface.ts
│   │   │   │       ├── claude.adapter.ts
│   │   │   │       ├── openai.adapter.ts
│   │   │   │       ├── mock.adapter.ts        # Mock for testing
│   │   │   │       ├── adapters.test.ts       # Tests ALL adapters implement interface
│   │   │   │       └── index.ts
│   │   │   ├── models/
│   │   │   │   ├── registry.ts
│   │   │   │   ├── registry.test.ts           # Tests registry behavior, not specific models
│   │   │   │   ├── config.ts
│   │   │   │   └── index.ts
│   │   │   ├── prompts/
│   │   │   │   ├── outline.prompts.ts
│   │   │   │   ├── outline.prompts.test.ts
│   │   │   │   ├── manuscript.prompts.ts
│   │   │   │   ├── character-sheet.prompts.ts
│   │   │   │   ├── illustration.prompts.ts
│   │   │   │   └── edit.prompts.ts
│   │   │   ├── pipeline/
│   │   │   │   ├── stages.ts
│   │   │   │   ├── stages.test.ts             # Tests stage behavior, not specific stages
│   │   │   │   └── index.ts
│   │   │   └── middleware/
│   │   │       ├── error-handler.ts
│   │   │       └── validation.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── client/                    # React frontend
│       ├── src/
│       │   ├── index.tsx
│       │   ├── App.tsx
│       │   ├── App.test.tsx
│       │   ├── stores/
│       │   │   ├── RootStore.ts
│       │   │   ├── ProjectStore.ts
│       │   │   ├── ProjectStore.test.ts
│       │   │   ├── UIStore.ts
│       │   │   ├── GenerationStore.ts
│       │   │   ├── HistoryManager.ts
│       │   │   ├── HistoryManager.test.ts
│       │   │   └── index.ts
│       │   ├── components/
│       │   │   ├── common/
│       │   │   │   ├── Button.tsx
│       │   │   │   ├── Button.test.tsx
│       │   │   │   ├── Modal.tsx
│       │   │   │   ├── TextEditor.tsx
│       │   │   │   ├── LoadingSpinner.tsx
│       │   │   │   └── ...
│       │   │   ├── layout/
│       │   │   │   ├── Header.tsx
│       │   │   │   ├── Sidebar.tsx
│       │   │   │   └── MainContent.tsx
│       │   │   ├── stages/
│       │   │   │   ├── StageInputForm.tsx
│       │   │   │   ├── StageInputForm.test.tsx
│       │   │   │   └── InputField.tsx
│       │   │   ├── outline/
│       │   │   │   ├── OutlineEditor.tsx
│       │   │   │   ├── CharacterCard.tsx
│       │   │   │   ├── PlotPointCard.tsx
│       │   │   │   └── SettingEditor.tsx
│       │   │   ├── manuscript/
│       │   │   │   ├── ManuscriptEditor.tsx
│       │   │   │   ├── PageEditor.tsx
│       │   │   │   └── PageList.tsx
│       │   │   ├── art-style/
│       │   │   │   ├── ArtStyleEditor.tsx
│       │   │   │   ├── CharacterSheetCard.tsx
│       │   │   │   └── ReferenceUploader.tsx
│       │   │   ├── illustrations/
│       │   │   │   ├── IllustrationEditor.tsx
│       │   │   │   ├── PageThumbnail.tsx
│       │   │   │   └── GenerationProgress.tsx
│       │   │   ├── compose/
│       │   │   │   ├── ComposeEditor.tsx
│       │   │   │   ├── PageCanvas.tsx
│       │   │   │   ├── TextOverlay.tsx
│       │   │   │   └── FontPicker.tsx
│       │   │   ├── export/
│       │   │   │   ├── ExportView.tsx
│       │   │   │   └── ExportSettings.tsx
│       │   │   └── ai-edit/
│       │   │       ├── AIEditModal.tsx
│       │   │       └── SelectionToolbar.tsx
│       │   ├── hooks/
│       │   │   ├── useStores.ts
│       │   │   ├── useUndo.ts
│       │   │   ├── useUndo.test.ts
│       │   │   ├── useSelection.ts
│       │   │   └── useGeneration.ts
│       │   ├── api/
│       │   │   ├── client.ts
│       │   │   ├── client.test.ts
│       │   │   ├── projects.ts
│       │   │   ├── generation.ts
│       │   │   └── images.ts
│       │   ├── styles/
│       │   │   ├── theme.ts
│       │   │   ├── globalStyles.ts
│       │   │   └── mixins.ts
│       │   └── utils/
│       │       ├── patch.ts
│       │       ├── patch.test.ts
│       │       └── formatting.ts
│       ├── public/
│       │   └── index.html
│       ├── package.json
│       └── tsconfig.json
│
├── projects/                      # Local project storage (gitignored)
│   └── {project-id}/
│       ├── project.json
│       └── images/
│
└── test-fixtures/                 # Shared test data factories
    ├── factories.ts               # Functions to create test data
    ├── builders.ts                # Builder pattern for complex objects
    └── sample-images/
        └── placeholder.png
```

---

## Key Implementation Details

### Undo/Redo Implementation

Using JSON Patch (RFC 6902) for efficient state diffs:

```typescript
// HistoryManager.ts
import { applyPatch, compare } from "fast-json-patch";

class HistoryManager<T> {
    private history: HistoryEntry<T>[] = [];
    private currentIndex = -1;
    private maxHistory = 100;

    recordChange(previousState: T, newState: T, description: string, metadata?: any): void {
        // Remove any redo history
        this.history = this.history.slice(0, this.currentIndex + 1);

        // Create patches
        const patch = compare(previousState, newState);
        const inversePatch = compare(newState, previousState);

        this.history.push({
            id: generateId(),
            timestamp: new Date().toISOString(),
            description,
            patch,
            inversePatch,
            metadata,
        });

        this.currentIndex++;

        // Trim old history
        if (this.history.length > this.maxHistory) {
            this.history.shift();
            this.currentIndex--;
        }
    }

    undo(currentState: T): T | null {
        if (this.currentIndex < 0) return null;

        const entry = this.history[this.currentIndex];
        const newState = applyPatch(structuredClone(currentState), entry.inversePatch).newDocument;

        this.currentIndex--;
        return newState;
    }

    redo(currentState: T): T | null {
        if (this.currentIndex >= this.history.length - 1) return null;

        this.currentIndex++;
        const entry = this.history[this.currentIndex];
        const newState = applyPatch(structuredClone(currentState), entry.patch).newDocument;

        return newState;
    }

    canUndo(): boolean {
        return this.currentIndex >= 0;
    }

    canRedo(): boolean {
        return this.currentIndex < this.history.length - 1;
    }
}
```

### Storage Adapter (Filesystem)

```typescript
// filesystem.adapter.ts
import fs from "fs-extra";
import path from "path";

export class FilesystemStorageAdapter implements IStorageAdapter {
    constructor(private basePath: string) {}

    private projectPath(projectId: string): string {
        return path.join(this.basePath, projectId);
    }

    private projectFile(projectId: string): string {
        return path.join(this.projectPath(projectId), "project.json");
    }

    async createProject(projectId: string, metadata: ProjectMetadata): Promise<void> {
        const projectDir = this.projectPath(projectId);
        await fs.ensureDir(projectDir);
        await fs.ensureDir(path.join(projectDir, "images", "character-sheets"));
        await fs.ensureDir(path.join(projectDir, "images", "pages"));
        await fs.ensureDir(path.join(projectDir, "images", "composed"));
        await fs.ensureDir(path.join(projectDir, "images", "references"));
        await fs.ensureDir(path.join(projectDir, "exports"));

        const initialState: ProjectState = {
            id: projectId,
            ...metadata,
            currentStage: "outline",
            outline: null,
            manuscript: null,
            artStyle: null,
            pageImages: [],
            composedPages: [],
        };

        await fs.writeJson(this.projectFile(projectId), initialState, { spaces: 2 });
    }

    async loadProject(projectId: string): Promise<ProjectState> {
        return fs.readJson(this.projectFile(projectId));
    }

    async saveProject(projectId: string, state: ProjectState): Promise<void> {
        state.updatedAt = new Date().toISOString();
        await fs.writeJson(this.projectFile(projectId), state, { spaces: 2 });
    }

    async saveImage(projectId: string, category: ImageCategory, imageId: string, buffer: Buffer): Promise<string> {
        const imagePath = path.join(this.projectPath(projectId), "images", category, `${imageId}.png`);
        await fs.writeFile(imagePath, buffer);
        return imagePath;
    }

    async loadImage(projectId: string, category: ImageCategory, imageId: string): Promise<Buffer> {
        const imagePath = path.join(this.projectPath(projectId), "images", category, `${imageId}.png`);
        return fs.readFile(imagePath);
    }

    // ... other methods
}
```

### Text Generation Adapter (Claude)

```typescript
// claude.adapter.ts
import Anthropic from "@anthropic-ai/sdk";

type ClaudeModel = "claude-opus-4-5-20251101" | "claude-sonnet-4-5-20250929";

export class ClaudeTextAdapter implements ITextGenerationAdapter {
    private client: Anthropic;
    private modelId: ClaudeModel;

    constructor(apiKey: string, modelId: ClaudeModel = "claude-opus-4-5-20251101") {
        this.client = new Anthropic({ apiKey });
        this.modelId = modelId;
    }

    async generateText(
        systemPrompt: string,
        userPrompt: string,
        options?: TextGenOptions
    ): Promise<TextGenerationResponse> {
        const response = await this.client.messages.create({
            model: this.modelId,
            max_tokens: options?.maxTokens || 4096,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }],
            ...(options?.temperature && { temperature: options.temperature }),
            ...(options?.stopSequences && { stop_sequences: options.stopSequences }),
        });

        // Extract text from response
        const textContent = response.content.find((block) => block.type === "text");
        if (!textContent || textContent.type !== "text") {
            throw new Error("No text in response");
        }

        return {
            text: textContent.text,
            usage: {
                inputTokens: response.usage.input_tokens,
                outputTokens: response.usage.output_tokens,
            },
            stopReason: response.stop_reason as any,
        };
    }

    async generateStructured<T>(
        systemPrompt: string,
        userPrompt: string,
        schema: JSONSchema,
        options?: TextGenOptions
    ): Promise<T> {
        // Append JSON instruction to system prompt
        const jsonSystemPrompt = `${systemPrompt}

IMPORTANT: You must respond with valid JSON matching this schema:
${JSON.stringify(schema, null, 2)}

Respond ONLY with the JSON object, no other text.`;

        const response = await this.generateText(jsonSystemPrompt, userPrompt, options);

        // Parse and validate JSON
        try {
            const parsed = JSON.parse(response.text);
            // TODO: Validate against schema
            return parsed as T;
        } catch (e) {
            throw new Error(`Failed to parse structured response: ${e}`);
        }
    }

    async *streamText(systemPrompt: string, userPrompt: string, options?: TextGenOptions): AsyncIterable<string> {
        const stream = this.client.messages.stream({
            model: this.modelId,
            max_tokens: options?.maxTokens || 4096,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }],
        });

        for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                yield event.delta.text;
            }
        }
    }

    getModelInfo(): TextModelInfo {
        const models: Record<ClaudeModel, TextModelInfo> = {
            "claude-opus-4-5-20251101": {
                id: "claude-opus-4-5-20251101",
                name: "Claude Opus 4.5",
                provider: "anthropic",
                maxContextTokens: 200000,
                costPer1MInputTokens: 5,
                costPer1MOutputTokens: 25,
                supportsStreaming: true,
                supportsStructuredOutput: true,
            },
            "claude-sonnet-4-5-20250929": {
                id: "claude-sonnet-4-5-20250929",
                name: "Claude Sonnet 4.5",
                provider: "anthropic",
                maxContextTokens: 200000,
                costPer1MInputTokens: 3,
                costPer1MOutputTokens: 15,
                supportsStreaming: true,
                supportsStructuredOutput: true,
            },
        };
        return models[this.modelId];
    }
}
```

### Image Generation Adapter (Gemini)

```typescript
// gemini.adapter.ts
import { GoogleGenAI } from "@google/genai";

type GeminiModel = "gemini-2.5-flash-image" | "gemini-3-pro-image-preview";

export class GeminiImageAdapter implements IImageGenerationAdapter {
    private client: GoogleGenAI;
    private modelId: GeminiModel;
    private sessions: Map<string, GeminiSession> = new Map();

    constructor(apiKey: string, modelId: GeminiModel = "gemini-2.5-flash-image") {
        this.client = new GoogleGenAI({ apiKey });
        this.modelId = modelId;
    }

    async generateImage(prompt: string, options: ImageGenOptions): Promise<GeneratedImage> {
        const response = await this.client.models.generateContent({
            model: this.modelId,
            contents: prompt,
            config: {
                responseModalities: options.responseModalities || ["IMAGE"],
                // Gemini 3 Pro supports resolution config
                ...(this.modelId === "gemini-3-pro-image-preview" &&
                    options.resolution && {
                        imageConfig: { outputSize: options.resolution },
                    }),
            },
        });

        // Extract image from response
        const images = this.extractImages(response);
        if (images.length === 0) {
            throw new Error("No image generated");
        }

        return images[0];
    }

    async generateWithReference(
        prompt: string,
        referenceImages: ReferenceImage[],
        options: ImageGenOptions
    ): Promise<GeneratedImage> {
        // Build content parts with images and text
        const parts: any[] = [];

        // Add reference images first
        for (const ref of referenceImages) {
            parts.push({
                inlineData: {
                    data: ref.buffer.toString("base64"),
                    mimeType: ref.mimeType,
                },
            });
            if (ref.description) {
                parts.push({ text: `[Reference - ${ref.purpose}: ${ref.description}]` });
            }
        }

        // Add the main prompt
        parts.push({ text: prompt });

        const response = await this.client.models.generateContent({
            model: this.modelId,
            contents: [{ role: "user", parts }],
            config: {
                responseModalities: options.responseModalities || ["IMAGE"],
            },
        });

        const images = this.extractImages(response);
        if (images.length === 0) {
            throw new Error("No image generated");
        }

        return images[0];
    }

    // Multi-turn chat session for iterative refinement
    createSession(): GeminiSession {
        const sessionId = crypto.randomUUID();
        const chat = this.client.chats.create({
            model: this.modelId,
            config: {
                responseModalities: ["TEXT", "IMAGE"],
            },
        });

        const session = new GeminiSession(sessionId, chat, this.modelId);
        this.sessions.set(sessionId, session);
        return session;
    }

    resumeSession(sessionId: string): GeminiSession {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        return session;
    }

    private extractImages(response: any): GeneratedImage[] {
        const images: GeneratedImage[] = [];

        for (const candidate of response.candidates || []) {
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData) {
                    images.push({
                        buffer: Buffer.from(part.inlineData.data, "base64"),
                        mimeType: part.inlineData.mimeType,
                        metadata: {
                            model: this.modelId,
                            aspectRatio: "1:1", // TODO: extract from response
                            hasSynthIdWatermark: true,
                            generationTime: Date.now(),
                        },
                    });
                }
            }
        }

        return images;
    }

    getModelInfo(): ModelInfo {
        const models: Record<GeminiModel, ModelInfo> = {
            "gemini-2.5-flash-image": {
                id: "gemini-2.5-flash-image",
                name: "Gemini 2.5 Flash",
                maxResolution: { width: 1024, height: 1024 },
                supportsReferences: true,
                maxReferences: { objects: 3, humans: 3 },
                supportedResolutions: ["1k"],
                supportsTextRendering: true,
                supportsMultiTurn: true,
            },
            "gemini-3-pro-image-preview": {
                id: "gemini-3-pro-image-preview",
                name: "Gemini 3 Pro",
                maxResolution: { width: 4096, height: 4096 },
                supportsReferences: true,
                maxReferences: { objects: 6, humans: 5 },
                supportedResolutions: ["1k", "2k", "4k"],
                supportsTextRendering: true,
                supportsMultiTurn: true,
                supportsThinking: true, // Internal reasoning mode
            },
        };
        return models[this.modelId];
    }

    getSupportedAspectRatios(): AspectRatio[] {
        return ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"];
    }

    getMaxReferenceImages(): { objects: number; humans: number } {
        return this.modelId === "gemini-3-pro-image-preview" ? { objects: 6, humans: 5 } : { objects: 3, humans: 3 };
    }
}

// Multi-turn chat session for iterative image refinement
class GeminiSession implements IGenerationSession {
    private history: ConversationTurn[] = [];
    private thoughtSignature: string | null = null;

    constructor(
        public sessionId: string,
        private chat: any, // Gemini chat instance
        private modelId: GeminiModel
    ) {}

    async send(message: string, images?: Buffer[], options?: SessionOptions): Promise<GenerationResponse> {
        const parts: any[] = [];

        // Add images if provided
        if (images) {
            for (const img of images) {
                parts.push({
                    inlineData: {
                        data: img.toString("base64"),
                        mimeType: "image/png",
                    },
                });
            }
        }

        // Add text message
        parts.push({ text: message });

        // For Gemini 3 Pro, can include thought signature for continuity
        if (this.thoughtSignature && this.modelId === "gemini-3-pro-image-preview") {
            // Include thought context in request
        }

        const response = await this.chat.sendMessage(parts);

        // Extract response
        const result: GenerationResponse = {
            images: [],
        };

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.text) {
                result.text = part.text;
            }
            if (part.inlineData) {
                result.images.push({
                    buffer: Buffer.from(part.inlineData.data, "base64"),
                    mimeType: part.inlineData.mimeType,
                    metadata: {
                        model: this.modelId,
                        aspectRatio: "1:1",
                        hasSynthIdWatermark: true,
                        generationTime: Date.now(),
                    },
                });
            }
            // Capture thought signature if present (Gemini 3 Pro)
            if (part.thoughtSignature) {
                this.thoughtSignature = part.thoughtSignature;
                result.thoughtSignature = part.thoughtSignature;
            }
        }

        // Record in history
        this.history.push({
            role: "user",
            message,
            images: images?.length || 0,
        });
        this.history.push({
            role: "assistant",
            message: result.text,
            images: result.images.length,
        });

        return result;
    }

    getHistory(): ConversationTurn[] {
        return this.history;
    }

    getThoughtContext(): string | null {
        return this.thoughtSignature;
    }
}
```

### Character Consistency Strategy

The character sheet approach works as follows:

1. **Generation Phase** (Art Style Stage):

    - For each character, generate multiple views using detailed prompts
    - Views: front, side, back, action pose, expression sheet
    - User can regenerate until satisfied
    - Final character sheets are saved as reference images

2. **Usage Phase** (Page Illustration Stage):
    - When generating a page, include relevant character sheet images
    - Prompt explicitly references the character sheets
    - For models that support it, use image-to-image or reference features

```typescript
async function generatePageWithCharacterRefs(
    page: ManuscriptPage,
    characterSheets: CharacterSheet[],
    artStyle: ArtStyle,
    adapter: IImageGenerationAdapter
): Promise<Buffer> {
    // Gather reference images for characters in this page
    const characterRefs: Buffer[] = [];
    const characterDescriptions: string[] = [];

    for (const charId of page.characters) {
        const sheet = characterSheets.find((c) => c.characterId === charId);
        if (sheet) {
            // Get front view and action view as primary references
            const frontView = sheet.views.find((v) => v.viewType === "front");
            const actionView = sheet.views.find((v) => v.viewType === "action");

            if (frontView) {
                characterRefs.push(await loadImage(frontView.imagePath));
            }
            if (actionView) {
                characterRefs.push(await loadImage(actionView.imagePath));
            }

            characterDescriptions.push(`${sheet.characterName}: ${sheet.consolidatedDescription}`);
        }
    }

    const prompt = buildPagePrompt(page, characterDescriptions, artStyle);

    return adapter.generateWithReference(prompt, characterRefs, {
        width: 1024,
        height: 1024,
        style: artStyle.styleDescription,
    });
}
```

---

## Testing Strategy

### Core Principles

1. **Tests must not break when adding data** - Adding a new model, stage, or input type should not require updating existing tests
2. **Test behavior, not implementation** - Test what the code does, not how it does it
3. **Use factories, not fixtures** - Generate test data programmatically to avoid coupling to specific values
4. **Mock at boundaries** - Mock external APIs (Claude, Gemini), not internal modules

### Test Data Factories

Instead of hardcoded test data, use factory functions:

```typescript
// test-fixtures/factories.ts

// Creates a valid project with sensible defaults
// Can override any field without breaking other tests
export function createTestProject(overrides: Partial<Project> = {}): Project {
  return {
    id: `test-${Date.now()}`,
    name: 'Test Project',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings: createTestSettings(overrides.settings),
    currentStage: 'outline',
    stageInputs: {},
    outline: null,
    manuscript: null,
    artStyle: null,
    pageImages: [],
    composedPages: [],
    ...overrides
  };
}

export function createTestSettings(overrides: Partial<ProjectSettings> = {}): ProjectSettings {
  return {
    targetAge: '3-5',
    targetPageCount: 16,
    bookDimensions: { width: 8.5, height: 8.5 },
    aspectRatio: '1:1',
    toneKeywords: ['whimsical'],
    artStyleKeywords: ['watercolor'],
    imageModel: getDefaultImageModel(),  // Gets current default, not hardcoded
    textModel: getDefaultTextModel(),
    imageResolution: '1k',
    generationMode: 'sequential',
    textComposition: { strategy: 'ai-baked', textInPrompt: true },
    pipeline: createDefaultPipeline(),
    models: {
      text: getDefaultTextModel(),
      image: getDefaultImageModel()
    },
    ...overrides
  };
}

// For stages - test that ANY stage works, not specific stages
export function createTestStage(overrides: Partial<StageDefinition> = {}): StageDefinition {
  return {
    id: `test-stage-${Date.now()}`,
    name: 'Test Stage',
    description: 'A test stage',
    requiredStages: [],
    optionalInputFrom: [],
    isRequired: true,
    canRevisit: true,
    showInputForm: 'always',
    generateLabel: 'Generate',
    inputs: [],
    component: () => null,
    isComplete: () => false,
    canEnter: () => true,
    validateInputs: () => ({ valid: true, errors: [] }),
    ...overrides
  };
}
```

### What to Test vs What Not to Test

**DO test (behavior-based):**
```typescript
// Good: Tests that registry works with ANY models
describe('ModelRegistry', () => {
  it('returns adapter for any registered model', () => {
    const registry = new ModelRegistry();
    const mockConfig = createTestModelConfig({ id: 'test-model' });
    registry.registerTextModel(mockConfig);

    const adapter = registry.getTextAdapter('test-model');
    expect(adapter).toBeDefined();
  });

  it('throws for unregistered model', () => {
    const registry = new ModelRegistry();
    expect(() => registry.getTextAdapter('nonexistent')).toThrow();
  });

  it('lists all registered models', () => {
    const registry = new ModelRegistry();
    registry.registerTextModel(createTestModelConfig({ id: 'model-1' }));
    registry.registerTextModel(createTestModelConfig({ id: 'model-2' }));

    const models = registry.listTextModels();
    expect(models).toHaveLength(2);
  });
});
```

**DON'T test (fragile, data-coupled):**
```typescript
// Bad: Breaks when we add/remove models
describe('ModelRegistry', () => {
  it('has claude-opus-4-5 as default', () => {
    const registry = new ModelRegistry();
    expect(registry.getDefaultTextModel()).toBe('claude-opus-4-5');  // FRAGILE!
  });

  it('contains exactly 3 text models', () => {
    const registry = new ModelRegistry();
    expect(registry.listTextModels()).toHaveLength(3);  // FRAGILE!
  });
});
```

### Testing Adapters (Interface Compliance)

Test that ALL adapters implement the interface correctly, without testing specific implementations:

```typescript
// adapters.test.ts
import { getAllTextAdapters } from './index';

describe('Text Generation Adapters', () => {
  // This test automatically covers ALL adapters, including future ones
  const adapters = getAllTextAdapters();

  adapters.forEach(({ name, createAdapter }) => {
    describe(name, () => {
      it('implements generateText', async () => {
        const adapter = createAdapter('mock-key');
        expect(typeof adapter.generateText).toBe('function');
      });

      it('implements generateStructured', async () => {
        const adapter = createAdapter('mock-key');
        expect(typeof adapter.generateStructured).toBe('function');
      });

      it('implements getModelInfo', () => {
        const adapter = createAdapter('mock-key');
        const info = adapter.getModelInfo();
        expect(info).toHaveProperty('id');
        expect(info).toHaveProperty('name');
        expect(info).toHaveProperty('provider');
      });
    });
  });
});
```

### Testing Stages (Pipeline Behavior)

```typescript
// stages.test.ts
describe('Stage Pipeline', () => {
  it('validates required stages are complete before allowing entry', () => {
    const stage = createTestStage({
      requiredStages: ['outline'],
      canEnter: (project) => project.outline !== null
    });

    const incompleteProject = createTestProject({ outline: null });
    const completeProject = createTestProject({ outline: createTestOutline() });

    expect(stage.canEnter(incompleteProject)).toBe(false);
    expect(stage.canEnter(completeProject)).toBe(true);
  });

  it('supports optional stages being skipped', () => {
    const stage = createTestStage({ isRequired: false });
    expect(stage.isRequired).toBe(false);
    // Test skip behavior, not specific stage names
  });

  it('renders input form based on showInputForm setting', () => {
    // Test all three modes work, not specific stages
    const alwaysShow = createTestStage({ showInputForm: 'always' });
    const neverShow = createTestStage({ showInputForm: 'never' });
    const optionalShow = createTestStage({ showInputForm: 'optional' });

    // Assert form visibility behavior
  });
});
```

### Integration Tests

```typescript
// app.integration.test.ts
describe('Generation Pipeline', () => {
  it('can generate from topic to export using mock adapters', async () => {
    const app = createTestApp({
      textAdapter: new MockTextAdapter(),
      imageAdapter: new MockImageAdapter(),
      storage: new MockStorageAdapter()
    });

    // Create project
    const project = await app.createProject({ topic: 'test story' });

    // Run through pipeline
    await app.generateOutline(project.id);
    await app.generateManuscript(project.id);
    await app.generateIllustrations(project.id);
    const pdf = await app.exportPdf(project.id);

    expect(pdf).toBeDefined();
  });
});
```

### Mock Adapters for Testing

```typescript
// mock.adapter.ts
export class MockTextAdapter implements ITextGenerationAdapter {
  async generateText(system: string, user: string): Promise<TextGenerationResponse> {
    return {
      text: `Mock response for: ${user.substring(0, 50)}...`,
      usage: { inputTokens: 100, outputTokens: 50 },
      stopReason: 'end_turn'
    };
  }

  async generateStructured<T>(system: string, user: string, schema: any): Promise<T> {
    // Return minimal valid object matching schema
    return {} as T;
  }

  async *streamText(system: string, user: string) {
    yield 'Mock ';
    yield 'streamed ';
    yield 'response';
  }

  getModelInfo(): TextModelInfo {
    return {
      id: 'mock-model',
      name: 'Mock Model',
      provider: 'anthropic',
      maxContextTokens: 100000,
      costPer1MInputTokens: 0,
      costPer1MOutputTokens: 0,
      supportsStreaming: true,
      supportsStructuredOutput: true
    };
  }
}
```

### E2E Tests (Cypress/Playwright)

Focus on user journeys, not implementation details:

```typescript
// e2e/create-book.spec.ts
describe('Create a storybook', () => {
  it('allows user to create a book from start to finish', () => {
    cy.visit('/');
    cy.contains('New Project').click();

    // Enter topic (works regardless of exact form fields)
    cy.get('[data-testid="topic-input"]').type('A friendly dragon');
    cy.contains('Generate Outline').click();

    // Wait for and verify outline exists (not specific content)
    cy.get('[data-testid="outline-content"]').should('exist');
    cy.contains('Continue').click();

    // Continue through stages...
    // Test that stages complete, not specific outputs
  });
});
```

---

## Environment Variables

```env
# Server
PORT=3001
NODE_ENV=development

# Storage
PROJECTS_BASE_PATH=./projects

# ===========================================
# AI Provider API Keys
# ===========================================

# Anthropic (Claude) - Required for text generation
ANTHROPIC_API_KEY=sk-ant-...

# Google AI (Gemini) - Required for image generation
GOOGLE_AI_API_KEY=...

# OpenAI (Optional) - Alternative text/image models
OPENAI_API_KEY=sk-...

# ===========================================
# Default Model Selection
# ===========================================

# Text generation model (change to switch default)
# Options: claude-opus-4-5, claude-sonnet-4-5, gpt-4-turbo
DEFAULT_TEXT_MODEL=claude-opus-4-5

# Image generation model (change to switch default)
# Options: gemini-3-pro, gemini-2-5-flash, dalle-3
DEFAULT_IMAGE_MODEL=gemini-3-pro

# ===========================================
# Generation Defaults
# ===========================================
DEFAULT_ASPECT_RATIO=3:4
DEFAULT_TEXT_STRATEGY=ai-baked
DEFAULT_PAGE_COUNT=16
DEFAULT_IMAGE_RESOLUTION=4k

# ===========================================
# Client
# ===========================================
CLIENT_URL=http://localhost:3000
```

### API Key Requirements by Model

| Model             | Required API Key | Environment Variable |
| ----------------- | ---------------- | -------------------- |
| Claude Opus 4.5   | Anthropic        | `ANTHROPIC_API_KEY`  |
| Claude Sonnet 4.5 | Anthropic        | `ANTHROPIC_API_KEY`  |
| GPT-4 Turbo       | OpenAI           | `OPENAI_API_KEY`     |
| Gemini 3 Pro      | Google AI        | `GOOGLE_AI_API_KEY`  |
| Gemini 2.5 Flash  | Google AI        | `GOOGLE_AI_API_KEY`  |
| DALL-E 3          | OpenAI           | `OPENAI_API_KEY`     |

**Minimum required for MVP:** `ANTHROPIC_API_KEY` + `GOOGLE_AI_API_KEY`

---

## Open Questions / Future Considerations

1. **Cost Management**: Should there be generation limits? Cost tracking per project?

2. **Queue System**: For heavy usage, may need Redis + Bull for job queuing

3. **Image Upscaling**: Generated images may need upscaling for print quality

4. **Localization**: Support for non-English books?

5. **Templates**: Pre-built story templates (adventure, bedtime, educational)?

6. **Collaboration**: Real-time multi-user editing (would require significant architecture changes)

7. **Version History**: Beyond undo/redo, named versions/snapshots?

8. **Mobile Support**: Tablet-friendly editing experience?

---

## Estimated Complexity by Phase

| Phase   | Complexity | Core Features                          |
| ------- | ---------- | -------------------------------------- |
| Phase 1 | Medium     | End-to-end pipeline with AI-baked text |
| Phase 2 | Low        | Flexible pipeline, stage skipping      |
| Phase 3 | Low        | Manual editing, undo/redo              |
| Phase 4 | Medium     | AI-assisted text editing               |
| Phase 5 | Medium     | Multi-turn image refinement sessions   |
| Phase 6 | High       | Character sheets, consistency system   |
| Phase 7 | High       | Multiple text composition strategies   |
| Phase 8 | Medium     | Model selection, parallel generation   |
| Phase 9 | Medium     | Polish and production features         |

---

## Getting Started (Phase 1)

### Prerequisites

-   Node.js 18+
-   npm or yarn
-   **Anthropic API key** (for Claude Opus 4.5)
-   **Google AI API key** (for Gemini 3 Pro)

### Required SDKs

```bash
# Text generation (Claude)
npm install @anthropic-ai/sdk

# Image generation (Gemini)
npm install @google/genai

# Optional alternatives
npm install openai  # For GPT-4 / DALL-E
```

### Setup Steps

1. **Initialize monorepo**

    ```bash
    mkdir storybook-generator && cd storybook-generator
    npm init -y
    # Configure workspaces in package.json
    ```

2. **Create package structure**

    ```bash
    mkdir -p packages/{shared,server,client}
    ```

3. **Set up shared types package**

    - Define core interfaces (Project, Outline, Manuscript, etc.)
    - Export TypeScript types for use by server and client

4. **Create Express server**

    - Basic routes for projects and generation
    - Filesystem storage adapter
    - **Claude text adapter** (Opus 4.5 for creative writing)
    - **Gemini image adapter** (3 Pro for images with text)
    - Model registry for easy switching

5. **Create React client**

    - Basic MobX store setup
    - Simple wizard UI (4 stages for MVP)
    - Model selector in settings
    - API client

6. **Implement core generation flow**

    - Outline generation from topic (Claude)
    - Manuscript generation from outline (Claude)
    - Page image generation with text baked in (Gemini)
    - PDF export

7. **Test end-to-end**
    - Enter topic → Get PDF storybook
    - Verify text is readable in generated images
    - Try switching models if multiple API keys configured

### First Working Demo Target

A user should be able to:

1. Enter a topic like "A curious rabbit learns to share"
2. Click through generated outline and manuscript (read-only)
3. See generated page images with text already on them
4. Download a PDF of the complete storybook
5. **Optionally**: Switch between Claude models in settings

This proves the core value proposition before adding editing features.

### Model Switching Quick Test

After setup, verify model switching works:

```typescript
// Quick test in server console
import { modelRegistry } from "./models/registry";

// List available models
console.log("Text models:", modelRegistry.listTextModels());
console.log("Image models:", modelRegistry.listImageModels());

// Get default adapters
const textAdapter = modelRegistry.getTextAdapter("claude-opus-4-5");
const imageAdapter = modelRegistry.getImageAdapter("gemini-3-pro");

// Switch to faster/cheaper model
const fastTextAdapter = modelRegistry.getTextAdapter("claude-sonnet-4-5");
```
