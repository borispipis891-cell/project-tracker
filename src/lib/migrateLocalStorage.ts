export async function migrateFromLocalStorage() {
  // Check if migration already happened
  const migrationDone = localStorage.getItem('migration_to_db_done');
  if (migrationDone === 'true') {
    return false; // Migration already done
  }

  // Get projects from localStorage
  const projectsData = localStorage.getItem('projects');
  if (!projectsData) {
    // No data to migrate
    localStorage.setItem('migration_to_db_done', 'true');
    return false;
  }

  try {
    const projects = JSON.parse(projectsData);

    // Send all projects to API
    for (const project of projects) {
      // Create project without tasks first
      const { tasks, ...projectData } = project;

      const projectResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });

      if (projectResponse.ok) {
        const createdProject = await projectResponse.json();

        // Create tasks for this project
        for (const task of tasks || []) {
          await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...task,
              projectId: createdProject.id
            }),
          });
        }
      }
    }

    // Mark migration as done
    localStorage.setItem('migration_to_db_done', 'true');
    console.log('Migration from localStorage to database completed successfully');
    return true;
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
}
