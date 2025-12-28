import { TargetAge, Outline, OutlineFeedback } from '@storybook-generator/shared';

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

export function getOutlineRefinePrompt(currentOutline: Outline, feedback: OutlineFeedback): string {
  const feedbackParts: string[] = [];

  if (feedback.overall) {
    feedbackParts.push(`Overall feedback: ${feedback.overall}`);
  }

  if (feedback.title) {
    feedbackParts.push(`Title feedback: ${feedback.title}`);
  }

  if (feedback.synopsis) {
    feedbackParts.push(`Synopsis feedback: ${feedback.synopsis}`);
  }

  if (feedback.theme) {
    feedbackParts.push(`Theme feedback: ${feedback.theme}`);
  }

  if (feedback.setting) {
    feedbackParts.push(`Setting feedback: ${feedback.setting}`);
  }

  if (feedback.characters && Object.keys(feedback.characters).length > 0) {
    for (const [charId, charFeedback] of Object.entries(feedback.characters)) {
      const character = currentOutline.characters.find(c => c.id === charId);
      const charName = character?.name || charId;
      feedbackParts.push(`Character "${charName}" feedback: ${charFeedback}`);
    }
  }

  if (feedback.plotPoints && Object.keys(feedback.plotPoints).length > 0) {
    for (const [plotId, plotFeedback] of Object.entries(feedback.plotPoints)) {
      const plotPoint = currentOutline.plotPoints.find(p => p.id === plotId);
      const plotTitle = plotPoint?.title || plotId;
      feedbackParts.push(`Plot point "${plotTitle}" feedback: ${plotFeedback}`);
    }
  }

  return `Here is the current outline:

${JSON.stringify(currentOutline, null, 2)}

Please refine this outline based on the following feedback:

${feedbackParts.join('\n\n')}

Respond with the complete refined outline in the same JSON format, incorporating all the requested changes while maintaining the story's coherence. Keep any elements that weren't mentioned in the feedback unchanged unless they need to be adjusted for consistency.`;
}
