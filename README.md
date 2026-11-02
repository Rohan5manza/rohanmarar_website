# Rohan Marar — final portfolio for GitHub Pages

Everything needed to deploy the website is included. No Node.js, npm, paid hosting, API key, server, or database is required. The repository contains the full HTML, CSS, JavaScript, content, photos, six complete migrated blog posts, embedded presentation PDF, and automatic Substack sync.

## Deploy in three steps

1. Create a GitHub repository with `main` as its default branch. A public repository is simplest. You can use a project repository such as `rohan-portfolio`, or your existing `Rohan5manza.github.io` repository. Back up an existing website before replacing its source.
2. Put **all files from this folder** in that repository, including the hidden `.github` folder. Keep `site/`, `scripts/`, and `.github/` at the repository root. GitHub Desktop or Git works well; browser uploads can miss hidden folders.
3. In the repository, open **Settings → Pages → Build and deployment → Source → GitHub Actions**. Then open **Actions → Sync Substack and deploy portfolio → Run workflow**. The completed deployment shows your live URL.

The website works at a repository subpath as well as on a custom domain. All site asset paths are relative and navigation uses hash routes, so you do not need server rewrite rules.

If you want terminal commands, create an empty repository called `rohan-portfolio` first, then run these commands **inside this extracted folder**:

```bash
git init -b main
git add .
git commit -m "Add portfolio website"
git remote add origin https://github.com/Rohan5manza/rohan-portfolio.git
git push -u origin main
```

For a different repository, replace the remote URL with its own URL. Do not run these initialization commands on top of an existing clone; copy the files into that clone and commit normally instead.

### If GitHub rejects a workflow push

A personal access token used for Git pushes may need permission to update workflow files. GitHub Desktop's normal sign-in is often simpler. No token belongs in this project or in its files.

## Automatic Substack updates

The included GitHub Actions workflow checks `https://rohanmarar.substack.com/feed` every 30 minutes, and on each push or manual run. It copies public article titles, dates, images, and feed-provided body content into `site/substack-feed.json`, then deploys the static website. It retains older imported posts even when they drop out of the current RSS feed. It commits only when the generated file changes.

GitHub schedules are best-effort and can be delayed or paused on inactive repositories. You can always select **Run workflow** to request a sync and deployment yourself.

**Current limitation:** Substack returned HTTP 429 (rate limited) to the hosted site's server during verification. This package includes a saved index of 12 existing Substack articles, and its sync automatically tries from GitHub when the workflow runs. A live sync from your GitHub repository has not yet been verified. If Substack still rejects the request, the workflow preserves the saved articles and the page labels that fallback clearly. Full local reading of Substack articles becomes available when the public RSS feed supplies their content. Subscriber-only content is limited to what the public feed exposes.

If the sync cannot commit updated posts, check **Settings → Actions → General → Workflow permissions** and any branch protection rules. The workflow requests repository write permission only for the build/sync job; the deployment job requests GitHub Pages and identity-token permissions.

The website's **Reload posts** button reloads the most recently deployed static feed; it does not trigger a GitHub Actions run.

## Edit without touching the layout

Open `studio.html` on your deployed site. Edit your profile, projects, books, experience, or Other entries; preview your draft; and export `content.json`. Replace **`site/content.json`** in GitHub and commit. GitHub Actions redeploys it automatically.

The studio's draft is stored in your browser. It does not publish by itself. Export a copy before clearing browser storage. Since it can only edit a visitor's own browser draft, it needs no admin password and exposes no write access to your repository.

The Writing index is editable there too. Full migrated article bodies live in `site/posts/*.json` as HTML; edit those files or ask ChatGPT to update them. Images go in `site/assets/`. Add entries to the corresponding arrays in `site/content.json`, or use the studio's Add entry buttons. Project IDs must be unique and contain lowercase letters, digits, and hyphens. Dates use `YYYY-MM-DD`.

## Custom domain: www.rohanmarar.com

First verify the GitHub Pages URL. Then set `www.rohanmarar.com` in **Settings → Pages → Custom domain**, follow GitHub's displayed DNS instructions in Cloudflare, and enable HTTPS after GitHub finishes issuing the certificate. The instructions are at https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site.

No custom-domain file or DNS change is preconfigured in this package. Your existing website remains available until you deliberately switch it.

## Preview locally

```bash
python3 -m http.server 8080 --directory site
```

Open `http://localhost:8080`. Use a local web server instead of double-clicking `index.html`, because the site loads JSON files with fetch.

Optional manual sync and build:

```bash
python3 scripts/sync_substack.py
python3 scripts/build_site.py
python3 -m http.server 8080 --directory _site
```

Both Python scripts use only the standard library. Nothing needs to be installed with pip.

## What is included

- `site/index.html`, `app.js`, `style.css`: the complete website and responsive dark/light design.
- `site/content.json`: profile, six projects, five books, six migrated blog entries, experience, and Other.
- `site/posts/`: the six full original blog posts, with author prose preserved.
- `site/assets/`: all required photos, book covers, project images, and 23 migrated blog media files.
- `site/studio.html`, `studio.js`: the browser content editor.
- `site/substack-feed.json`: generated public article feed.
- `site/substack-snapshot.json`: the saved fallback index.
- `scripts/sync_substack.py`: RSS importer with safe failure handling.
- `scripts/build_site.py`: validation and static site assembly.
- `.github/workflows/pages.yml`: automated sync and GitHub Pages deployment.

This is the portable static export. It does not include the unnecessary server framework or any credentials from the private hosted draft.

GitHub's workflow documentation: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages.
