# Repository Guidelines

## Project Structure & Module Organization
This repository is an Eleventy-powered static site for the GRC Engineer Directory. Content lives in `engineers/*.md`; each file is one profile page and must follow the schema in `engineers/_template.md`. Site templates and page sources live under `site/`, especially `site/_includes/layouts/`, `site/_includes/partials/`, and `site/_data/`. Frontend assets are in `site/assets/css/` and `site/assets/js/`. Build output is generated into `_site/` and should not be committed by hand. Automation and validation rules live in `.github/workflows/`.

## Build, Test, and Development Commands
Install dependencies once with `npm install`. Use `npm run serve` to start Eleventy with live reload at `http://localhost:8080`. Use `npm run build` to generate the production site in `_site/`. There is no separate unit test suite; the main local verification step is a clean build plus checking the rendered pages in the dev server.

## Coding Style & Naming Conventions
Follow the existing style: 2-space indentation in JavaScript, JSON, Nunjucks, and YAML frontmatter; semicolons in JS; and straightforward ES5-style browser code unless a file already uses newer syntax. Keep template and asset filenames kebab-case, such as `engineer-card.njk` and `filter-bar.njk`. Engineer profile filenames must match the `github` frontmatter value exactly: `engineers/<github-username>.md`.

## Testing & Validation Guidelines
Before opening a PR, run `npm run build` and confirm the relevant page renders correctly. For profile submissions, verify required frontmatter fields (`name`, `github`, `specializations`) and keep links well-formed. The `validate-submission.yml` workflow rejects mismatched filenames, invalid GitHub usernames, empty specializations, and dangerous HTML in markdown bodies.

## Commit & Pull Request Guidelines
Recent history uses short imperative prefixes like `fix:`, `docs:`, `improve:`, and `redesign:`. Keep commit subjects brief and descriptive, for example `fix: tighten homepage filter spacing`. For PRs, follow `.github/PULL_REQUEST_TEMPLATE/engineer-submission.md`, keep changes scoped, and explain any content or layout impact. For profile additions, include the profile summary and checklist; for UI changes, add screenshots when the rendered result changes.

## Content & Automation Notes
Do not hand-edit generated README table entries between `BEGIN_ENGINEER_LIST` markers; the update workflow rewrites that section. Avoid inline scripts or embedded HTML in profile bodies, and prefer standard Markdown plus frontmatter-driven data.
