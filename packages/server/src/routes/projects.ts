import { Router, Request, Response } from 'express';
import { CreateProjectRequest } from '@storybook-generator/shared';
import { ProjectService } from '../services/index.js';

export function createProjectsRouter(projectService: ProjectService): Router {
  const router = Router();

  // List all projects
  router.get('/', async (req: Request, res: Response) => {
    try {
      const projects = await projectService.listProjects();
      res.json(projects);
    } catch (error) {
      console.error('Error listing projects:', error);
      res.status(500).json({ error: 'Failed to list projects' });
    }
  });

  // Create a new project
  router.post('/', async (req: Request, res: Response) => {
    try {
      const request: CreateProjectRequest = req.body;
      if (!request.name) {
        res.status(400).json({ error: 'Project name is required' });
        return;
      }
      const project = await projectService.createProject(request);
      res.status(201).json(project);
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  });

  // Get a project by ID
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const project = await projectService.getProject(req.params.id);
      res.json(project);
    } catch (error) {
      console.error('Error getting project:', error);
      res.status(404).json({ error: 'Project not found' });
    }
  });

  // Update a project
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const project = await projectService.getProject(req.params.id);
      const updatedProject = { ...project, ...req.body, id: project.id };
      const result = await projectService.updateProject(updatedProject);
      res.json(result);
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({ error: 'Failed to update project' });
    }
  });

  // Delete a project
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      await projectService.deleteProject(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  });

  return router;
}
