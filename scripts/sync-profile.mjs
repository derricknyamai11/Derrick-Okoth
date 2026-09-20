#!/usr/bin/env node
/**
 * Generate the dynamic sections of README.md from GitHub's API.
 *
 * Public repositories are included always.
 * Private repositories are shown only when INCLUDE_PRIVATE_PROJECTS=true.
 */

import { readFile, writeFile } from "node:fs/promises";

const owner = process.env.GITHUB_OWNER || "derricknyamai11";
const profileRepo = process.env.PROFILE_REPO || "Derrick-Okoth";
const token = process.env.GITHUB_TOKEN;
const includePrivate = process.env.INCLUDE_PRIVATE_PROJECTS === "true";
const maxProjects = Number(process.env.MAX_PROJECTS || 12);
const readmePath = process.env.README_PATH || "README.md";

if (!token) throw new Error("GITHUB_TOKEN is required");

async function github(path) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "derrick-okoth-profile-sync",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API ${response.status} for ${path}: ${await response.text()}`);
  }

  return response.json();
}

async function allRepositories() {
  const repos = [];
  for (let page = 1; page <= 10; page += 1) {
    const batch = await github(
      `/user/repos?visibility=all&affiliation=owner,collaborator,organization_member&sort=updated&per_page=100&page=${page}`
    );
    repos.push(...batch);
    if (batch.length < 100) break;
  }

  return repos.filter((repo) => repo.owner?.login === owner && repo.name !== profileRepo);
}

function projectRows(repos) {
  return repos
    .slice(0, maxProjects)
    .map((repo) => {
      const visibility = repo.private ? "🔒 Private" : "🌐 Public";
      const description = (repo.description || "No description yet.").replace(/\r?\n/g, " ");
      const language = repo.language || "—";
      return `| [${repo.name}](${repo.html_url}) | ${language} | ${visibility} | ${description} |`;
    })
    .join("\n");
}

function activityRows(events) {
  return events
    .slice(0, 8)
    .map((event) => {
      const repo = event.repo?.name || "GitHub";
      const date = new Date(event.created_at).toISOString().slice(0, 10);
      const type = event.type.replace("Event", "");
      return `| ${date} | ${type} | [${repo}](https://github.com/${repo}) |`;
    })
    .join("\n");
}

const repositories = await allRepositories();
const visibleRepositories = repositories.filter((repo) => !repo.private || includePrivate);
const publicCount = repositories.filter((repo) => !repo.private).length;
const privateCount = repositories.filter((repo) => repo.private).length;

let events = [];
try {
  events = await github(`/users/${owner}/events/public?per_page=30`);
} catch (error) {
  console.warn(`Activity could not be loaded: ${error.message}`);
}

const generated = `<!-- AUTO-GENERATED:PROFILE-START -->
## ⚡ Live GitHub Portfolio

This section is synchronized automatically from GitHub. Last synchronized: **${new Date().toISOString().replace("T", " ").slice(0, 19)} UTC**.

| Project | Primary language | Visibility | Description |
|---|---|---|---|
${projectRows(visibleRepositories) || "| — | — | — | No repositories found. |"}

**Repository overview:** ${publicCount} public · ${privateCount} private repositories available to the synchronizer.

> Private projects are shown here because the workflow was configured to include them. Remove that setting if this README is public and private project names should remain confidential.

### 🛰️ Recent public activity

| Date | Activity | Repository |
|---|---|---|
${activityRows(events) || "| — | No recent public activity available. | — |"}

<!-- AUTO-GENERATED:PROFILE-END -->`;

let readme = await readFile(readmePath, "utf8");
const start = "<!-- AUTO-GENERATED:PROFILE-START -->";
const end = "<!-- AUTO-GENERATED:PROFILE-END -->";
const block = `${generated}\n`;
const startIndex = readme.indexOf(start);
const endIndex = readme.indexOf(end);

if (startIndex >= 0 && endIndex > startIndex) {
  readme = `${readme.slice(0, startIndex)}${block}${readme.slice(endIndex + end.length)}`;
} else {
  readme = `${readme.trimEnd()}\n\n${block}`;
}

await writeFile(readmePath, readme);
console.log(`Updated ${readmePath} with ${visibleRepositories.length} projects and ${events.length} public events.`);
