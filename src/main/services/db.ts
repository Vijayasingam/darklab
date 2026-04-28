import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

let db: Database.Database

export function initDb(): void {
  const dbPath = join(app.getPath('userData'), 'darklab.db')
  db = new Database(dbPath)

  // WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  runMigrations()
}

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialised. Call initDb() first.')
  return db
}

// ---------------------------------------------------------------------------
// Migrations
// ---------------------------------------------------------------------------

interface Migration {
  version: number
  up: (db: Database.Database) => void
}

const migrations: Migration[] = [
  {
    version: 1,
    up: (db) => {
      // Accounts (metadata only — tokens held in electron-store via safeStorage)
      db.exec(`
        CREATE TABLE IF NOT EXISTS accounts (
          id           TEXT NOT NULL,
          provider     TEXT NOT NULL,
          display_name TEXT NOT NULL,
          username     TEXT NOT NULL,
          avatar_url   TEXT,
          base_url     TEXT NOT NULL,
          auth_method  TEXT NOT NULL,
          created_at   TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (id)
        );
      `)

      // Repositories
      db.exec(`
        CREATE TABLE IF NOT EXISTS repositories (
          id                   INTEGER NOT NULL,
          account_id           TEXT NOT NULL,
          name                 TEXT NOT NULL,
          full_path            TEXT NOT NULL,
          description          TEXT,
          default_branch       TEXT NOT NULL,
          web_url              TEXT NOT NULL,
          avatar_url           TEXT,
          primary_language     TEXT,
          visibility           TEXT NOT NULL,
          star_count           INTEGER NOT NULL DEFAULT 0,
          open_mr_count        INTEGER NOT NULL DEFAULT 0,
          last_activity_at     TEXT,
          last_pipeline_status TEXT,
          updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (id, account_id),
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_repos_account ON repositories(account_id);
      `)

      // Merge Requests
      db.exec(`
        CREATE TABLE IF NOT EXISTS merge_requests (
          id                     INTEGER NOT NULL,
          iid                    INTEGER NOT NULL,
          account_id             TEXT NOT NULL,
          repo_id                INTEGER NOT NULL,
          repo_full_path         TEXT NOT NULL,
          title                  TEXT NOT NULL,
          description            TEXT,
          state                  TEXT NOT NULL,
          is_draft               INTEGER NOT NULL DEFAULT 0,
          author_json            TEXT NOT NULL,
          assignees_json         TEXT NOT NULL DEFAULT '[]',
          reviewers_json         TEXT NOT NULL DEFAULT '[]',
          labels_json            TEXT NOT NULL DEFAULT '[]',
          milestone_json         TEXT,
          source_branch          TEXT NOT NULL,
          target_branch          TEXT NOT NULL,
          web_url                TEXT NOT NULL,
          created_at             TEXT NOT NULL,
          updated_at             TEXT NOT NULL,
          merged_at              TEXT,
          closed_at              TEXT,
          thread_count           INTEGER NOT NULL DEFAULT 0,
          unresolved_thread_count INTEGER NOT NULL DEFAULT 0,
          approvals_required     INTEGER NOT NULL DEFAULT 0,
          approvals_given        INTEGER NOT NULL DEFAULT 0,
          has_conflicts          INTEGER NOT NULL DEFAULT 0,
          detailed_merge_status  TEXT,
          pipeline_status        TEXT,
          pipeline_web_url       TEXT,
          diff_refs_json         TEXT,
          allowed_merge_strategies_json TEXT NOT NULL DEFAULT '[]',
          cache_updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (id, account_id),
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
          FOREIGN KEY (repo_id, account_id) REFERENCES repositories(id, account_id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_mr_account_repo ON merge_requests(account_id, repo_id);
        CREATE INDEX IF NOT EXISTS idx_mr_state ON merge_requests(state);
      `)

      // Pipelines
      db.exec(`
        CREATE TABLE IF NOT EXISTS pipelines (
          id               INTEGER NOT NULL,
          account_id       TEXT NOT NULL,
          repo_id          INTEGER NOT NULL,
          repo_full_path   TEXT NOT NULL,
          status           TEXT NOT NULL,
          ref              TEXT NOT NULL,
          sha              TEXT NOT NULL,
          source           TEXT,
          web_url          TEXT NOT NULL,
          created_at       TEXT NOT NULL,
          updated_at       TEXT NOT NULL,
          started_at       TEXT,
          finished_at      TEXT,
          duration         INTEGER,
          coverage         REAL,
          mr_iid           INTEGER,
          cache_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (id, account_id),
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_pipeline_account_repo ON pipelines(account_id, repo_id);
        CREATE INDEX IF NOT EXISTS idx_pipeline_status ON pipelines(status);
      `)

      // Jobs
      db.exec(`
        CREATE TABLE IF NOT EXISTS jobs (
          id               INTEGER NOT NULL,
          pipeline_id      INTEGER NOT NULL,
          account_id       TEXT NOT NULL,
          repo_id          INTEGER NOT NULL,
          name             TEXT NOT NULL,
          stage            TEXT NOT NULL,
          status           TEXT NOT NULL,
          web_url          TEXT NOT NULL,
          created_at       TEXT NOT NULL,
          started_at       TEXT,
          finished_at      TEXT,
          duration         INTEGER,
          allow_failure    INTEGER NOT NULL DEFAULT 0,
          artifacts_json   TEXT NOT NULL DEFAULT '[]',
          log_cache        TEXT,
          cache_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (id, account_id),
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_job_pipeline ON jobs(pipeline_id, account_id);
      `)

      // Notification log
      db.exec(`
        CREATE TABLE IF NOT EXISTS notification_log (
          id            TEXT NOT NULL,
          account_id    TEXT NOT NULL,
          event_type    TEXT NOT NULL,
          title         TEXT NOT NULL,
          body          TEXT NOT NULL,
          entity_id     INTEGER NOT NULL,
          entity_type   TEXT NOT NULL,
          repo_id       INTEGER NOT NULL,
          repo_full_path TEXT NOT NULL,
          web_url       TEXT NOT NULL,
          read          INTEGER NOT NULL DEFAULT 0,
          snoozed_until TEXT,
          created_at    TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (id),
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_notif_account ON notification_log(account_id, read);
        CREATE INDEX IF NOT EXISTS idx_notif_created ON notification_log(created_at DESC);
      `)

      // Notification preferences
      db.exec(`
        CREATE TABLE IF NOT EXISTS notification_preferences (
          account_id          TEXT NOT NULL,
          enabled_events_json TEXT NOT NULL DEFAULT '[]',
          quiet_hours_start   TEXT,
          quiet_hours_end     TEXT,
          sound_enabled       INTEGER NOT NULL DEFAULT 1,
          native_enabled      INTEGER NOT NULL DEFAULT 1,
          in_app_enabled      INTEGER NOT NULL DEFAULT 1,
          PRIMARY KEY (account_id),
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
        );
      `)

      // Snooze state
      db.exec(`
        CREATE TABLE IF NOT EXISTS snoozed_mrs (
          mr_iid       INTEGER NOT NULL,
          repo_id      INTEGER NOT NULL,
          account_id   TEXT NOT NULL,
          snoozed_until TEXT NOT NULL,
          PRIMARY KEY (mr_iid, repo_id, account_id)
        );
      `)

      // Muted repos
      db.exec(`
        CREATE TABLE IF NOT EXISTS muted_repos (
          repo_id    INTEGER NOT NULL,
          account_id TEXT NOT NULL,
          muted_until TEXT,
          PRIMARY KEY (repo_id, account_id)
        );
      `)

      // Polling config
      db.exec(`
        CREATE TABLE IF NOT EXISTS polling_config (
          account_id        TEXT NOT NULL,
          entity            TEXT NOT NULL,
          interval_seconds  INTEGER NOT NULL,
          enabled           INTEGER NOT NULL DEFAULT 1,
          PRIMARY KEY (account_id, entity),
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
        );
      `)

      // Activity feed
      db.exec(`
        CREATE TABLE IF NOT EXISTS activity_events (
          id             TEXT NOT NULL,
          account_id     TEXT NOT NULL,
          repo_id        INTEGER NOT NULL,
          repo_full_path TEXT NOT NULL,
          event_type     TEXT NOT NULL,
          actor_json     TEXT NOT NULL,
          title          TEXT NOT NULL,
          body           TEXT,
          entity_id      INTEGER NOT NULL,
          entity_type    TEXT NOT NULL,
          web_url        TEXT NOT NULL,
          created_at     TEXT NOT NULL,
          read           INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (id),
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_activity_account ON activity_events(account_id, created_at DESC);
      `)

      // Schema version tracking
      db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version    INTEGER NOT NULL PRIMARY KEY,
          applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `)
    }
  }
]

function runMigrations(): void {
  // Ensure migration table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER NOT NULL PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  const applied = db
    .prepare('SELECT version FROM schema_migrations ORDER BY version ASC')
    .all() as { version: number }[]

  const appliedVersions = new Set(applied.map((r) => r.version))

  for (const migration of migrations) {
    if (!appliedVersions.has(migration.version)) {
      const runMigration = db.transaction(() => {
        migration.up(db)
        db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(migration.version)
      })
      runMigration()
    }
  }
}

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

const TTL_SECONDS: Record<string, number> = {
  repos: 300,
  merge_requests: 60,
  pipelines: 30,
  jobs: 15,
  activity_events: 120
}

export function isCacheStale(table: string, updatedAt: string): boolean {
  const ttl = TTL_SECONDS[table] ?? 60
  const updatedAtMs = new Date(updatedAt).getTime()
  return Date.now() - updatedAtMs > ttl * 1000
}
