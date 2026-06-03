# Sanity Movies Content Studio

Congratulations, you have now installed the Sanity Content Studio, an open-source real-time content editing environment connected to the Sanity backend.

Now you can do the following things:

- [Read “getting started” in the docs](https://www.sanity.io/docs/introduction/getting-started?utm_source=readme)
- Check out one of the example frontends: [React](https://github.com/sanity-io/example-frontend-next-js) | [React Native](https://github.com/sanity-io/example-app-react-native) | [Vue](https://github.com/sanity-io/example-frontend-vue-js) | [PHP](https://github.com/sanity-io/example-frontend-silex-twig)
- [Join the Sanity community](https://www.sanity.io/community/join?utm_source=readme)
- [Extend and build plugins](https://www.sanity.io/docs/content-studio/extending?utm_source=readme)

## Nightly dataset backup → GitHub

This repo also ships a [Sanity Blueprint](https://www.sanity.io/docs/blueprints/blueprints-introduction)
that deploys a [Scheduled Function](https://www.sanity.io/docs/functions/scheduled-function-quickstart)
to Sanity's infrastructure. Every night at **02:00 UTC** it runs the equivalent of
`sanity dataset export` for the `production` dataset and commits the resulting
`.tar.gz` to the root of [`richhiggins/new-movie-starter`](https://github.com/richhiggins/new-movie-starter)
on the `main` branch.

Files involved:

- `sanity.blueprint.ts` — declares the robot token and the `nightly-dataset-backup` scheduled function.
- `functions/nightly-dataset-backup/` — the function source (`index.ts`) and its dependencies (`@sanity/client`, `@sanity/export`, `@sanity/functions`).

### Requirements

- Node.js **v24.x** (matches the deployed runtime).
- Sanity CLI v4.12.0+ (always invoked via `npx sanity@latest` for safety).
- A Sanity organization where you have the **admin** or **blueprint deployer** role
  — scheduled functions require an [organization-scoped blueprint stack](https://www.sanity.io/docs/blueprints/promote-stack-to-organization-scope).
- A GitHub **fine-grained personal access token** scoped to `richhiggins/new-movie-starter`
  with `Contents: Read and write` permission.
- The target branch (`main` by default) must already exist on the repo — GitHub's
  Contents API can't create the initial commit.

### One-time setup

1. Install dependencies:

   ```sh
   npm install
   cd functions/nightly-dataset-backup && npm install && cd ../..
   ```

2. Initialize the blueprint (this links it to your Sanity org and writes
   `.sanity/blueprint.config.json`, which is already gitignored):

   ```sh
   npx sanity@latest blueprints init . \
     --type ts \
     --stack-name production \
     --organization-id <your-organization-id>
   ```

3. Add the GitHub token as a function environment variable:

   ```sh
   npx sanity@latest functions env add nightly-dataset-backup \
     GITHUB_TOKEN <ghp_...>
   ```

4. Preview, then deploy:

   ```sh
   npx sanity@latest blueprints plan
   npx sanity@latest blueprints deploy
   ```

### Configuration

All non-secret settings live in the `env` block of `sanity.blueprint.ts`:

| Variable           | Default                    | Description                                                      |
| ------------------ | -------------------------- | ---------------------------------------------------------------- |
| `SANITY_PROJECT_ID`| `i19d2d0w`                 | Project that owns the dataset being exported.                    |
| `SANITY_DATASET`   | `production`               | Dataset to export.                                               |
| `GITHUB_OWNER`     | `richhiggins`              | GitHub user/org that owns the backup repo.                       |
| `GITHUB_REPO`      | `new-movie-starter`        | GitHub repo to commit to.                                        |
| `GITHUB_BRANCH`    | `main`                     | Branch to commit to (must already exist).                        |
| `BACKUP_FILE_PATH` | `production-backup.tar.gz` | Path inside the repo. Overwritten each night; git keeps history. |
| `INCLUDE_ASSETS`   | `false`                    | Set to `true` to bundle binary assets (image/file uploads).      |

Want a different schedule? Edit the `event` block in `sanity.blueprint.ts` —
both explicit (`{minute, hour, ...}`) and cron (`{expression: '0 2 * * *'}`)
formats are supported, and `timezone` accepts any IANA identifier.

### Test locally

```sh
# Visual playground
npx sanity@latest functions dev

# Or one-off CLI invocation (skips the GitHub commit because context.local === true)
npm run backup:test
```

### Inspect the deployment

```sh
npx sanity@latest blueprints info
npm run blueprints:logs            # tail logs for the backup function
npm run blueprints:logs -- --watch
```

### Limitations

- **GitHub Contents API caps files at ~100 MB.** Datasets larger than that
  (typically when `INCLUDE_ASSETS=true`) need to be migrated to the Git Data API
  or Git LFS — adjust `commitFileToGitHub` in `functions/nightly-dataset-backup/index.ts`.
- Scheduled function cadence depends on your Sanity plan: **Free = daily**,
  **Growth = hourly**, **Enterprise = minutely**. Nightly is fine on every plan.
