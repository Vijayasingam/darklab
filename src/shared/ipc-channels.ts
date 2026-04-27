// All IPC channel names as a const enum.
// Main process registers handlers; preload + renderer use these to invoke/listen.

export const IPC = {
  // ---------------------------------------------------------------------------
  // Auth & Accounts
  // ---------------------------------------------------------------------------
  AUTH: {
    ADD_ACCOUNT: 'auth:add-account',
    ADD_ACCOUNT_PAT: 'auth:add-account',
    START_OAUTH: 'auth:open-oauth-browser',
    REMOVE_ACCOUNT: 'auth:remove-account',
    SWITCH_ACCOUNT: 'auth:switch-account',
    TEST_CONNECTION: 'auth:test-connection',
    GET_ACCOUNTS: 'auth:get-accounts',
    LIST_ACCOUNTS: 'auth:get-accounts',
    GET_CURRENT_USER: 'auth:get-current-user',
    GET_ACTIVE_ACCOUNT: 'auth:get-active-account',
    REAUTH_REQUIRED: 'auth:reauth-required', // main → renderer push
    OPEN_OAUTH_BROWSER: 'auth:open-oauth-browser'
  },

  // ---------------------------------------------------------------------------
  // Repositories
  // ---------------------------------------------------------------------------
  REPOS: {
    LIST: 'repos:list',
    GET: 'repos:get',
    SEARCH: 'repos:search',
    GET_BRANCHES: 'repos:get-branches',
    LIST_BRANCHES: 'repos:get-branches',
    LIST_STARRED: 'repos:list-starred',
    STAR: 'repos:star',
    UNSTAR: 'repos:unstar',
    LIST_COLLECTIONS: 'repos:list-collections',
    SAVE_COLLECTION: 'repos:save-collection',
    DELETE_COLLECTION: 'repos:delete-collection'
  },

  // ---------------------------------------------------------------------------
  // Merge Requests
  // ---------------------------------------------------------------------------
  MR: {
    LIST: 'mr:list', // per-repo or global
    GET: 'mr:get',
    GET_DIFF_FILES: 'mr:get-diff-files',
    GET_FILE_PAIR: 'mr:get-file-pair',
    GET_THREADS: 'mr:get-threads',
    POST_COMMENT: 'mr:post-comment',
    POST_DRAFT_NOTE: 'mr:post-draft-note',
    SUBMIT_REVIEW: 'mr:submit-review',
    DISCARD_DRAFTS: 'mr:discard-drafts',
    DISCARD_DRAFT_NOTES: 'mr:discard-drafts',
    RESOLVE_THREAD: 'mr:resolve-thread',
    APPROVE: 'mr:approve',
    UNAPPROVE: 'mr:unapprove',
    REQUEST_CHANGES: 'mr:request-changes',
    MERGE: 'mr:merge',
    CLOSE: 'mr:close',
    CREATE: 'mr:create',
    GET_MERGE_OPTIONS: 'mr:get-merge-options'
  },

  // ---------------------------------------------------------------------------
  // My Work
  // ---------------------------------------------------------------------------
  MY_WORK: {
    GET: 'my-work:get'
  },

  // ---------------------------------------------------------------------------
  // Pipelines
  // ---------------------------------------------------------------------------
  PIPELINE: {
    LIST: 'pipeline:list', // per-repo or global
    GET: 'pipeline:get',
    TRIGGER: 'pipeline:trigger',
    CANCEL: 'pipeline:cancel',
    RETRY: 'pipeline:retry',
    GET_STAGES: 'pipeline:get-stages',
    GET_TEST_REPORT: 'pipeline:get-test-report'
  },

  // ---------------------------------------------------------------------------
  // Jobs
  // ---------------------------------------------------------------------------
  JOB: {
    LIST: 'job:list',
    GET: 'job:get',
    RETRY: 'job:retry',
    CANCEL: 'job:cancel',
    GET_LOG: 'job:get-log',
    STREAM_LOG: 'job:get-log',
    LOG_CHUNK: 'job:log-chunk', // main → renderer push (streaming)
    LOG_DONE: 'job:log-done',   // main → renderer push
    GET_ARTIFACTS: 'job:get-artifacts',
    LIST_ARTIFACTS: 'job:get-artifacts',
    DOWNLOAD_ARTIFACT: 'job:download-artifact',
    ARTIFACT_PROGRESS: 'job:artifact-progress' // main → renderer push
  },

  // ---------------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------------
  NOTIFICATION: {
    GET_ALL: 'notification:get-all',
    LIST: 'notification:get-all',
    MARK_READ: 'notification:mark-read',
    MARK_ALL_READ: 'notification:mark-all-read',
    DISMISS: 'notification:dismiss',
    DISMISS_ALL: 'notification:dismiss-all',
    NEW: 'notification:new', // main → renderer push
    GET_PREFERENCES: 'notification:get-preferences',
    SET_PREFERENCES: 'notification:set-preferences',
    SAVE_PREFERENCES: 'notification:set-preferences',
    SNOOZE_MR: 'notification:snooze-mr',
    UNSNOOZE_MR: 'notification:unsnooze-mr',
    MUTE_REPO: 'notification:mute-repo',
    UNMUTE_REPO: 'notification:unmute-repo',
    GET_SNOOZE_STATE: 'notification:get-snooze-state',
    LIST_SNOOZED: 'notification:list-snoozed',
    LIST_MUTED: 'notification:list-muted'
  },

  // ---------------------------------------------------------------------------
  // Activity Feed
  // ---------------------------------------------------------------------------
  ACTIVITY: {
    LIST: 'activity:list',
    MARK_ALL_READ: 'activity:mark-all-read'
  },

  // ---------------------------------------------------------------------------
  // Polling Config
  // ---------------------------------------------------------------------------
  POLLING: {
    GET_CONFIG: 'polling:get-config',
    SET_CONFIG: 'polling:set-config',
    SAVE_CONFIG: 'polling:set-config',
    PAUSE: 'polling:pause',
    RESUME: 'polling:resume'
  },

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------
  SETTINGS: {
    GET: 'settings:get',
    SET: 'settings:set',
    GET_ALL: 'settings:get',
    SET_THEME: 'settings:set-theme',
    RESET: 'settings:reset',
    GET_ONBOARDING_COMPLETE: 'settings:get-onboarding-complete',
    SET_ONBOARDING_COMPLETE: 'settings:set-onboarding-complete',
    COMPLETE_ONBOARDING: 'settings:set-onboarding-complete',
    GET_WEBHOOK: 'settings:get-webhook',
    SAVE_WEBHOOK: 'settings:save-webhook',
    GET_RECENT_ITEMS: 'settings:get-recent-items',
    ADD_RECENT_ITEM: 'settings:add-recent-item'
  },

  // ---------------------------------------------------------------------------
  // Tabs (persisted state sync)
  // ---------------------------------------------------------------------------
  TABS: {
    SAVE_STATE: 'tabs:save-state',
    LOAD_STATE: 'tabs:load-state',
    SAVE_ALL: 'tabs:save-state',
    GET_ALL: 'tabs:load-state'
  },

  // ---------------------------------------------------------------------------
  // App / Shell
  // ---------------------------------------------------------------------------
  APP: {
    OPEN_EXTERNAL: 'app:open-external',
    WRITE_CLIPBOARD: 'app:write-clipboard',
    SHOW_CONFIRM_DIALOG: 'app:show-confirm-dialog',
    GET_VERSION: 'app:get-version',
    CHECK_UPDATE: 'app:check-update',
    UPDATE_AVAILABLE: 'app:update-available', // main → renderer push
    UPDATE_DOWNLOADED: 'app:update-downloaded', // main → renderer push
    INSTALL_UPDATE: 'app:install-update',
    QUIT_AND_INSTALL: 'app:install-update',
    OPEN_COMMAND_CENTER: 'app:open-command-center' // main → renderer push (globalShortcut)
  }
} as const
