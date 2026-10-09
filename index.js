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

// Projects share one continuous plane; pointer gestures move the plane itself.
const featured = (projects ?? []).filter(project => !project.image.includes('empty.svg'));
let featuredIndex = 0;
const stage = document.querySelector('.showroom-art');
const plane = document.createElement('div');
plane.className = 'project-plane';
plane.setAttribute('role', 'region');
plane.setAttribute('aria-label', 'Drag horizontally to browse featured projects');
plane.tabIndex = 0;
stage.querySelectorAll('.side-panel, .floating-project').forEach(element => element.remove());
stage.prepend(plane);
const colors = ['#d7d7d7', '#bebebe', '#e1e1e1', '#c8c8c8', '#d1d1d1'];
const boards = featured.map((project, index) => {
  const board = document.createElement('button');
  board.type = 'button';
  board.className = 'project-board';
  board.style.setProperty('--board-color', colors[index % colors.length]);
  board.setAttribute('aria-label', `Preview ${project.title}`);
  const caption = document.createElement('span');
  caption.className = 'panel-caption';
  caption.textContent = `PROJECT / ${String(index + 1).padStart(2, '0')}`;
  const image = document.createElement('img');
  image.src = project.image;
  image.alt = project.title;
  image.draggable = false;
  const title = document.createElement('span');
  title.className = 'panel-name';
  title.textContent = project.title;
  board.append(caption, image, title);
  board.addEventListener('click', () => {
    if (suppressClick) return;
    featuredIndex = index;
    updateFeaturedProject();
    openProjectPreview(project);
  });
  plane.append(board);
  return board;
});
let drag = null;
let suppressClick = false;
let suppressTimer;
function layoutBoards(delta = 0) {
  const width = plane.clientWidth;
  const step = (boards[0]?.offsetWidth ?? width * .62) + (width < 620 ? 70 : 150);
  boards.forEach((board, index) => {
    let offset = index - featuredIndex;
    if (offset > featured.length / 2) offset -= featured.length;
    if (offset < -featured.length / 2) offset += featured.length;
    const x = offset * step + delta;
    board.style.setProperty('--x', `${x}px`);
    board.style.setProperty('--y', `${-x * .18}px`);
    board.style.zIndex = String(10 - Math.abs(offset));
    board.style.opacity = Math.abs(offset) > 1 ? '0' : '1';
    board.style.visibility = Math.abs(offset) > 1 ? 'hidden' : 'visible';
    board.setAttribute('aria-pressed', String(index === featuredIndex));
    board.tabIndex = index === featuredIndex ? 0 : -1;
  });
}
function updateFeaturedProject() {
  const project = featured[featuredIndex];
  if (!project) return;
  document.querySelector('#featured-title').textContent = project.title;
  document.querySelector('#featured-description').textContent = project.description;
  document.querySelector('#featured-year').textContent = `SELECTED PROJECT / ${project.year}`;
  document.querySelector('#featured-count').textContent = `${String(featuredIndex + 1).padStart(2, '0')} / ${String(featured.length).padStart(2, '0')}`;
  const link = document.querySelector('#featured-link');
  link.href = project.url || 'projects/';
  link.setAttribute('aria-label', `Explore ${project.title}`);
  if (project.url) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
  else { link.removeAttribute('target'); link.removeAttribute('rel'); }
  layoutBoards();
}
function advance(direction) {
  if (!featured.length) return;
  featuredIndex = (featuredIndex + direction + featured.length) % featured.length;
  updateFeaturedProject();
}
plane.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0 || featured.length < 2) return;
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, locked: false };
});
plane.addEventListener('pointermove', event => {
  if (!drag || drag.id !== event.pointerId) return;
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  if (!drag.locked) {
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) { drag = null; return; }
    if (Math.abs(dx) < 8) return;
    drag.locked = true;
    plane.setPointerCapture(event.pointerId);
    plane.classList.add('is-dragging');
    suppressClick = true;
  }
  drag.dx = dx;
  layoutBoards(dx);
});
function finishDrag(event, cancelled = false) {
  if (!drag || event.pointerId !== drag.id) return;
  const { dx, locked } = drag;
  drag = null;
  plane.classList.remove('is-dragging');
  if (plane.hasPointerCapture(event.pointerId)) plane.releasePointerCapture(event.pointerId);
  if (!cancelled && locked && Math.abs(dx) > Math.min(plane.clientWidth * .12, 85)) advance(dx < 0 ? 1 : -1);
  else layoutBoards();
  if (locked) {
    clearTimeout(suppressTimer);
    suppressTimer = setTimeout(() => { suppressClick = false; }, 100);
  }
}
plane.addEventListener('pointerup', event => finishDrag(event));
plane.addEventListener('pointercancel', event => finishDrag(event, true));
plane.addEventListener('lostpointercapture', event => finishDrag(event, true));
plane.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    advance(event.key === 'ArrowRight' ? 1 : -1);
  }
});
for (const [id, direction] of [['project-previous', -1], ['project-next', 1]]) {
  const button = document.getElementById(id);
  button.disabled = featured.length < 2;
  button.addEventListener('click', () => advance(direction));
}
new ResizeObserver(() => layoutBoards()).observe(plane);
updateFeaturedProject();

const previewDialog = document.createElement('dialog');
previewDialog.className = 'project-preview';
previewDialog.setAttribute('aria-labelledby', 'preview-title');
previewDialog.innerHTML = `<button class="preview-close" type="button" aria-label="Close project preview">Close ×</button><img class="preview-image" alt=""><div class="preview-content"><p class="eyebrow" id="preview-year"></p><h2 id="preview-title"></h2><p id="preview-description"></p><a class="preview-visit" target="_blank" rel="noopener noreferrer">Open full project ↗</a></div>`;
document.body.append(previewDialog);
previewDialog.querySelector('.preview-close').addEventListener('click', () => previewDialog.close());
previewDialog.addEventListener('click', event => {
  if (event.target !== previewDialog) return;
  const rect = previewDialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) previewDialog.close();
});
previewDialog.addEventListener('close', () => document.documentElement.classList.remove('preview-open'));
function openProjectPreview(project) {
  previewDialog.querySelector('#preview-title').textContent = project.title;
  previewDialog.querySelector('#preview-description').textContent = project.description;
  previewDialog.querySelector('#preview-year').textContent = `PROJECT PREVIEW / ${project.year}`;
  const image = previewDialog.querySelector('.preview-image');
  image.src = project.image;
  image.alt = project.title;
  const visit = previewDialog.querySelector('.preview-visit');
  visit.hidden = !project.url;
  if (project.url) visit.href = project.url;
  else visit.removeAttribute('href');
  document.documentElement.classList.add('preview-open');
  previewDialog.showModal();
}
// The latest-work thumbnails use the same preview without changing their links.
document.querySelectorAll('.projects article').forEach((article, index) => {
  const image = article.querySelector('img');
  if (!image || !latestProjects[index]) return;
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'project-preview-trigger';
  trigger.setAttribute('aria-label', `Preview ${latestProjects[index].title}`);
  image.replaceWith(trigger);
  trigger.append(image);
  trigger.addEventListener('click', () => openProjectPreview(latestProjects[index]));
});

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