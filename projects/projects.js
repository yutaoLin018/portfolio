import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
const searchInput = document.querySelector('.searchBar');

let query = '';
let selectedYear = null;

function matchesSearch(project) {
  let values = Object.values(project).join('\n').toLowerCase();
  return values.includes(query.toLowerCase());
}

function getSearchFilteredProjects() {
  return projects.filter(matchesSearch);
}

function getFinalFilteredProjects() {
  let filteredProjects = getSearchFilteredProjects();

  if (selectedYear) {
    filteredProjects = filteredProjects.filter((project) => {
      return String(project.year) === String(selectedYear);
    });
  }

  return filteredProjects;
}

function renderPieChart(projectsGiven) {
  let rolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year
  );

  let data = rolledData.map(([year, count]) => {
    return { value: count, label: year };
  });

  // If the selected year is no longer available after search, clear it
  if (selectedYear && !data.some((d) => String(d.label) === String(selectedYear))) {
    selectedYear = null;
  }

  let arcGenerator = d3.arc()
    .innerRadius(0)
    .outerRadius(50);

  let sliceGenerator = d3.pie()
    .value((d) => d.value);

  let arcData = sliceGenerator(data);
  let arcs = arcData.map((d) => arcGenerator(d));

  let colors = d3.scaleOrdinal(d3.schemeTableau10);

  let svg = d3.select('#projects-pie-plot');
  svg.selectAll('path').remove();

  let legend = d3.select('.legend');
  legend.selectAll('li').remove();

  arcs.forEach((arc, i) => {
    let year = data[i].label;

    svg
      .append('path')
      .attr('d', arc)
      .attr('fill', colors(i))
      .attr('class', String(year) === String(selectedYear) ? 'selected' : '')
      .on('click', () => {
        selectedYear = String(selectedYear) === String(year) ? null : year;
        updateDisplay();
      });
  });

  data.forEach((d, i) => {
    legend
      .append('li')
      .attr('style', `--color: ${colors(i)}`)
      .attr(
        'class',
        String(d.label) === String(selectedYear)
          ? 'legend-item selected'
          : 'legend-item'
      )
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
      .on('click', () => {
        selectedYear = String(selectedYear) === String(d.label) ? null : d.label;
        updateDisplay();
      });
  });
}

function updateDisplay() {
  let searchFilteredProjects = getSearchFilteredProjects();
  let finalFilteredProjects = getFinalFilteredProjects();

  renderProjects(finalFilteredProjects, projectsContainer, 'h2');
  renderPieChart(searchFilteredProjects);
}

searchInput.addEventListener('input', (event) => {
  query = event.target.value;
  updateDisplay();
});

updateDisplay();