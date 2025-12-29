import styled from '@emotion/styled';
import type { ManuscriptPage, PageImage } from '@storybook-generator/shared';

const Card = styled.div`
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  overflow: hidden;
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

export interface PageCardProps {
  page: ManuscriptPage;
  pageImage?: PageImage;
  imageUrl?: string;
  characterNames?: Map<string, string>;
  showImage?: boolean;
  showIllustrationBrief?: boolean;
}

export function PageCard({
  page,
  pageImage,
  imageUrl,
  characterNames = new Map(),
  showImage = false,
  showIllustrationBrief = true,
}: PageCardProps) {
  const getCharacterName = (charId: string): string => {
    return characterNames.get(charId) || charId;
  };

  const hasImage = showImage && (imageUrl || pageImage);

  return (
    <Card>
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
          <span>{pageImage.modelUsed}</span>
        </ImageMetaBar>
      )}
    </Card>
  );
}
