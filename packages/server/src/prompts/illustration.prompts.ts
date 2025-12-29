import { ManuscriptPage, Character, Setting, TargetAge, Outline } from '@storybook-generator/shared';

export interface IllustrationPromptContext {
  page: ManuscriptPage;
  characters: Character[];
  setting: Setting;
  targetAge: TargetAge;
  artStyleKeywords: string[];
  fontStyle: string;
  includeTextInImage: boolean;
}

export interface CoverPromptContext {
  outline: Outline;
  characters: Character[];
  setting: Setting;
  targetAge: TargetAge;
  artStyleKeywords: string[];
  fontStyle: string;
}

export function getIllustrationPrompt(context: IllustrationPromptContext): string {
  const {
    page,
    characters,
    setting,
    targetAge,
    artStyleKeywords,
    fontStyle,
    includeTextInImage,
  } = context;

  // Get characters appearing in this page
  const pageCharacters = characters.filter(c => page.characters.includes(c.id));

  let prompt = `Create a children's book illustration for ages ${targetAge}.

Art Style: ${artStyleKeywords.join(', ')}, suitable for a children's picture book, warm and inviting colors, professional quality illustration.`;

  // Add character reference section FIRST for consistency priority
  if (pageCharacters.length > 0) {
    prompt += `\n\n=== CHARACTER REFERENCE (MUST FOLLOW EXACTLY) ===
These are the official character designs. You MUST depict each character EXACTLY as described below to maintain visual consistency throughout the book:`;
    for (const char of pageCharacters) {
      prompt += `\n\n${char.name.toUpperCase()}:
${char.physicalDescription}`;
    }
    prompt += `\n\n=== END CHARACTER REFERENCE ===
CRITICAL: The character descriptions above are the canonical reference. Every detail (colors, clothing, features, proportions) must match exactly.`;
  }

  prompt += `\n\nScene Description:
${page.illustrationDescription}

Mood: ${page.mood}
Action: ${page.action}

Setting:
- Location: ${setting.location}
- Atmosphere: ${setting.atmosphere}
- Visual Details: ${setting.visualDetails}`;

  if (includeTextInImage && page.text) {
    prompt += `\n\nTEXT TO INCLUDE IN THE IMAGE:
"${page.text}"

Text rendering instructions:
- Render the text as part of the illustration
- Font style: ${fontStyle} (friendly, child-appropriate)
- Text placement: ${page.textPlacement === 'top' ? 'at the top of the image' : page.textPlacement === 'bottom' ? 'at the bottom of the image' : 'integrated naturally into the scene'}
- Text must be clearly legible against the background
- Add a subtle semi-transparent background behind the text if needed for readability
- Text color should complement the illustration
- Make the text a natural, harmonious part of the overall composition

IMPORTANT: The text is essential - it must be included and fully readable.`;
  }

  prompt += `\n\nIMPORTANT: This is for a children's book. The illustration should be:
- Age-appropriate and child-friendly
- Warm, inviting, and not scary
- Professional picture book quality
- Cohesive with a consistent art style
- Characters MUST match their reference descriptions exactly (same colors, clothing, features, proportions on every page)`;

  return prompt;
}

export function getCoverPrompt(context: CoverPromptContext): string {
  const {
    outline,
    characters,
    setting,
    targetAge,
    artStyleKeywords,
    fontStyle,
  } = context;

  // Get the protagonist for the cover
  const protagonist = characters.find(c => c.role === 'protagonist') || characters[0];

  let prompt = `Create a FRONT COVER illustration for a children's picture book for ages ${targetAge}.

This is a BOOK COVER - it needs to be eye-catching, iconic, and work as a standalone image that makes people want to read the book.

Art Style: ${artStyleKeywords.join(', ')}, suitable for a children's picture book cover, vibrant and eye-catching, professional quality illustration.`;

  // Add character reference
  if (protagonist) {
    prompt += `\n\n=== MAIN CHARACTER REFERENCE (MUST FOLLOW EXACTLY) ===
${protagonist.name.toUpperCase()}:
${protagonist.physicalDescription}
=== END CHARACTER REFERENCE ===
CRITICAL: The character must match this description exactly.`;
  }

  prompt += `\n\nCover Scene Description:
${outline.coverDescription}

Setting:
- Location: ${setting.location}
- Atmosphere: ${setting.atmosphere}
- Visual Details: ${setting.visualDetails}

TEXT TO INCLUDE ON THE COVER:
Title: "${outline.title}"
${outline.subtitle ? `Subtitle: "${outline.subtitle}"` : ''}

Text rendering instructions:
- The TITLE must be prominently displayed, large and readable
- Font style: ${fontStyle} (friendly, child-appropriate, bold for title)
- Position the title at the top third of the image
- Text must be clearly legible against the illustration
- Use a complementary text color or add subtle shadow/outline for readability
- Make the title a natural, harmonious part of the composition

IMPORTANT COVER DESIGN PRINCIPLES:
- This is a BOOK COVER - composition should be centered and impactful
- The main character should be prominent and engaging
- Leave appropriate space for the title text
- The image should convey the book's mood and appeal to children
- Professional children's book cover quality`;

  return prompt;
}

export function getBackCoverPrompt(context: CoverPromptContext): string {
  const {
    outline,
    characters,
    setting,
    targetAge,
    artStyleKeywords,
    fontStyle,
  } = context;

  // Get the protagonist for consistency
  const protagonist = characters.find(c => c.role === 'protagonist') || characters[0];

  let prompt = `Create a BACK COVER illustration for a children's picture book for ages ${targetAge}.

This is the BACK of the book cover - it should be complementary to the front, with a simpler composition that works well with text overlaid.

Art Style: ${artStyleKeywords.join(', ')}, suitable for a children's picture book, softer and more subdued than the front cover, professional quality illustration.`;

  // Add character reference if they appear
  if (protagonist) {
    prompt += `\n\n=== MAIN CHARACTER REFERENCE (MUST FOLLOW EXACTLY) ===
${protagonist.name.toUpperCase()}:
${protagonist.physicalDescription}
=== END CHARACTER REFERENCE ===
CRITICAL: If the character appears, they must match this description exactly.`;
  }

  prompt += `\n\nBack Cover Scene Description:
${outline.backCoverDescription}

Setting:
- Location: ${setting.location}
- Atmosphere: ${setting.atmosphere}

TEXT TO INCLUDE ON THE BACK COVER:
"${outline.backCoverBlurb}"

Text rendering instructions:
- The blurb text should be readable and well-positioned
- Font style: ${fontStyle} (friendly, child-appropriate)
- Position the text in the upper half or center of the image
- Leave the bottom area relatively clear (for barcode placement in real books)
- Text must be clearly legible - use a text box or cleared area if needed
- Text color should complement the illustration

IMPORTANT BACK COVER DESIGN PRINCIPLES:
- This is a BACK COVER - composition should be simpler than the front
- The illustration should complement, not compete with, the text
- A quieter, more contemplative scene works well
- Can show the character from behind, a scene detail, or the setting
- Professional children's book quality`;

  return prompt;
}
