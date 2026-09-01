const MANIFEST_URL = "./data/versions.json";
const SUPPORTED_SCHEMA_VERSION = 2;

const elements = {
  frame: document.querySelector("#build-frame"),
  placeholder: document.querySelector("#player-placeholder"),
  placeholderTitle: document.querySelector("#placeholder-title"),
  placeholderCopy: document.querySelector("#placeholder-copy"),
  status: document.querySelector("#build-status"),
  date: document.querySelector("#build-date"),
  details: document.querySelector("#build-details"),
};

let currentVersion = null;

function setStatus(state, message) {
  elements.status.dataset.state = state;
  elements.status.textContent = message;
}

function setPlaceholder(title, copy) {
  elements.placeholder.hidden = false;
  elements.placeholderTitle.textContent = title;
  elements.placeholderCopy.textContent = copy;
  elements.frame.removeAttribute("src");
  elements.frame.setAttribute("tabindex", "-1");
}

function showDetailsMessage(message) {
  const paragraph = document.createElement("p");
  paragraph.className = "empty-message";
  paragraph.textContent = message;
  elements.details.replaceChildren(paragraph);
  elements.details.setAttribute("aria-busy", "false");
}

function createTextList(items) {
  const list = document.createElement("ul");
  for (const text of items) {
    const item = document.createElement("li");
    item.textContent = text;
    list.append(item);
  }
  return list;
}

function createDetailSection(title, items) {
  const section = document.createElement("section");
  const heading = document.createElement("h4");
  heading.textContent = title;
  section.append(heading, createTextList(items));
  return section;
}

function renderBuildDetails(version) {
  const article = document.createElement("article");
  article.className = "build-entry";

  const heading = document.createElement("h3");
  heading.textContent = version.label;

  const date = document.createElement("time");
  date.dateTime = version.date;
  date.textContent = version.date;

  const detailGrid = document.createElement("div");
  detailGrid.className = "detail-grid";
  detailGrid.append(
    createDetailSection("Changes", version.changes),
    createDetailSection("Controls", version.controls),
    createDetailSection("Limitations", version.limitations),
  );

  article.append(heading, date, detailGrid);
  elements.details.replaceChildren(article);
  elements.details.setAttribute("aria-busy", "false");
}

function isValidIsoDate(value) {
  if (typeof value !== "string") {
    return false;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function resolveSafeBuildUrl(path) {
  let decodedPath = "";
  try {
    decodedPath = decodeURIComponent(path);
  } catch {
    throw new Error("Build paths must use valid URL encoding.");
  }

  const decodedPathname = decodedPath.split(/[?#]/, 1)[0];
  if (
    typeof path !== "string" ||
    !path.startsWith("./") ||
    decodedPath.includes("\\") ||
    decodedPath.startsWith(".//") ||
    decodedPathname.split("/").includes("..")
  ) {
    throw new Error("Build paths must be repository-relative.");
  }

  const siteRoot = new URL(".", document.baseURI);
  const target = new URL(path, siteRoot);

  if (
    target.origin !== siteRoot.origin ||
    !target.pathname.startsWith(siteRoot.pathname)
  ) {
    throw new Error("Build paths must stay inside this site.");
  }

  return target.href;
}

function validateTextArray(value, field, id) {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((item) => typeof item !== "string" || item.trim() === "")
  ) {
    throw new Error(`Version ${id} needs at least one plain-text ${field} item.`);
  }
  return value;
}

function validateVersion(rawVersion) {
  if (!rawVersion || typeof rawVersion !== "object" || Array.isArray(rawVersion)) {
    throw new Error("Every version must be an object.");
  }

  const { id, label, date, path, changes, controls, limitations } = rawVersion;
  if (id !== "latest") {
    throw new Error('The current build id must be "latest".');
  }
  if (typeof label !== "string" || label.trim() === "") {
    throw new Error(`Version ${id} needs a label.`);
  }
  if (!isValidIsoDate(date)) {
    throw new Error(`Version ${id} needs a valid ISO date.`);
  }
  if (path !== "./builds/latest/index.html") {
    throw new Error("The latest build must use the fixed latest-build path.");
  }
  return {
    id,
    label,
    date,
    changes: validateTextArray(changes, "changes", id),
    controls: validateTextArray(controls, "controls", id),
    limitations: validateTextArray(limitations, "limitations", id),
    url: resolveSafeBuildUrl(path),
  };
}

function validateManifest(rawManifest) {
  if (!rawManifest || typeof rawManifest !== "object" || Array.isArray(rawManifest)) {
    throw new Error("The version manifest must be an object.");
  }
  if (rawManifest.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    throw new Error("The version manifest schema is not supported.");
  }
  if (!Array.isArray(rawManifest.versions)) {
    throw new Error("The version manifest needs a versions array.");
  }
  if (rawManifest.versions.length > 1) {
    throw new Error("The latest-only manifest can contain at most one build.");
  }

  return rawManifest.versions.map((version) => validateVersion(version));
}

function showEmptyState() {
  currentVersion = null;
  setPlaceholder(
    "No playable build yet.",
    "The latest build will appear here when it’s ready.",
  );
  setStatus("empty", "No build is available yet.");
  elements.date.hidden = true;
  showDetailsMessage("No build details to show yet.");
}

function showErrorState() {
  currentVersion = null;
  setPlaceholder(
    "Couldn’t load the latest build.",
    "Check the manifest and build files, then reload.",
  );
  setStatus("error", "Couldn’t load the latest build. Check the manifest and build files, then reload.");
  elements.date.hidden = true;
  showDetailsMessage("Build details are unavailable until the manifest and build files are fixed.");
}

function showVersion(version) {
  if (!version) {
    showErrorState();
    return;
  }

  currentVersion = version;
  elements.placeholder.hidden = true;
  elements.frame.title = version.label;
  elements.frame.src = version.url;
  elements.frame.removeAttribute("tabindex");
  elements.date.textContent = version.date;
  elements.date.hidden = false;
  setStatus("loading", "Loading the latest development build…");
  renderBuildDetails(version);
}

async function loadManifest() {
  try {
    const response = await fetch(MANIFEST_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Manifest request returned ${response.status}.`);
    }

    const manifest = await response.json();
    const loadedVersions = validateManifest(manifest);

    if (loadedVersions.length === 0) {
      showEmptyState();
      return;
    }

    const buildResponse = await fetch(loadedVersions[0].url, {
      method: "HEAD",
      cache: "no-store",
    });
    if (!buildResponse.ok) {
      throw new Error(`Build request returned ${buildResponse.status}.`);
    }

    showVersion(loadedVersions[0]);
  } catch (error) {
    console.error("Unable to load the local build manifest.", error);
    showErrorState();
  }
}

elements.frame.addEventListener("load", () => {
  if (!currentVersion) {
    return;
  }
  setStatus(
    "ready",
    "Latest development build is ready. Click the player before using keyboard controls.",
  );
});

loadManifest();
