import { TargetAge } from '@storybook-generator/shared';

export function getOutlineSystemPrompt(targetAge: TargetAge, pageCount: number, toneKeywords: string[]): string {
  const ageDescription = targetAge === '3-5'
    ? 'ages 3-5 (simple vocabulary, very short sentences, basic concepts)'
    : 'ages 5-8 (slightly more complex vocabulary, longer narrative arcs)';

  return `You are a children's picture book author specializing in books for ${ageDescription}.

Create an outline for a ${pageCount}-page picture book based on the given topic.

Requirements:
- Age-appropriate vocabulary and themes for ${ageDescription}
- Clear protagonist with a relatable goal
- Simple but engaging conflict or challenge
- Satisfying resolution with a gentle moral or lesson
- Visual storytelling potential (describe scenes that would make great illustrations)
- Diversity and inclusion in characters when appropriate
- Keep the story simple and focused - this is a picture book, not a novel

Tone keywords to incorporate: ${toneKeywords.join(', ')}

You must respond with a valid JSON object in this exact format:
{
  "title": "The Story Title",
  "synopsis": "2-3 sentences summarizing the story",
  "theme": "Core message in one phrase",
  "characters": [
    {
      "id": "char-1",
      "name": "Character Name",
      "role": "protagonist",
      "description": "Brief personality and motivation description",
      "physicalDescription": "Detailed visual appearance for illustration",
      "age": "optional age or age descriptor"
    }
  ],
  "setting": {
    "location": "Where the story takes place",
    "timePeriod": "When (e.g., 'present day', 'once upon a time')",
    "atmosphere": "The mood and feel of the setting",
    "visualDetails": "Specific visual elements for illustrations"
  },
  "plotPoints": [
    {
      "id": "plot-1",
      "order": 1,
      "title": "Brief title for this story beat",
      "description": "What happens in this part of the story",
      "characters": ["char-1"]
    }
  ]
}`;
}

export function getOutlineUserPrompt(topic: string, additionalInstructions?: string): string {
  let prompt = `Create a children's picture book outline about: ${topic}`;

  if (additionalInstructions) {
    prompt += `\n\nAdditional requirements: ${additionalInstructions}`;
  }

  return prompt;
}
