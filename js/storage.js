// storage.js - Dynamic provider switcher
// GitHub PATが設定されていればGitHub版、なければFirebase版を自動使用
//
// 切替え方法:
//   - GitHub: localStorage に github_token があれば自動
//   - Firebase: github_token がなければ自動、または use_firebase=1 で強制

const USE_FIREBASE = localStorage.getItem('use_firebase') === '1' || !localStorage.getItem('github_token');

// Active provider module (loaded dynamically)
let provider;

if (USE_FIREBASE) {
  // Firebase: initialize auth before loading storage
  const { initAuth } = await import('./firebase-auth.js');
  await initAuth();
  provider = await import('./firebase-storage.js');
} else {
  provider = await import('./storage-github.js');
}

// Re-export all storage functions from the active provider
export const getMyUserId = provider.getMyUserId;
export const setMyUserId = provider.setMyUserId;
export const getRepo = provider.getRepo;
export const getFile = provider.getFile;
export const listFiles = provider.listFiles;
export const getFileCached = provider.getFileCached;
export const getListCached = provider.getListCached;
export const listFilesFresh = provider.listFilesFresh;
export const getConfig = provider.getConfig;
export const getDrive = provider.getDrive;
export const getDrivesForMonth = provider.getDrivesForMonth;
export const getDrivesForMonthCached = provider.getDrivesForMonthCached;
export const putFile = provider.putFile;
export const saveDrive = provider.saveDrive;
export const saveConfig = provider.saveConfig;
export const saveDriveSafe = provider.saveDriveSafe;
export const flushPendingQueue = provider.flushPendingQueue;
export const listActiveUserIds = provider.listActiveUserIds;
export const getUserDisplayMap = provider.getUserDisplayMap;
export const getUserRoleMap = provider.getUserRoleMap;
export const getAllUsersDrivesForMonth = provider.getAllUsersDrivesForMonth;
export const getAllUsersDrivesForMonthCached = provider.getAllUsersDrivesForMonthCached;
export const getUserDisplayMapCached = provider.getUserDisplayMapCached;
export const getUserRoleMapCached = provider.getUserRoleMapCached;
export const listActiveUserIdsCached = provider.listActiveUserIdsCached;
export const getConfigCached = provider.getConfigCached;
