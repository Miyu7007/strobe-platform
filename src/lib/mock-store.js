// 服务端 Mock 数据存储 - 单例，使用 globalThis 在多次请求间保持
// 仅在 NEXT_PUBLIC_DEMO_MODE=true 时启用

const STORE_KEY = '__STROBE_DEMO_STORE__';

function createStore() {
  return {
    // 用户（密码以明文存储，仅用于本地 demo）
    users: new Map(),
    // profiles (id -> {id, username, points, created_at})
    profiles: new Map(),
    // works (id -> {...})
    works: new Map(),
    // point_transactions
    pointTransactions: new Map(),
    // 登录会话 token -> userId
    sessions: new Map(),
    // 上传的文件 path -> {data: Buffer, contentType}
    files: new Map(),
  };
}

function getStore() {
  if (!globalThis[STORE_KEY]) {
    globalThis[STORE_KEY] = createStore();
  }
  return globalThis[STORE_KEY];
}

// ====== 工具 ======
function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function generateToken() {
  return 'demo_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ====== 用户 ======
export function createUser({ email, password, username }) {
  const store = getStore();

  // 检查邮箱是否已注册
  for (const u of store.users.values()) {
    if (u.email === email) {
      return { error: '该邮箱已被注册' };
    }
  }

  const userId = generateId();
  const user = {
    id: userId,
    email,
    password, // 明文，仅 demo
    created_at: new Date().toISOString(),
  };
  store.users.set(userId, user);

  // 自动创建 profile
  store.profiles.set(userId, {
    id: userId,
    username: username || email.split('@')[0],
    points: 100, // 注册奖励
    created_at: new Date().toISOString(),
  });

  // 记录注册奖励
  const txId = generateId();
  store.pointTransactions.set(txId, {
    id: txId,
    user_id: userId,
    amount: 100,
    type: 'register_bonus',
    description: '注册奖励',
    work_id: null,
    created_at: new Date().toISOString(),
  });

  return { user, profile: store.profiles.get(userId) };
}

export function verifyLogin({ email, password }) {
  const store = getStore();
  for (const u of store.users.values()) {
    if (u.email === email && u.password === password) {
      return u;
    }
  }
  return null;
}

export function createSession(userId) {
  const store = getStore();
  const token = generateToken();
  store.sessions.set(token, {
    user_id: userId,
    created_at: new Date().toISOString(),
  });
  return token;
}

export function destroySession(token) {
  const store = getStore();
  store.sessions.delete(token);
}

export function getUserByToken(token) {
  const store = getStore();
  const session = store.sessions.get(token);
  if (!session) return null;
  return store.users.get(session.user_id);
}

// ====== Profiles ======
export function getProfile(userId) {
  const store = getStore();
  return store.profiles.get(userId);
}

export function updateProfile(userId, data) {
  const store = getStore();
  const profile = store.profiles.get(userId);
  if (!profile) return null;
  const updated = { ...profile, ...data };
  store.profiles.set(userId, updated);
  return updated;
}

// ====== Works ======
export function listWorks({ orderBy = 'created_at', ascending = false, limit = null, from = null, to = null, filters = [] } = {}) {
  const store = getStore();
  let arr = Array.from(store.works.values());

  // 应用 filters
  for (const f of filters) {
    if (f.op === 'eq') {
      arr = arr.filter(w => w[f.col] === f.val);
    } else if (f.op === 'ilike') {
      const pattern = f.val.replace(/%/g, '').toLowerCase();
      arr = arr.filter(w => String(w[f.col] || '').toLowerCase().includes(pattern));
    }
  }

  // 排序
  arr.sort((a, b) => {
    const va = a[orderBy] || '';
    const vb = b[orderBy] || '';
    if (va < vb) return ascending ? -1 : 1;
    if (va > vb) return ascending ? 1 : -1;
    return 0;
  });

  // 分页
  if (from !== null && to !== null) {
    arr = arr.slice(from, to + 1);
  } else if (limit !== null) {
    arr = arr.slice(0, limit);
  }

  // 嵌套 profile 信息（模拟外键 join）
  const result = arr.map(w => {
    const profile = store.profiles.get(w.user_id);
    return {
      ...w,
      profiles: profile ? { username: profile.username, points: profile.points } : null,
    };
  });

  return result;
}

export function getWork(workId) {
  const store = getStore();
  const work = store.works.get(workId);
  if (!work) return null;
  const profile = store.profiles.get(work.user_id);
  return {
    ...work,
    profiles: profile ? { username: profile.username, points: profile.points } : null,
  };
}

export function createWork({ user_id, title, description, image_path, project_file_path, thumbnail_url, mode, frame_count }) {
  const store = getStore();
  const workId = generateId();
  const work = {
    id: workId,
    user_id,
    title,
    description: description || null,
    image_path,
    project_file_path: project_file_path || null,
    thumbnail_url,
    mode: mode || 'auto',
    frame_count: frame_count || 0,
    download_count: 0,
    created_at: new Date().toISOString(),
  };
  store.works.set(workId, work);
  return work;
}

export function updateWork(workId, data) {
  const store = getStore();
  const work = store.works.get(workId);
  if (!work) return null;
  const updated = { ...work, ...data };
  store.works.set(workId, updated);
  return updated;
}

// ====== Point Transactions ======
export function listTransactions(userId) {
  const store = getStore();
  const arr = Array.from(store.pointTransactions.values())
    .filter(tx => tx.user_id === userId)
    .sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
  return arr;
}

export function createTransaction({ user_id, amount, type, work_id = null, description = '' }) {
  const store = getStore();
  const txId = generateId();
  const tx = {
    id: txId,
    user_id,
    amount,
    type,
    work_id,
    description,
    created_at: new Date().toISOString(),
  };
  store.pointTransactions.set(txId, tx);
  return tx;
}

// ====== Files ======
export function saveFile(path, data, contentType) {
  const store = getStore();
  store.files.set(path, { data, contentType, created_at: new Date().toISOString() });
}

export function getFile(path) {
  const store = getStore();
  return store.files.get(path);
}

export function removeFile(path) {
  const store = getStore();
  store.files.delete(path);
}

// 导出获取 store 的方法（用于调试）
export { getStore };