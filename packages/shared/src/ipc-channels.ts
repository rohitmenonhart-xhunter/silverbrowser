export const IPC = {
  // Tab management
  TAB_CREATE: 'silver:tabs:create',
  TAB_CLOSE: 'silver:tabs:close',
  TAB_SWITCH: 'silver:tabs:switch',
  TAB_NAVIGATE: 'silver:tabs:navigate',
  TAB_BACK: 'silver:tabs:back',
  TAB_FORWARD: 'silver:tabs:forward',
  TAB_RELOAD: 'silver:tabs:reload',
  TAB_LIST: 'silver:tabs:list',
  TAB_REORDER: 'silver:tabs:reorder',
  TAB_CREATE_INCOGNITO: 'silver:tabs:create-incognito',
  TAB_SPLIT: 'silver:tabs:split',
  TAB_UNSPLIT: 'silver:tabs:unsplit',
  TAB_UPDATE: 'silver:tabs:update',

  // Ghost agent
  GHOST_RUN: 'silver:ghost:run',
  GHOST_STOP: 'silver:ghost:stop',
  GHOST_STATUS: 'silver:ghost:status',
  GHOST_STEP: 'silver:ghost:step',
  GHOST_RESULT: 'silver:ghost:result',
  GHOST_STREAM: 'silver:ghost:stream',
  GHOST_PANEL_TOGGLE: 'silver:ghost:panel-toggle',
  GHOST_CHAT: 'silver:ghost:chat',
  GHOST_SUMMARIZE: 'silver:ghost:summarize',

  // Ad blocker
  ADS_STATS: 'silver:ads:stats',
  ADS_TOGGLE: 'silver:ads:toggle',
  ADS_WHITELIST: 'silver:ads:whitelist',

  // Import
  IMPORT_DETECT: 'silver:import:detect',
  IMPORT_RUN: 'silver:import:run',
  IMPORT_GET_DATA: 'silver:import:get-data',

  // Vault — passwords
  VAULT_SAVE_PASSWORD: 'silver:vault:save-password',
  VAULT_GET_PASSWORDS: 'silver:vault:get-passwords',
  VAULT_LIST_PASSWORDS: 'silver:vault:list-passwords',
  VAULT_DELETE_PASSWORD: 'silver:vault:delete-password',
  VAULT_AUTOFILL: 'silver:vault:autofill',

  // Vault — safe folder
  VAULT_SAFE_LIST: 'silver:vault:safe-list',
  VAULT_SAFE_ADD: 'silver:vault:safe-add',
  VAULT_SAFE_GET: 'silver:vault:safe-get',
  VAULT_SAFE_REMOVE: 'silver:vault:safe-remove',

  // Vault — auth
  VAULT_BIOMETRIC_AUTH: 'silver:vault:biometric',
  VAULT_HAS_PIN: 'silver:vault:has-pin',
  VAULT_SETUP_PIN: 'silver:vault:setup-pin',
  VAULT_VERIFY_PIN: 'silver:vault:verify-pin',
  VAULT_AUTH: 'silver:vault:auth',  // combined: try biometric, fall back to PIN

  // Extensions
  EXT_LIST: 'silver:ext:list',
  EXT_INSTALL: 'silver:ext:install',
  EXT_REMOVE: 'silver:ext:remove',
  EXT_OPEN_STORE: 'silver:ext:open-store',
  EXT_OPEN_DIR: 'silver:ext:open-dir',
  EXT_MENU: 'silver:ext:menu',

  // Shield (VPN/encrypted browsing)
  SHIELD_TOGGLE: 'silver:shield:toggle',
  SHIELD_STATUS: 'silver:shield:status',
  SHIELD_MENU: 'silver:shield:menu',

  // Brain
  BRAIN_QUERY: 'silver:brain:query',
  BRAIN_REMEMBER: 'silver:brain:remember',
  BRAIN_PROFILE: 'silver:brain:profile',

  // Settings
  SETTINGS_GET: 'silver:settings:get',
  SETTINGS_SET: 'silver:settings:set',

  // UI
  UI_ACCENT_COLOR: 'silver:ui:accent-color',
  UI_OVERLAY: 'silver:ui:overlay',
  UI_SIDEBAR: 'silver:ui:sidebar',
  ACTION_ZOOM_IN: 'silver:action:zoom-in',
  ACTION_ZOOM_OUT: 'silver:action:zoom-out',
  ACTION_ZOOM_RESET: 'silver:action:zoom-reset',
  ACTION_PRINT: 'silver:action:print',
  ACTION_DEVTOOLS: 'silver:action:devtools',
  ACTION_FULLSCREEN: 'silver:action:fullscreen',
  ACTION_NEW_WINDOW: 'silver:action:new-window',
  ACTION_FIND: 'silver:action:find',
  ACTION_READER_MODE: 'silver:action:reader-mode',
  ACTION_PIP: 'silver:action:pip',
  ACTION_SETTINGS_MENU: 'silver:action:settings-menu',
  ACTION_DOWNLOADS_MENU: 'silver:action:downloads-menu',

  // Window
  WINDOW_MINIMIZE: 'silver:window:minimize',
  WINDOW_MAXIMIZE: 'silver:window:maximize',
  WINDOW_CLOSE: 'silver:window:close',
} as const
