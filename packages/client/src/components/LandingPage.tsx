import { observer } from "mobx-react-lite";
import styled from "@emotion/styled";
import { useProjectStore, useUIStore } from "../stores/RootStore";
import { getImageUrl } from "../api/client";
import type { ProjectSummary } from "@storybook-generator/shared";

const Container = styled.div`
    padding: 3rem 2rem;
    max-width: 1400px;
    margin: 0 auto;
`;

const Header = styled.div`
    text-align: center;
    margin-bottom: 3rem;
`;

const Title = styled.h1`
    font-size: 2.5rem;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
    font-size: 1.1rem;
    color: var(--text-secondary);
    max-width: 500px;
    margin: 0 auto;
`;

const ProjectGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 2rem;
    justify-items: center;
`;

const CardBase = styled.div`
    width: 280px;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;

    &:hover {
        transform: translateY(-4px);
    }
`;

const ProjectCard = styled(CardBase)`
    &:hover .card-cover {
        box-shadow: var(--shadow-lg);
    }
`;

const NewProjectCard = styled(CardBase)`
    &:hover .new-cover {
        border-color: var(--primary-color);
        background: var(--primary-color);
    }

    &:hover .new-cover span {
        color: white;
    }
`;

const CardCover = styled.div<{ hasCover: boolean }>`
    width: 280px;
    height: 210px; /* 4:3 aspect ratio (landscape) */
    border-radius: var(--radius-lg);
    overflow: hidden;
    background: ${(props) =>
        props.hasCover ? "var(--surface-color)" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"};
    box-shadow: var(--shadow-md);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    transition: box-shadow 0.2s ease;
`;

const CoverImage = styled.img`
    width: 100%;
    height: 100%;
    object-fit: contain;
`;

const PlaceholderContent = styled.div`
    text-align: center;
    padding: 1.5rem;
    color: white;
`;

const PlaceholderTitle = styled.div`
    font-size: 1.1rem;
    font-weight: 600;
    line-height: 1.4;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
`;

const NewCover = styled.div`
    width: 280px;
    height: 210px; /* 4:3 aspect ratio (landscape) */
    border-radius: var(--radius-lg);
    border: 3px dashed var(--border-color);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: var(--background-color);
    transition: all 0.2s ease;
`;

const NewIcon = styled.span`
    font-size: 3rem;
    color: var(--text-secondary);
    transition: color 0.2s ease;
`;

const NewText = styled.span`
    margin-top: 0.5rem;
    font-size: 1rem;
    font-weight: 500;
    color: var(--text-secondary);
    transition: color 0.2s ease;
`;

const CardTitle = styled.div`
    margin-top: 0.75rem;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-primary);
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const CardMeta = styled.div`
    font-size: 0.8rem;
    color: var(--text-secondary);
    text-align: center;
    margin-top: 0.25rem;
`;

const StageBadge = styled.span<{ stage: string }>`
    padding: 0.15rem 0.5rem;
    border-radius: var(--radius-sm);
    font-size: 0.7rem;
    font-weight: 500;
    text-transform: uppercase;
    background: ${(props) => {
        switch (props.stage) {
            case "outline":
                return "var(--info-color)";
            case "manuscript":
                return "var(--warning-color)";
            case "illustrations":
                return "var(--success-color)";
            case "export":
                return "var(--primary-color)";
            default:
                return "var(--border-color)";
        }
    }};
    color: white;
`;

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

export const LandingPage = observer(function LandingPage() {
    const projectStore = useProjectStore();
    const uiStore = useUIStore();

    const handleNewProject = async () => {
        const name = `Storybook ${new Date().toLocaleDateString()}`;
        await projectStore.createProject(name);
        uiStore.resetWizard();
    };

    const handleSelectProject = async (project: ProjectSummary) => {
        await projectStore.loadProject(project.id);
        uiStore.navigateToProjectState();
    };

    const getProjectImageUrl = (project: ProjectSummary): string | null => {
        if (project.hasCoverImage) {
            return getImageUrl(project.id, "cover", "front");
        }
        if (project.hasPageImages && project.firstPageNumber !== undefined) {
            return getImageUrl(project.id, "pages", `page-${project.firstPageNumber}`);
        }
        return null;
    };

    return (
        <Container>
            <Header>
                <Title>Your Storybooks</Title>
                <Subtitle>Create AI-illustrated children's picture books.</Subtitle>
            </Header>

            <ProjectGrid>
                <NewProjectCard onClick={handleNewProject}>
                    <NewCover className="new-cover">
                        <NewIcon className="new-cover">+</NewIcon>
                        <NewText className="new-cover">New Storybook</NewText>
                    </NewCover>
                </NewProjectCard>

                {projectStore.projectList.map((project) => {
                    const imageUrl = getProjectImageUrl(project);
                    const displayTitle = project.title || project.name;

                    return (
                        <ProjectCard key={project.id} onClick={() => handleSelectProject(project)}>
                            <CardCover className="card-cover" hasCover={!!imageUrl}>
                                {imageUrl ? (
                                    <CoverImage src={imageUrl} alt={displayTitle} />
                                ) : (
                                    <PlaceholderContent>
                                        <PlaceholderTitle>{displayTitle}</PlaceholderTitle>
                                    </PlaceholderContent>
                                )}
                            </CardCover>
                            <CardTitle title={displayTitle}>{displayTitle}</CardTitle>
                            <CardMeta>
                                {formatDate(project.updatedAt)}{" "}
                                <StageBadge stage={project.currentStage}>{project.currentStage}</StageBadge>
                            </CardMeta>
                        </ProjectCard>
                    );
                })}
            </ProjectGrid>
        </Container>
    );
});
