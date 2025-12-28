import { ManuscriptPage, Character, Setting, TargetAge } from '@storybook-generator/shared';

export interface IllustrationPromptContext {
  page: ManuscriptPage;
  characters: Character[];
  setting: Setting;
  targetAge: TargetAge;
  artStyleKeywords: string[];
  fontStyle: string;
  includeTextInImage: boolean;
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

Art Style: ${artStyleKeywords.join(', ')}, suitable for a children's picture book, warm and inviting colors, professional quality illustration.

Scene Description:
${page.illustrationDescription}

Mood: ${page.mood}
Action: ${page.action}

Setting:
- Location: ${setting.location}
- Atmosphere: ${setting.atmosphere}
- Visual Details: ${setting.visualDetails}`;

  if (pageCharacters.length > 0) {
    prompt += `\n\nCharacters in this scene:`;
    for (const char of pageCharacters) {
      prompt += `\n- ${char.name}: ${char.physicalDescription}`;
    }
  }

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
- Cohesive with a consistent art style`;

  return prompt;
}
