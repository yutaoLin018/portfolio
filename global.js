console.log("IT'S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

/* ---------------------------------------------------------
   NAVIGATION + APPEARANCE
   --------------------------------------------------------- */

const BASE_PATH =
  location.hostname === "localhost" ||
  location.hostname === "127.0.0.1"
    ? "/"
    : "/portfolio/";

const pages = [
  {
    url: "",
    title: "Home",
  },
  {
    url: "projects/",
    title: "Projects",
  },
  {
    url: "contact/",
    title: "Contact",
  },
  {
    url: "cv/",
    title: "CV",
  },
  {
    url: "meta/",
    title: "Meta",
  },
  {
    url: "https://github.com/yutaoLin018",
    title: "GitHub",
  },
];

const nav = document.createElement("nav");
nav.setAttribute("aria-label", "Primary navigation");

const navLinks = document.createElement("div");
navLinks.className = "nav-links";

function normalizePath(pathname) {
  if (pathname.endsWith("/")) {
    return pathname;
  }

  return `${pathname}/`;
}

for (const page of pages) {
  let url = page.url;

  if (!url.startsWith("http")) {
    url = BASE_PATH + url;
  }

  const link = document.createElement("a");

  link.href = url;
  link.textContent = page.title;

  const isSameHost = link.host === location.host;

  const isCurrent =
    isSameHost &&
    normalizePath(link.pathname) === normalizePath(location.pathname);

  link.classList.toggle("current", isCurrent);

  if (isCurrent) {
    link.setAttribute("aria-current", "page");
  }

  if (!isSameHost) {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }

  navLinks.append(link);
}

/* Compact circular appearance toggle */

const appearanceControl = document.createElement("button");
appearanceControl.className = "theme-orb";
appearanceControl.type = "button";
appearanceControl.setAttribute("aria-label", "Change website appearance");

const themeOptions = [
  {
    label: "Auto",
    value: "light dark",
    mode: "auto",
    icon: "◐",
  },
  {
    label: "Light",
    value: "light",
    mode: "light",
    icon: "☀︎",
  },
  {
    label: "Dark",
    value: "dark",
    mode: "dark",
    icon: "🌙︎",
  },
];

appearanceControl.innerHTML = `
  <span class="theme-orb-icon"></span>
  <span class="theme-orb-label"></span>
`;

nav.append(navLinks, appearanceControl);
document.body.prepend(nav);

const systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");

function getSystemTheme() {
  return systemThemeQuery.matches ? "dark" : "light";
}

function getThemeIndex(colorScheme) {
  return themeOptions.findIndex(
    (option) => option.value === colorScheme
  );
}

function getStoredColorScheme() {
  return localStorage.colorScheme || "light dark";
}

function setColorScheme(colorScheme) {
  const theme =
    themeOptions.find((option) => option.value === colorScheme) ??
    themeOptions[0];

  /*
    Auto mode:
    "light dark" allows the browser and CSS media queries to follow
    the user's system appearance setting.
  */
  document.documentElement.style.colorScheme = theme.value;

  document.documentElement.dataset.themeMode = theme.mode;
  document.documentElement.dataset.resolvedTheme =
    theme.mode === "auto" ? getSystemTheme() : theme.mode;

  appearanceControl.dataset.scheme = theme.value;
  appearanceControl.dataset.mode = theme.mode;
  appearanceControl.dataset.resolvedTheme =
    theme.mode === "auto" ? getSystemTheme() : theme.mode;

  appearanceControl.querySelector(".theme-orb-icon").textContent =
    theme.icon;

  appearanceControl.querySelector(".theme-orb-label").textContent =
    theme.label;

  appearanceControl.setAttribute(
    "aria-label",
    `Appearance: ${theme.label}. Click to change.`
  );

  appearanceControl.title =
    theme.mode === "auto"
      ? `Appearance: Auto (${getSystemTheme()} system theme)`
      : `Appearance: ${theme.label}`;
}

setColorScheme(getStoredColorScheme());

appearanceControl.addEventListener("click", () => {
  const currentScheme = getStoredColorScheme();
  const currentIndex = getThemeIndex(currentScheme);

  const nextIndex =
    currentIndex === -1
      ? 0
      : (currentIndex + 1) % themeOptions.length;

  const nextTheme = themeOptions[nextIndex];

  setColorScheme(nextTheme.value);
  localStorage.colorScheme = nextTheme.value;
});

/*
  When Auto is selected, update the resolved theme immediately if
  the user's system theme changes.
*/
systemThemeQuery.addEventListener("change", () => {
  if (getStoredColorScheme() === "light dark") {
    setColorScheme("light dark");
  }
});

/* ---------------------------------------------------------
   LIQUID HIGHLIGHT
   --------------------------------------------------------- */

function attachLiquidHighlight(element) {
  element.addEventListener("pointermove", (event) => {
    const bounds = element.getBoundingClientRect();

    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;

    element.style.setProperty("--pointer-x", `${x}%`);
    element.style.setProperty("--pointer-y", `${y}%`);
  });

  element.addEventListener("pointerleave", () => {
    element.style.removeProperty("--pointer-x");
    element.style.removeProperty("--pointer-y");
  });
}

attachLiquidHighlight(nav);

function initializeLiquidCards() {
  $$(".projects article").forEach((card) => {
    if (!card.dataset.liquidReady) {
      attachLiquidHighlight(card);
      card.dataset.liquidReady = "true";
    }
  });
}

const projectObserver = new MutationObserver(() => {
  initializeLiquidCards();
});

projectObserver.observe(document.body, {
  childList: true,
  subtree: true,
});

initializeLiquidCards();

/* ---------------------------------------------------------
   CONTACT FORM
   --------------------------------------------------------- */

const form = document.querySelector("form");

form?.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const params = new URLSearchParams();

  for (const [name, value] of data) {
    params.append(name, value);
  }

  location.href = `${form.action}?${params.toString()}`;
});

/* ---------------------------------------------------------
   SHARED DATA HELPERS
   --------------------------------------------------------- */

export async function fetchJSON(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch JSON: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching or parsing JSON data:", error);
    return null;
  }
}

export function renderProjects(projects, containerElement, headingLevel = "h2") {
  containerElement.innerHTML = "";

  for (const project of projects ?? []) {
    const article = document.createElement("article");

    const heading = document.createElement(headingLevel);
    heading.textContent = project.title;

    const image = document.createElement("img");

    if (project.image.startsWith("http")) {
      image.src = project.image;
    } else {
      image.src = BASE_PATH + project.image.replace("../", "");
    }

    image.alt = project.title;
    image.loading = "lazy";
    image.decoding = "async";

    const description = document.createElement("p");
    description.textContent = project.description;

    article.append(heading, image, description);

    if (project.url) {
      const link = document.createElement("a");

      link.href = project.url;
      link.textContent = "View project";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.classList.add("project-link");

      article.append(link);
    }

    containerElement.append(article);
  }

  initializeLiquidCards();
}

export async function fetchGitHubData(username) {
  try {
    const response = await fetch(
      `https://api.github.com/users/${username}`
    );

    if (!response.ok) {
      throw new Error(
        `GitHub fetch failed: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching GitHub data:", error);
    return null;
  }
}