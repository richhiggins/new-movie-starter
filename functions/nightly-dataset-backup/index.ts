import {scheduledEventHandler} from '@sanity/functions'
import {createClient} from '@sanity/client'
import {exportDataset} from '@sanity/export'
import {mkdtemp, readFile, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import dotenv from 'dotenv'
dotenv.config()

interface RequiredEnv {
  SANITY_PROJECT_ID: string
  SANITY_DATASET: string
  GITHUB_TOKEN: string
  GITHUB_OWNER: string
  GITHUB_REPO: string
  GITHUB_BRANCH: string
  BACKUP_FILE_PATH: string
  INCLUDE_ASSETS: string
}

function requireEnv(): RequiredEnv {
  const required = [
    'SANITY_PROJECT_ID',
    'SANITY_DATASET',
    'GITHUB_TOKEN',
    'GITHUB_OWNER',
    'GITHUB_REPO',
  ] as const

  const missing = required.filter((key) => !process.env[key])
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`)
  }

  return {
    SANITY_PROJECT_ID: process.env.SANITY_PROJECT_ID!,
    SANITY_DATASET: process.env.SANITY_DATASET!,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN!,
    GITHUB_OWNER: process.env.GITHUB_OWNER!,
    GITHUB_REPO: process.env.GITHUB_REPO!,
    GITHUB_BRANCH: process.env.GITHUB_BRANCH ?? 'main',
    BACKUP_FILE_PATH: process.env.BACKUP_FILE_PATH ?? 'dataset-backup.tar.gz',
    INCLUDE_ASSETS: process.env.INCLUDE_ASSETS ?? 'false',
  }
}

async function commitFileToGitHub(opts: {
  token: string
  owner: string
  repo: string
  branch: string
  path: string
  message: string
  content: Buffer
}): Promise<void> {
  const {token, owner, repo, branch, path, message, content} = opts

  // GitHub's Contents API supports up to ~100 MB per file and is the
  // simplest way to commit a single file. For larger artefacts switch
  // to the Git Data API (blob → tree → commit → ref).
  const baseHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'sanity-nightly-dataset-backup',
  }

  const contentsUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`

  // Look up the existing file SHA so we update in place when it exists.
  let sha: string | undefined
  const headRes = await fetch(`${contentsUrl}?ref=${encodeURIComponent(branch)}`, {
    headers: baseHeaders,
  })
  if (headRes.ok) {
    const data = (await headRes.json()) as {sha?: string}
    sha = data.sha
  } else if (headRes.status !== 404) {
    throw new Error(`GitHub GET failed with ${headRes.status}: ${await headRes.text()}`)
  }

  const body = {
    message,
    content: content.toString('base64'),
    branch,
    ...(sha ? {sha} : {}),
  }

  const putRes = await fetch(contentsUrl, {
    method: 'PUT',
    headers: {...baseHeaders, 'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  })

  if (!putRes.ok) {
    throw new Error(`GitHub PUT failed with ${putRes.status}: ${await putRes.text()}`)
  }
}

export const handler = scheduledEventHandler(async ({context}) => {
  const env = requireEnv()
  const includeAssets = env.INCLUDE_ASSETS.toLowerCase() === 'true'

  const client = createClient({
    projectId: env.SANITY_PROJECT_ID,
    dataset: env.SANITY_DATASET,
    apiVersion: '2025-05-08',
    token: context.clientOptions?.token ?? process.env.SANITY_TOKEN,
    useCdn: false,
  })

  const workDir = await mkdtemp(join(tmpdir(), 'sanity-export-'))
  const outputPath = join(workDir, `${env.SANITY_DATASET}.tar.gz`)
  const startedAt = new Date()

  try {
    console.log(
      `Exporting dataset "${env.SANITY_DATASET}" (assets: ${includeAssets}) → ${outputPath}`,
    )
    await exportDataset({
      client,
      dataset: env.SANITY_DATASET,
      outputPath,
      assets: includeAssets,
      raw: false,
      drafts: true,
    })

    const tarball = await readFile(outputPath)
    const sizeMb = (tarball.byteLength / (1024 * 1024)).toFixed(2)
    console.log(`Export complete: ${sizeMb} MB`)

    if (context.local) {
      console.log('Local run detected — skipping GitHub commit.')
      return
    }

    const isoDate = startedAt.toISOString()
    await commitFileToGitHub({
      token: env.GITHUB_TOKEN,
      owner: env.GITHUB_OWNER,
      repo: env.GITHUB_REPO,
      branch: env.GITHUB_BRANCH,
      path: env.BACKUP_FILE_PATH,
      message: `chore(backup): nightly dataset export ${isoDate}\n\nDataset: ${env.SANITY_DATASET}\nProject: ${env.SANITY_PROJECT_ID}\nAssets included: ${includeAssets}\nSize: ${sizeMb} MB`,
      content: tarball,
    })

    console.log(
      `Pushed ${env.BACKUP_FILE_PATH} (${sizeMb} MB) to ${env.GITHUB_OWNER}/${env.GITHUB_REPO}@${env.GITHUB_BRANCH}`,
    )
  } finally {
    await rm(workDir, {recursive: true, force: true})
  }
})
