# De Book Deployment (Google Sheets + Apps Script + GitHub Pages)

## Architecture

1. Source data in Google Sheets (`events` tab).
2. Apps Script validates and converts rows to normalized JSON.
3. Apps Script commits `data/events.json` to GitHub.
4. GitHub Pages serves the static app (`index.html`, `app.js`, `styles.css`).

## Repository Preparation

Use these commands in project root:

```bash
git init
git add .
git commit -m "feat: initial De Book web app + sheets pipeline"
```

Create a remote repository on GitHub, then:

```bash
git remote add origin https://github.com/<OWNER>/<REPO>.git
git branch -M main
git push -u origin main
```

## Enable GitHub Pages

1. Open repository Settings -> Pages.
2. Source: Deploy from branch.
3. Branch: `main`, folder: `/ (root)`.
4. Save and wait for publish.

Site URL will be:

```text
https://<OWNER>.github.io/<REPO>/
```

## Data Editing Workflow

1. Edit rows in Google Sheet.
2. In Apps Script, run `validateSheet`.
3. Run `publishToGitHub`.
4. Refresh GitHub Pages site.

## Optional Automation

Use sheet menu:

- `De Book -> Setup Daily Auto Publish`

This creates a daily time-based trigger for `publishToGitHubByTrigger`.
