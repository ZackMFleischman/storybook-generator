import { observer } from 'mobx-react-lite';
import styled from '@emotion/styled';
import { useProjectStore, useGenerationStore, useUIStore, useEditStore } from '../stores/RootStore';
import { EditableSection } from './EditableSection';
import type { Character, PlotPoint } from '@storybook-generator/shared';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding-bottom: 5rem;
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

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'warning' }>`
  padding: 0.75rem 1.25rem;
  background: ${props => {
    if (props.variant === 'secondary') return 'transparent';
    if (props.variant === 'warning') return 'var(--secondary-color)';
    return 'var(--primary-color)';
  }};
  color: ${props => props.variant === 'secondary' ? 'var(--text-secondary)' : 'white'};
  border: ${props => props.variant === 'secondary' ? '1px solid var(--border-color)' : 'none'};
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    opacity: 0.9;
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

const PlotList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const PlotItemCard = styled.div`
  background: var(--background-color);
  border-radius: var(--radius-md);
  padding: 1rem;
`;

const PlotNumber = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  background: var(--primary-color);
  color: white;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 600;
  margin-right: 0.5rem;
`;

const PlotTitle = styled.strong`
  color: var(--text-primary);
`;

const PlotDescription = styled.p`
  color: var(--text-secondary);
  margin: 0.5rem 0 0;
  line-height: 1.5;
  font-size: 0.875rem;
`;

const ErrorMessage = styled.div`
  padding: 0.75rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: var(--radius-md);
  color: var(--error-color);
  margin-bottom: 1rem;
`;

const FloatingBar = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--surface-color);
  border-top: 1px solid var(--border-color);
  padding: 1rem 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  box-shadow: var(--shadow-lg);
  z-index: 100;
`;

const FeedbackCount = styled.span`
  color: var(--text-secondary);
  font-size: 0.875rem;
`;

export const OutlineView = observer(function OutlineView() {
  const projectStore = useProjectStore();
  const generationStore = useGenerationStore();
  const uiStore = useUIStore();
  const editStore = useEditStore();

  const outline = projectStore.currentProject?.outline;
  const isLoading = generationStore.isGenerating || editStore.isRefining;

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

  const handleApplyChanges = async () => {
    await editStore.applyOutlineFeedback();
  };

  return (
    <Container>
      <Header>
        <TitleSection>
          <Title>Story Outline</Title>
          <Subtitle>Review and edit your story structure. Hover over sections to add feedback.</Subtitle>
        </TitleSection>
        <ButtonGroup>
          <Button variant="secondary" onClick={() => uiStore.previousStep()}>
            Back
          </Button>
          <Button onClick={handleGenerateManuscript} disabled={isLoading || editStore.hasOutlineFeedback}>
            {isLoading ? 'Generating...' : 'Generate Manuscript'}
          </Button>
        </ButtonGroup>
      </Header>

      {(generationStore.error || editStore.refineError) && (
        <ErrorMessage>{generationStore.error || editStore.refineError}</ErrorMessage>
      )}

      <EditableSection
        sectionLabel="Story Overview"
        feedback={editStore.outlineFeedback.overall}
        onFeedbackChange={(f) => editStore.setOutlineOverallFeedback(f)}
      >
        <Card>
          <StoryTitle>{outline.title}</StoryTitle>
          {outline.subtitle && <StorySubtitle>{outline.subtitle}</StorySubtitle>}
          <Synopsis>{outline.synopsis}</Synopsis>
          <Theme>
            <Label>Theme: </Label>
            <span style={{ color: 'var(--text-primary)' }}>{outline.theme}</span>
          </Theme>
        </Card>
      </EditableSection>

      <Card>
        <CardTitle>Characters</CardTitle>
        <CharacterGrid>
          {outline.characters.map((character: Character) => (
            <EditableSection
              key={character.id}
              sectionLabel={`Character: ${character.name}`}
              feedback={editStore.outlineFeedback.characters.get(character.id)}
              onFeedbackChange={(f) => editStore.setCharacterFeedback(character.id, f)}
            >
              <CharacterCard>
                <CharacterName>{character.name}</CharacterName>
                <CharacterRole>{character.role}</CharacterRole>
                <CharacterDesc>{character.description}</CharacterDesc>
              </CharacterCard>
            </EditableSection>
          ))}
        </CharacterGrid>
      </Card>

      <EditableSection
        sectionLabel="Setting"
        feedback={editStore.outlineFeedback.setting}
        onFeedbackChange={(f) => editStore.setOutlineSettingFeedback(f)}
      >
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
      </EditableSection>

      <Card>
        <CardTitle>Plot Points</CardTitle>
        <PlotList>
          {outline.plotPoints
            .slice()
            .sort((a: PlotPoint, b: PlotPoint) => a.order - b.order)
            .map((point: PlotPoint) => (
              <EditableSection
                key={point.id}
                sectionLabel={`Plot Point: ${point.title}`}
                feedback={editStore.outlineFeedback.plotPoints.get(point.id)}
                onFeedbackChange={(f) => editStore.setPlotPointFeedback(point.id, f)}
              >
                <PlotItemCard>
                  <div>
                    <PlotNumber>{point.order}</PlotNumber>
                    <PlotTitle>{point.title}</PlotTitle>
                  </div>
                  <PlotDescription>{point.description}</PlotDescription>
                </PlotItemCard>
              </EditableSection>
            ))}
        </PlotList>
      </Card>

      {editStore.hasOutlineFeedback && (
        <FloatingBar>
          <FeedbackCount>
            {editStore.outlineFeedbackCount} pending edit{editStore.outlineFeedbackCount !== 1 ? 's' : ''}
          </FeedbackCount>
          <Button variant="secondary" onClick={() => editStore.clearOutlineFeedback()}>
            Clear All
          </Button>
          <Button variant="warning" onClick={handleApplyChanges} disabled={isLoading}>
            {isLoading ? 'Applying...' : 'Apply Changes'}
          </Button>
        </FloatingBar>
      )}
    </Container>
  );
});
