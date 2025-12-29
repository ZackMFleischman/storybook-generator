import { useState } from 'react';
import styled from '@emotion/styled';
import type { ManuscriptPage, PageImage } from '@storybook-generator/shared';

const Card = styled.div<{ hasFeedback?: boolean }>`
  background: var(--surface-color);
  border: 2px solid ${props => props.hasFeedback ? 'var(--secondary-color)' : 'var(--border-color)'};
  border-radius: var(--radius-lg);
  overflow: hidden;
  position: relative;
`;

const ImageSection = styled.div`
  background: var(--background-color);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  min-height: 200px;
`;

const ContentRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Image = styled.img`
  max-width: 100%;
  max-height: 400px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
`;

const PlaceholderImage = styled.div`
  color: var(--text-secondary);
  text-align: center;
  padding: 2rem;
`;

const TextSection = styled.div`
  padding: 1.5rem;
  border-right: 1px solid var(--border-color);

  @media (max-width: 768px) {
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }
`;

const PageNumber = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  background: var(--primary-color);
  color: white;
  border-radius: 50%;
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 1rem;
`;

const PageText = styled.p`
  color: var(--text-primary);
  font-size: 1.125rem;
  line-height: 1.7;
  margin: 0;
  font-family: 'Georgia', serif;
`;

const NoText = styled.p`
  color: var(--text-secondary);
  font-style: italic;
  margin: 0;
`;

const IllustrationSection = styled.div`
  padding: 1.5rem;
  background: var(--background-color);
`;

const SectionLabel = styled.h4`
  color: var(--text-secondary);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 0.75rem;
`;

const IllustrationDescription = styled.p`
  color: var(--text-primary);
  font-size: 0.875rem;
  line-height: 1.6;
  margin: 0 0 1rem;
`;

const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
`;

const MetaItem = styled.div``;

const MetaLabel = styled.span`
  display: block;
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
`;

const MetaValue = styled.span`
  color: var(--text-primary);
  font-size: 0.875rem;
`;

const CharacterTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
`;

const Tag = styled.span`
  background: var(--primary-color);
  color: white;
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
`;

const ImageMetaBar = styled.div`
  padding: 0.75rem 1rem;
  background: var(--surface-color);
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: var(--text-secondary);
`;

const InfoButton = styled.button`
  background: none;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;

  &:hover {
    background: var(--surface-color);
    color: var(--text-primary);
    border-color: var(--text-secondary);
  }
`;

const MetaActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const FeedbackBadge = styled.span`
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
  background: var(--secondary-color);
  color: white;
  font-size: 0.625rem;
  font-weight: 600;
  padding: 0.125rem 0.375rem;
  border-radius: 999px;
  z-index: 10;
`;

const FeedbackSection = styled.div`
  padding: 1rem;
  background: #fffbeb;
  border-top: 1px solid #fcd34d;
`;

const FeedbackLabel = styled.label`
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
`;

const FeedbackTextarea = styled.textarea`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;
  min-height: 60px;

  &:focus {
    outline: none;
    border-color: var(--primary-color);
  }
`;

const FeedbackActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  justify-content: flex-end;
`;

const SmallButton = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;

  background: ${props => {
    if (props.variant === 'primary') return 'var(--primary-color)';
    if (props.variant === 'danger') return 'var(--error-color)';
    return 'transparent';
  }};
  color: ${props => (props.variant === 'primary' || props.variant === 'danger') ? 'white' : 'var(--text-secondary)'};
  border: 1px solid ${props => {
    if (props.variant === 'primary') return 'var(--primary-color)';
    if (props.variant === 'danger') return 'var(--error-color)';
    return 'var(--border-color)';
  }};

  &:hover:not(:disabled) {
    opacity: 0.8;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EditButton = styled.button`
  background: none;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;

  &:hover {
    background: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
  }
`;

export interface PageCardProps {
  page: ManuscriptPage;
  pageImage?: PageImage;
  imageUrl?: string;
  characterNames?: Map<string, string>;
  showImage?: boolean;
  showIllustrationBrief?: boolean;
  onInfoClick?: () => void;
  // Feedback support
  feedback?: string;
  onFeedbackChange?: (feedback: string) => void;
  onRegenerateClick?: () => void;
  isRegenerating?: boolean;
}

export function PageCard({
  page,
  pageImage,
  imageUrl,
  characterNames = new Map(),
  showImage = false,
  showIllustrationBrief = true,
  onInfoClick,
  feedback,
  onFeedbackChange,
  onRegenerateClick,
  isRegenerating = false,
}: PageCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localFeedback, setLocalFeedback] = useState(feedback || '');

  const getCharacterName = (charId: string): string => {
    return characterNames.get(charId) || charId;
  };

  const hasImage = showImage && (imageUrl || pageImage);
  const hasFeedback = !!feedback;
  const canEdit = !!onFeedbackChange;

  const handleSaveFeedback = () => {
    if (onFeedbackChange) {
      onFeedbackChange(localFeedback);
    }
    setIsEditing(false);
  };

  const handleClearFeedback = () => {
    setLocalFeedback('');
    if (onFeedbackChange) {
      onFeedbackChange('');
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocalFeedback(feedback || '');
    setIsEditing(false);
  };

  return (
    <Card hasFeedback={hasFeedback}>
      {hasFeedback && <FeedbackBadge>Feedback pending</FeedbackBadge>}
      {hasImage && (
        <ImageSection>
          {imageUrl ? (
            <Image src={imageUrl} alt={`Page ${page.pageNumber}`} />
          ) : (
            <PlaceholderImage>No image generated</PlaceholderImage>
          )}
        </ImageSection>
      )}
      <ContentRow>
        <TextSection>
          <PageNumber>{page.pageNumber}</PageNumber>
          {page.text ? (
            <PageText>{page.text}</PageText>
          ) : (
            <NoText>No text on this page</NoText>
          )}
        </TextSection>
        {showIllustrationBrief && (
          <IllustrationSection>
            <SectionLabel>Illustration Brief</SectionLabel>
            <IllustrationDescription>
              {page.illustrationDescription}
            </IllustrationDescription>
            <MetaGrid>
              <MetaItem>
                <MetaLabel>Mood</MetaLabel>
                <MetaValue>{page.mood}</MetaValue>
              </MetaItem>
              <MetaItem>
                <MetaLabel>Action</MetaLabel>
                <MetaValue>{page.action}</MetaValue>
              </MetaItem>
            </MetaGrid>
            {page.characters.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <MetaLabel>Characters</MetaLabel>
                <CharacterTags>
                  {page.characters.map((charId: string) => (
                    <Tag key={charId}>{getCharacterName(charId)}</Tag>
                  ))}
                </CharacterTags>
              </div>
            )}
          </IllustrationSection>
        )}
      </ContentRow>
      {pageImage && (
        <ImageMetaBar>
          <span>{pageImage.hasTextBaked ? 'Text baked into image' : 'Text overlay mode'}</span>
          <MetaActions>
            {canEdit && (
              <EditButton onClick={() => setIsEditing(!isEditing)}>
                {isEditing ? 'Close' : 'Edit'}
              </EditButton>
            )}
            {onRegenerateClick && hasFeedback && (
              <SmallButton
                variant="primary"
                onClick={onRegenerateClick}
                disabled={isRegenerating}
              >
                {isRegenerating ? 'Regenerating...' : 'Regenerate'}
              </SmallButton>
            )}
            {onInfoClick && (
              <InfoButton onClick={onInfoClick}>
                Info
              </InfoButton>
            )}
            <span>{pageImage.modelUsed}</span>
          </MetaActions>
        </ImageMetaBar>
      )}
      {isEditing && canEdit && (
        <FeedbackSection>
          <FeedbackLabel>Describe changes for this illustration</FeedbackLabel>
          <FeedbackTextarea
            value={localFeedback}
            onChange={(e) => setLocalFeedback(e.target.value)}
            placeholder="e.g., Make the rabbit look happier, add more flowers in the background, make the colors brighter..."
          />
          <FeedbackActions>
            {hasFeedback && (
              <SmallButton variant="danger" onClick={handleClearFeedback}>
                Clear
              </SmallButton>
            )}
            <SmallButton onClick={handleCancel}>Cancel</SmallButton>
            <SmallButton variant="primary" onClick={handleSaveFeedback}>
              Save Feedback
            </SmallButton>
          </FeedbackActions>
        </FeedbackSection>
      )}
    </Card>
  );
}
