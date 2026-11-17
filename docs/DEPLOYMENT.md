# Deployment and maintenance

Battleships is a static browser game. The published site needs only `index.html`, `styles.css`, `src/app.js`, and `src/game.js`. There is no server, database, or runtime token.

## Verify locally

Use Node.js 20+ (CI uses Node 22). No dependency installation is required.

```sh
npm run dev
npm run check
npm test
```

The development command prints a local URL. Use the server rather than opening `index.html` directly, because the app loads JavaScript modules.

## GitHub Pages: one-time repository setup

1. In the repository, visit **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**.
2. Keep PR #6 as a draft until the browser game passes maintainer review. When approved, merge the reviewed changes into `main`.
3. A successful push to `main` runs **Browser game CI**: syntax check → game tests → static artifact → Pages deployment. If Pages is enabled only after merging, use **Actions → Browser game CI → Run workflow** on `main` to publish.
4. Once deployment succeeds, the site should be at `https://syris-ekzd.github.io/C-Battleships-with-UI/`. Confirm the published URL in the `github-pages` environment / deployment job.

If deployment fails, check Pages source configuration, the `github-pages` environment approvals, and Actions permissions. The build only uploads an explicit allowlist of game files—not tests, repository metadata, or the archived desktop binaries.

## Protect production before merging

At the time of this handoff, GitHub reports `main` is **not protected** and no repository ruleset is active. A workflow file cannot enforce repository-level protection by itself.

In **Settings → Rules → Rulesets**, create an active branch ruleset targeting only `main`. Require changes through pull requests and a passing **Validate browser game** check; disallow force pushes and branch deletion. Do **not** require the skipped `Deploy GitHub Pages` job as a PR check. Only require an approval count if a separate reviewer is available, so sole-maintainer PRs do not deadlock.

This repository-settings step must be performed by a repository administrator; it cannot be applied by this code-only PR.

## Contribution rules

- `main` is the production branch. Use a feature/fix branch and a pull request; do not push straight to `main`.
- Keep pull requests focused and use Conventional Commits (header at most 50 characters).
- Preserve 5×5 / 7×7 / 10×10 boards, the respective 3 / 4 / 5 **single-cell** ships, valid placements, alternating shots, hidden PvP boards, and victory rules unless a separate gameplay change is approved.
- CI must pass and a maintainer must review before merging. Do not publish PR changes automatically.
- Add or update game rule tests when changing `src/game.js`. Verify keyboard and mobile interactions separately when changing `src/app.js` or `styles.css`.
- Leave README edits to the designated documentation session to avoid concurrent changes.

## Release behavior

Changes reach the public game only after they are merged into `main` and the deployment completes. Players may need to refresh their browser; active games are local, in memory, and are not saved or synchronized. GitHub Pages is **hosting**, not real-time multiplayer infrastructure.
