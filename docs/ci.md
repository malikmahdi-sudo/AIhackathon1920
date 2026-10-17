# CI and delivery checkpoint

## What runs automatically

`.github/workflows/ci.yml` runs on pushes to every branch, pull requests targeting `main`,
and manual dispatch. GitHub-hosted Ubuntu uses Node.js 24 and `npm ci` with the lockfile.

1. ESLint.
2. Deterministic RSS/ranking, edition, storage-adapter, PDF, and learning tests (no publisher network required).
3. Production build and TypeScript checks.
4. Standalone release packaging, including CSS assets and excluding `.env` files and reader data.
5. Production smoke test on port 3100: homepage/CSS, onboarding, cookie-based preference
   persistence, cross-origin rejection, both loopback hostnames, and an empty archive.
6. Successful pushes to `main` attach a Linux release archive named with the commit SHA.
   Artifacts are retained for seven days. PR checks do not publish artifacts.

Actions are pinned to verified commit SHAs. Workflow permissions are read-only,
checkout credentials are not persisted, runs time out after 15 minutes, and newer
commits cancel obsolete runs on the same branch. Dependabot proposes npm and Actions
updates weekly; it does not automatically merge them.

## What evaluators can inspect

- [Commit history](https://github.com/malikmahdi-sudo/AIhackathon1920/commits/main/): separate conventional commits per working milestone.
- [CI runs](https://github.com/malikmahdi-sudo/AIhackathon1920/actions/workflows/ci.yml): inspect the run for the submitted commit and its check logs.
- Successful `main` run → Artifacts: download the verified release for that commit.
- Build metadata: `BUILD-INFO.json` records commit, platform, Node version, and build time.

The initial CI run succeeded on GitHub. Verify the run for each new submitted commit;
a previous green run or local test success does not verify a later change.

## Reproduce locally

```sh
npm ci
npm run lint
npm test
npm run build
npm run typecheck
npm run package:release
npm run test:release
```

Port 3100 must be free for the smoke test. Packaging requires a clean build; rebuild
before packaging again rather than merging old output. The normal dev server remains
on port 3000. Live RSS tests remain available separately with `npm run test:news:live`;
publisher outages do not block CI.

## Delivery versus deployment

CI produces a runnable artifact; it does **not** deploy a live site yet. No hosting
target has been selected. Extract the Linux artifact on a compatible Linux host
with Node.js 24, then run `node server.js`. Set `HOSTNAME=0.0.0.0` and `PORT` as needed.
The archive includes runtime dependencies, so `npm install` is not required there.

When using the local adapter, the server needs durable writable `data/` storage, preserved across release changes,
and a filesystem supporting hard links. Back it up; never replace it with a build.
Keep one application instance while using local JSON storage. Configure HTTPS and
the public origin/proxy behavior, then verify cookie saves through the actual host.
The Linux CI artifact is the deployment package; a Windows local build is not a
portable Linux release.

For Vercel with persistent Supabase storage, follow [storage setup](storage.md).
The Supabase adapter is implemented, but a live database is not yet connected.

Once hosting is chosen, add deployment after successful checks, with credentials
in GitHub environment secrets and a post-deploy smoke test. Do not describe this
checkpoint as automatic deployment. Branch protection requiring `Verify and package`
is recommended after the first successful run, but is not configured by these files.

## Known dependency audit status

The existing five high-severity findings in the development linting dependency
chain remain unresolved. CI does not claim a clean vulnerability audit or suppress
those findings. Review upgrades separately rather than applying a forced major downgrade.
