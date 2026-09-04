import { useState, useEffect } from 'react';

export interface Task {
  id: number;
  title: string;
  status: 'not_started' | 'progress' | 'blocked' | 'review' | 'done';
  receivedAt: string;
  deadline: string;
  completedAt?: string;
  responsible?: string;
  engineer?: string;
  customFields?: Record<string, string>;
}

export interface Project {
  id: number;
  name: string;
  receivedAt: string;
  deadline: string;
  completedAt?: string;
  customer: string;
  pss: string;
  reg: string;
  status: 'new' | 'progress' | 'done' | 'blocked' | 'waiting';
  priority: 'critical' | 'high' | 'medium' | 'low';
  responsible: string;
  engineer: string;
  customFields?: Record<string, string>;
  tasks: Task[];
  comments?: Array<{ author: string; date: string; text: string }>;
  history?: Array<{ date: string; user: string; action: string; details: string }>;
  attachments?: Array<{ id: string; name: string; size: number; uploadedAt: string; data: string }>;
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();
      setProjects(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const createProject = async (project: Omit<Project, 'id'>) => {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    });
    if (!response.ok) throw new Error('Failed to create project');
    await fetchProjects();
  };

  const updateProject = async (id: number, updates: Partial<Project>) => {
    const response = await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update project');
    await fetchProjects();
  };

  const deleteProject = async (id: number) => {
    const response = await fetch(`/api/projects/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete project');
    await fetchProjects();
  };

  return {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    refreshProjects: fetchProjects,
  };
}
