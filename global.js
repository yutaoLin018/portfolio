console.log("IT'S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

document.body.insertAdjacentHTML(
  "afterbegin",
  `
    <label class="color-scheme">
      Theme:
      <select>
        <option value="light dark">Auto</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  `
);

let select = document.querySelector(".color-scheme select");

function setColorScheme(colorScheme) {
  document.documentElement.style.colorScheme = colorScheme;
  select.value = colorScheme;
}

if (localStorage.colorScheme) {
  setColorScheme(localStorage.colorScheme);
}

select.addEventListener("change", function (event) {
  let colorScheme = event.target.value;
  setColorScheme(colorScheme);
  localStorage.colorScheme = colorScheme;
});

const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "/"
    : "/portfolio/";

let pages = [
  { url: "", title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "contact/", title: "Contact" },
  { url: "cv/", title: "CV" },
  { url: "meta/", title: "Meta" },
  { url: "https://github.com/yutaoLin018", title: "GitHub" }
];

let nav = document.createElement("nav");
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;

  if (!url.startsWith("http")) {
    url = BASE_PATH + url;
  }

  let a = document.createElement("a");
  a.href = url;
  a.textContent = p.title;

  a.classList.toggle(
    "current",
    a.host === location.host && a.pathname === location.pathname
  );

  if (a.host !== location.host) {
    a.target = "_blank";
  }

  nav.append(a);
}

let form = document.querySelector("form");

form?.addEventListener("submit", function (event) {
  event.preventDefault();

  let data = new FormData(form);
  let url = form.action + "?";
  let params = [];

  for (let [name, value] of data) {
    params.push(`${name}=${encodeURIComponent(value)}`);
  }

  url += params.join("&");
  location.href = url;
});

export async function fetchJSON(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  containerElement.innerHTML = '';

  for (let project of projects) {
    const article = document.createElement('article');

    const heading = document.createElement(headingLevel);
    heading.textContent = project.title;

    const image = document.createElement('img');
    image.src = project.image;
    image.alt = project.title;

    const description = document.createElement('p');
    description.textContent = project.description;

    article.appendChild(heading);
    article.appendChild(image);
    article.appendChild(description);

    if (project.url) {
      const link = document.createElement('a');
      link.href = project.url;
      link.textContent = 'View project';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.classList.add('project-link');

      article.appendChild(link);
    }

    containerElement.appendChild(article);
  }
}

export async function fetchGitHubData(username) {
  try {
    const response = await fetch(`https://api.github.com/users/${username}`);

    if (!response.ok) {
      throw new Error(`GitHub fetch failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching GitHub data:', error);
  }
}