import {
  fetchJSON,
  renderProjects,
  fetchGitHubData,
} from './global.js';

const projects = await fetchJSON('./lib/projects.json');
const latestProjects = projects?.slice(0, 3) ?? [];
const projectsContainer = document.querySelector('.projects');

if (projectsContainer) {
  renderProjects(latestProjects, projectsContainer, 'h2');
}

const githubData = await fetchGitHubData('yutaoLin018');
const profileStats = document.querySelector('#profile-stats');

if (githubData && profileStats) {
  const createdYear = new Date(
    githubData.created_at
  ).getFullYear();

  const updatedDate = new Date(
    githubData.updated_at
  ).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  profileStats.innerHTML = `
    <dl class="github-stats">
      <div>
        <dt>Followers</dt>
        <dd>${githubData.followers}</dd>
      </div>

      <div>
        <dt>Following</dt>
        <dd>${githubData.following}</dd>
      </div>

      <div>
        <dt>Public Repos</dt>
        <dd>${githubData.public_repos}</dd>
      </div>

      <div>
        <dt>GitHub Since</dt>
        <dd>${createdYear}</dd>
      </div>
    </dl>

    <p class="github-updated">
      Profile last updated ${updatedDate}.
      <a
        href="${githubData.html_url}"
        target="_blank"
        rel="noopener noreferrer"
      >
        View GitHub profile
      </a>
    </p>
  `;
} else if (profileStats) {
  profileStats.textContent =
    'GitHub statistics are temporarily unavailable.';
}