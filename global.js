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

  const isSameHost =
    link.host === location.host;

  const isCurrent =
    isSameHost &&
    normalizePath(link.pathname) ===
      normalizePath(location.pathname);

  link.classList.toggle(
    "current",
    isCurrent
  );

  if (isCurrent) {
    link.setAttribute(
      "aria-current",
      "page"
    );
  }

  if (!isSameHost) {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }

  navLinks.append(link);
}

/* Compact appearance selector */

const appearanceControl =
  document.createElement("label");

appearanceControl.className =
  "color-scheme";

appearanceControl.innerHTML = `
  <select aria-label="Choose website appearance">
    <option value="light dark">Auto</option>
    <option value="light">Light</option>
    <option value="dark">Dark</option>
  </select>
`;

nav.append(
  navLinks,
  appearanceControl
);

document.body.prepend(nav);

const select =
  appearanceControl.querySelector("select");

function setColorScheme(colorScheme) {
  document.documentElement.style.colorScheme =
    colorScheme;

  select.value = colorScheme;
}

if (localStorage.colorScheme) {
  setColorScheme(
    localStorage.colorScheme
  );
}

select.addEventListener(
  "change",
  (event) => {
    const colorScheme =
      event.target.value;

    setColorScheme(colorScheme);

    localStorage.colorScheme =
      colorScheme;
  }
);

/* ---------------------------------------------------------
   LIQUID HIGHLIGHT
   --------------------------------------------------------- */

function attachLiquidHighlight(element) {
  element.addEventListener(
    "pointermove",
    (event) => {
      const bounds =
        element.getBoundingClientRect();

      const x =
        (
          (event.clientX - bounds.left) /
          bounds.width
        ) * 100;

      const y =
        (
          (event.clientY - bounds.top) /
          bounds.height
        ) * 100;

      element.style.setProperty(
        "--pointer-x",
        `${x}%`
      );

      element.style.setProperty(
        "--pointer-y",
        `${y}%`
      );
    }
  );

  element.addEventListener(
    "pointerleave",
    () => {
      element.style.removeProperty(
        "--pointer-x"
      );

      element.style.removeProperty(
        "--pointer-y"
      );
    }
  );
}

attachLiquidHighlight(nav);

function initializeLiquidCards() {
  $$(".projects article").forEach(
    (card) => {
      if (!card.dataset.liquidReady) {
        attachLiquidHighlight(card);

        card.dataset.liquidReady =
          "true";
      }
    }
  );
}

const projectObserver =
  new MutationObserver(() => {
    initializeLiquidCards();
  });

projectObserver.observe(
  document.body,
  {
    childList: true,
    subtree: true,
  }
);

initializeLiquidCards();

/* ---------------------------------------------------------
   CONTACT FORM
   --------------------------------------------------------- */

const form =
  document.querySelector("form");

form?.addEventListener(
  "submit",
  (event) => {
    event.preventDefault();

    const data =
      new FormData(form);

    const params =
      new URLSearchParams();

    for (const [name, value] of data) {
      params.append(name, value);
    }

    location.href =
      `${form.action}?${params.toString()}`;
  }
);

/* ---------------------------------------------------------
   SHARED DATA HELPERS
   --------------------------------------------------------- */

export async function fetchJSON(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch JSON: ` +
        `${response.status} ` +
        `${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(
      "Error fetching or parsing JSON data:",
      error
    );

    return null;
  }
}

export function renderProjects(
  projects,
  containerElement,
  headingLevel = "h2"
) {
  containerElement.innerHTML = "";

  for (const project of projects ?? []) {
    const article =
      document.createElement("article");

    const heading =
      document.createElement(
        headingLevel
      );

    heading.textContent =
      project.title;

    const image =
      document.createElement("img");

    if (
      project.image.startsWith("http")
    ) {
      image.src = project.image;
    } else {
      image.src =
        BASE_PATH +
        project.image.replace("../", "");
    }

    image.alt = project.title;
    image.loading = "lazy";
    image.decoding = "async";

    const description =
      document.createElement("p");

    description.textContent =
      project.description;

    article.append(
      heading,
      image,
      description
    );

    if (project.url) {
      const link =
        document.createElement("a");

      link.href = project.url;
      link.textContent =
        "View project";

      link.target = "_blank";
      link.rel =
        "noopener noreferrer";

      link.classList.add(
        "project-link"
      );

      article.append(link);
    }

    containerElement.append(article);
  }

  initializeLiquidCards();
}

export async function fetchGitHubData(
  username
) {
  try {
    const response = await fetch(
      `https://api.github.com/users/${username}`
    );

    if (!response.ok) {
      throw new Error(
        `GitHub fetch failed: ` +
        `${response.status} ` +
        `${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(
      "Error fetching GitHub data:",
      error
    );

    return null;
  }
}