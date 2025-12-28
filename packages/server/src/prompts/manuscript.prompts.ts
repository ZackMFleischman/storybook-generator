import { Outline, TargetAge } from '@storybook-generator/shared';

export function getManuscriptSystemPrompt(
  targetAge: TargetAge,
  pageCount: number,
  wordsPerPage: number,
  textStyle: 'rhythmic' | 'narrative' | 'simple'
): string {
  const styleDescription = {
    rhythmic: 'rhythmic and rhyming, read-aloud friendly with a nice flow',
    narrative: 'standard storytelling narrative style',
    simple: 'very simple sentences, easy to read for early readers',
  }[textStyle];

  return `You are writing the manuscript for a children's picture book for ages ${targetAge}.

Given the outline, create the page-by-page manuscript for exactly ${pageCount} pages.

For each page, provide:
1. text: The actual text that appears on the page (or null for illustration-only pages)
   - Use ${styleDescription}
   - Target approximately ${wordsPerPage} words per page (fewer for ages 3-5)
   - Make it read-aloud friendly

2. illustrationDescription: Detailed description for the image generation AI
   - What characters are present (use their exact names)
   - What they're doing (pose, action, expression)
   - Setting details visible in this scene
   - Mood and atmosphere
   - Composition suggestions (close-up, wide shot, etc.)
   - Important: Be specific about character appearances using the outline's physical descriptions

3. mood: The emotional tone of this page
4. action: What is happening (for image generation)
5. characters: Array of character IDs appearing on this page
6. textPlacement: Where the text should appear ("top", "bottom", "overlay", or "integrated")

Maintain story pacing for a ${pageCount}-page book:
- First 20%: Setup and introduction
- Next 40%: Rising action, adventure begins
- Next 25%: Climax, challenge peaks
- Final 15%: Resolution and ending

You must respond with a valid JSON object:
{
  "pages": [
    {
      "pageNumber": 1,
      "spread": "full",
      "text": "The text for page 1...",
      "textPlacement": "bottom",
      "illustrationDescription": "Detailed description for the illustrator...",
      "characters": ["char-1"],
      "mood": "cheerful",
      "action": "Character is doing something"
    }
  ]
}`;
}

export function getManuscriptUserPrompt(outline: Outline, additionalGuidance?: string): string {
  let prompt = `Create a manuscript based on this outline:

Title: ${outline.title}
Synopsis: ${outline.synopsis}
Theme: ${outline.theme}

Characters:
${outline.characters.map(c => `- ${c.name} (${c.role}): ${c.description}
  Physical: ${c.physicalDescription}`).join('\n')}

Setting:
- Location: ${outline.setting.location}
- Atmosphere: ${outline.setting.atmosphere}
- Visual Details: ${outline.setting.visualDetails}

Plot Points:
${outline.plotPoints.map(p => `${p.order}. ${p.title}: ${p.description}`).join('\n')}`;

  if (additionalGuidance) {
    prompt += `\n\nAdditional guidance: ${additionalGuidance}`;
  }

  return prompt;
}
