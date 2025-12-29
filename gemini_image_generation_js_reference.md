# Gemini Image Generation (JavaScript)

**Technical Reference for AI Agents**  
_Children’s storybook illustrations using text + image context_

---

## Purpose

This document summarizes how to use **Gemini image-generation models** from JavaScript to create **consistent children’s book illustrations** using:

-   Page text
-   Prior story context
-   Previous illustrations
-   Reference/style images (characters, palette, environments)

It is intended as a **concise implementation reference** for an AI agent.

---

## Recommended Models

### `gemini-2.5-flash-image`

-   Fast, lower cost
-   Fixed-ish ~1024px output
-   Good for rapid drafts, thumbnails, iteration

### `gemini-3-pro-image-preview`

-   Higher quality, best for final art
-   Supports larger outputs (1K / 2K / 4K)
-   Better instruction-following and consistency

**Note:** All generated images include a **SynthID watermark**.

---

## JavaScript SDK Basics

-   Package: `@google/genai`
-   Client: `GoogleGenAI`

Core call shape:

```
ai.models.generateContent({
  model,
  contents,
  config?
})
```

Responses return **parts**:

-   `part.text` → text output
-   `part.inlineData` → base64 image data + MIME type

Agents should **always parse mixed outputs**, even if requesting images only.

---

## Text → Image (Single Illustration)

Use when generating a page illustration from text only.

-   `contents`: a single prompt string
-   `model`: `gemini-2.5-flash-image` or `gemini-3-pro-image-preview`

Example use cases:

-   First concept art
-   Standalone illustrations
-   Prompt exploration

---

## Image-to-Image / Image Editing (Critical for Storybooks)

Use this to maintain **visual continuity** across pages.

### How it works

`contents` becomes an **array of parts**:

-   Text instructions
-   One or more inline images (base64)

```
contents: [{
  role: "user",
  parts: [
    { text: "Illustrate page 5: Rosie and Lalo enter the snowy forest…" },
    { inlineData: { mimeType: "image/png", data: "<base64>" } }
  ]
}]
```

Supported edits via natural language:

-   Preserve characters, pose, outfits
-   Adjust facial expressions
-   Change lighting / time of day
-   Extend background or scene

---

## Multi‑Turn Chat (Strongly Recommended)

For full books, use a **single chat session**.

Benefits:

-   Maintains style + character memory
-   Reduces repetition in prompts
-   Improves consistency across pages

```
const chat = ai.chats.create({
  model: "gemini-3-pro-image-preview",
  config: {
    responseModalities: ["TEXT", "IMAGE"]
  }
})
```

Each page = `chat.sendMessage({ message })`

---

## Controlling Output Modality

Use `responseModalities` in `config`:

-   `['IMAGE']` → image‑focused responses
-   `['TEXT','IMAGE']` → mixed (recommended)

Even image‑only requests may still return text metadata.

---

## Image Size & Aspect Ratio

Configure via `imageConfig`:

-   `aspectRatio`: `"1:1"`, `"4:5"`, `"16:9"`, etc.
-   `imageSize`: `"1K" | "2K" | "4K"` (Pro Image only)

Defaults:

-   Image editing → matches input image size
-   Text‑only → defaults to square

---

## Recommended Storybook Page Strategy

### One‑time Setup (Page 1)

-   Lock art style
-   Define character invariants
-   Establish color palette + mood
-   Optionally upload a style reference image

### Per‑Page Generation

Each page message should include:

1. **Page text** (exact narrative)
2. **Scene instructions** (composition, emotion, focus)
3. **Constraints** (do not change character design)
4. **Inline reference images**:
    - Previous page illustration
    - Character sheet (optional)

Store:

-   Generated image bytes
-   Any returned textual notes (often useful as art direction)

---

## Practical Agent Notes

-   Always attach **only the minimum number of images** needed (1–3 is ideal)
-   Prefer **chat memory** over re‑describing style every page
-   Treat Gemini text output as optional metadata
-   Cache character reference images aggressively

---

_Source: Google Gemini Image Generation API (JavaScript): https://ai.google.dev/gemini-api/docs/image-generation_
