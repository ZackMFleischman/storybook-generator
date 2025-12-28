import { observer } from 'mobx-react-lite';
import styled from '@emotion/styled';
import { useProjectStore, useGenerationStore, useUIStore } from '../stores/RootStore';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
`;

const TitleSection = styled.div``;

const Title = styled.h2`
  color: var(--text-primary);
  margin: 0 0 0.25rem;
`;

const Subtitle = styled.p`
  color: var(--text-secondary);
  margin: 0;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 0.75rem 1.25rem;
  background: ${props => props.variant === 'secondary' ? 'transparent' : 'var(--primary-color)'};
  color: ${props => props.variant === 'secondary' ? 'var(--text-secondary)' : 'white'};
  border: ${props => props.variant === 'secondary' ? '1px solid var(--border-color)' : 'none'};
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${props => props.variant === 'secondary' ? 'var(--background-color)' : '#4f46e5'};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Card = styled.div`
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const CardTitle = styled.h3`
  color: var(--text-primary);
  font-size: 1.125rem;
  margin: 0 0 1rem;
`;

const StoryTitle = styled.h1`
  color: var(--primary-color);
  font-size: 1.75rem;
  margin: 0 0 0.5rem;
`;

const StorySubtitle = styled.p`
  color: var(--text-secondary);
  font-style: italic;
  margin: 0 0 1rem;
`;

const Synopsis = styled.p`
  color: var(--text-primary);
  line-height: 1.6;
  margin: 0;
`;

const Theme = styled.div`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
`;

const Label = styled.span`
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const CharacterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
`;

const CharacterCard = styled.div`
  background: var(--background-color);
  border-radius: var(--radius-md);
  padding: 1rem;
`;

const CharacterName = styled.h4`
  color: var(--text-primary);
  margin: 0 0 0.25rem;
`;

const CharacterRole = styled.span`
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--primary-color);
  font-weight: 500;
`;

const CharacterDesc = styled.p`
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin: 0.5rem 0 0;
  line-height: 1.5;
`;

const SettingContent = styled.div`
  display: grid;
  gap: 0.75rem;
`;

const SettingItem = styled.div`
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 0.5rem;
`;

const SettingLabel = styled.span`
  font-weight: 500;
  color: var(--text-secondary);
  font-size: 0.875rem;
`;

const SettingValue = styled.span`
  color: var(--text-primary);
`;

const PlotList = styled.ol`
  padding-left: 1.25rem;
  margin: 0;
`;

const PlotItem = styled.li`
  margin-bottom: 1rem;
  color: var(--text-primary);
  line-height: 1.5;

  &:last-child {
    margin-bottom: 0;
  }
`;

const PlotTitle = styled.strong`
  display: block;
  margin-bottom: 0.25rem;
`;

const ErrorMessage = styled.div`
  padding: 0.75rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: var(--radius-md);
  color: var(--error-color);
  margin-bottom: 1rem;
`;

export const OutlineView = observer(function OutlineView() {
  const projectStore = useProjectStore();
  const generationStore = useGenerationStore();
  const uiStore = useUIStore();

  const outline = projectStore.currentProject?.outline;
  const isLoading = generationStore.isGenerating;

  if (!outline) {
    return (
      <Container>
        <Title>No Outline Generated</Title>
        <Button variant="secondary" onClick={() => uiStore.previousStep()}>
          Go Back
        </Button>
      </Container>
    );
  }

  const handleGenerateManuscript = async () => {
    await generationStore.generateManuscript();
  };

  return (
    <Container>
      <Header>
        <TitleSection>
          <Title>Story Outline</Title>
          <Subtitle>Review your story structure before generating the manuscript</Subtitle>
        </TitleSection>
        <ButtonGroup>
          <Button variant="secondary" onClick={() => uiStore.previousStep()}>
            Back
          </Button>
          <Button onClick={handleGenerateManuscript} disabled={isLoading}>
            {isLoading ? 'Generating...' : 'Generate Manuscript'}
          </Button>
        </ButtonGroup>
      </Header>

      {generationStore.error && (
        <ErrorMessage>{generationStore.error}</ErrorMessage>
      )}

      <Card>
        <StoryTitle>{outline.title}</StoryTitle>
        {outline.subtitle && <StorySubtitle>{outline.subtitle}</StorySubtitle>}
        <Synopsis>{outline.synopsis}</Synopsis>
        <Theme>
          <Label>Theme: </Label>
          <span style={{ color: 'var(--text-primary)' }}>{outline.theme}</span>
        </Theme>
      </Card>

      <Card>
        <CardTitle>Characters</CardTitle>
        <CharacterGrid>
          {outline.characters.map((character) => (
            <CharacterCard key={character.id}>
              <CharacterName>{character.name}</CharacterName>
              <CharacterRole>{character.role}</CharacterRole>
              <CharacterDesc>{character.description}</CharacterDesc>
            </CharacterCard>
          ))}
        </CharacterGrid>
      </Card>

      <Card>
        <CardTitle>Setting</CardTitle>
        <SettingContent>
          <SettingItem>
            <SettingLabel>Location</SettingLabel>
            <SettingValue>{outline.setting.location}</SettingValue>
          </SettingItem>
          <SettingItem>
            <SettingLabel>Time</SettingLabel>
            <SettingValue>{outline.setting.timePeriod}</SettingValue>
          </SettingItem>
          <SettingItem>
            <SettingLabel>Atmosphere</SettingLabel>
            <SettingValue>{outline.setting.atmosphere}</SettingValue>
          </SettingItem>
        </SettingContent>
      </Card>

      <Card>
        <CardTitle>Plot Points</CardTitle>
        <PlotList>
          {outline.plotPoints
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((point) => (
              <PlotItem key={point.id}>
                <PlotTitle>{point.title}</PlotTitle>
                {point.description}
              </PlotItem>
            ))}
        </PlotList>
      </Card>
    </Container>
  );
});
