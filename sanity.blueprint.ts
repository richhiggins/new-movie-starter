import {defineBlueprint, defineScheduledFunction, defineRobotToken} from '@sanity/blueprints'

/**
 * Nightly dataset backup
 *
 * - A robot token grants the scheduled function read access to the project's
 *   dataset so it can run `@sanity/export` against it.
 * - A scheduled function runs every night at 02:00 UTC, exports the dataset
 *   to a `.tar.gz` (identical output to `sanity dataset export`) and commits
 *   it to the root of the configured GitHub repository.
 *
 * Prerequisites (one-time setup, run from this directory):
 *
 *   npx sanity@latest blueprints init . \
 *     --type ts \
 *     --stack-name production \
 *     --organization-id <your-organization-id>
 *
 *   # Personal-access token for the GitHub repo (must have `contents: write`)
 *   npx sanity@latest functions env add nightly-dataset-backup \
 *     GITHUB_TOKEN <ghp_...>
 *
 *   npx sanity@latest blueprints deploy
 */
export default defineBlueprint({
  resources: [
    defineRobotToken({
      name: 'nightly-backup-robot',
      label: 'Nightly Dataset Backup',
      memberships: [
        {
          resourceType: 'project',
          resourceId: 'i19d2d0w',
          roleNames: ['viewer'],
        },
      ],
    }),
    defineScheduledFunction({
      name: 'nightly-dataset-backup',
      displayName: 'Nightly dataset backup → GitHub',
      // Run every day at 02:00 UTC.
      event: {
        minute: '0',
        hour: '2',
        dayOfMonth: '*',
        month: '*',
        dayOfWeek: '*',
      },
      timezone: 'UTC',
      // Dataset export + GitHub upload can take a while on large datasets.
      memory: 2,
      timeout: 900,
      runtime: 'nodejs24.x',
      robotToken: '$.resources.nightly-backup-robot.token',
      env: {
        SANITY_PROJECT_ID: 'i19d2d0w',
        SANITY_DATASET: 'production',
        // GitHub repository to commit the backup to.
        GITHUB_OWNER: 'richhiggins',
        GITHUB_REPO: 'new-movie-starter',
        GITHUB_BRANCH: 'main',
        // Path inside the repo (root). Overwrites the same file each night;
        // history is preserved via git commits.
        BACKUP_FILE_PATH: 'production-backup.tar.gz',
        // Set to 'true' to also include image/file assets in the export.
        // Disabled by default to keep the tarball small (and under GitHub's
        // 100 MB Contents API limit).
        INCLUDE_ASSETS: 'true',
      },
    }),
  ],
})
