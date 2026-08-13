// 客户端 Mock Supabase - 完全用 fetch 与 /api/demo 通信
// 提供与 @supabase/supabase-js 兼容的 API 子集

const TOKEN_KEY = 'demo_access_token';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

class MockQueryBuilder {
  constructor(table) {
    this.table = table;
    this.method = null;       // 'select' | 'insert' | 'update' | 'delete'
    this.selectFields = '*';
    this.filters = [];        // [{col, op, val}]
    this.orderBy = null;      // {col, ascending}
    this.limitN = null;
    this.rangeFrom = null;
    this.rangeTo = null;
    this.singleMode = false;
    this.insertData = null;
    this.updateData = null;
  }

  select(fields) {
    if (!this.method) this.method = 'select';
    this.selectFields = fields;
    return this;
  }

  eq(col, val) {
    this.filters.push({ col, op: 'eq', val: String(val) });
    return this;
  }

  ilike(col, pattern) {
    this.filters.push({ col, op: 'ilike', val: pattern });
    return this;
  }

  order(col, opts = {}) {
    this.orderBy = { col, ascending: opts.ascending !== false };
    return this;
  }

  limit(n) {
    this.limitN = n;
    return this;
  }

  range(from, to) {
    this.rangeFrom = from;
    this.rangeTo = to;
    return this;
  }

  single() {
    this.singleMode = true;
    return this;
  }

  insert(data) {
    this.method = 'insert';
    this.insertData = data;
    return this;
  }

  update(data) {
    this.method = 'update';
    this.updateData = data;
    return this;
  }

  // 让 builder 可 await
  then(resolve, reject) {
    return this._execute().then(resolve, reject);
  }
  catch(reject) {
    return this.then(undefined, reject);
  }

  async _execute() {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    if (this.method === 'insert') {
      // POST /api/demo/data/{table}
      const res = await fetch(`/api/demo/data/${this.table}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ data: this.insertData, single: this.singleMode }),
      });
      const json = await res.json();
      if (!res.ok) return { data: null, error: json };
      return { data: json.data, error: null };
    }

    if (this.method === 'update') {
      // PATCH /api/demo/data/{table}/{id}
      const idFilter = this.filters.find(f => f.col === 'id');
      const id = idFilter?.val;
      const res = await fetch(`/api/demo/data/${this.table}${id ? '/' + id : ''}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ data: this.updateData }),
      });
      const json = await res.json();
      if (!res.ok) return { data: null, error: json };
      return { data: json.data, error: null };
    }

    // SELECT
    const params = new URLSearchParams();
    params.set('fields', this.selectFields || '*');
    if (this.orderBy) {
      params.set('order', this.orderBy.col);
      params.set('asc', this.orderBy.ascending ? 'true' : 'false');
    }
    if (this.limitN !== null) params.set('limit', this.limitN);
    if (this.rangeFrom !== null) {
      params.set('from', this.rangeFrom);
      params.set('to', this.rangeTo !== null ? this.rangeTo : this.rangeFrom + this.limitN - 1);
    }
    this.filters.forEach((f, i) => {
      params.set(`f${i}_col`, f.col);
      params.set(`f${i}_op`, f.op);
      params.set(`f${i}_val`, f.val);
    });

    // 路径可能含 id
    let url = `/api/demo/data/${this.table}`;
    const idFilter = this.filters.find(f => f.col === 'id');
    if (idFilter) url += '/' + idFilter.val;

    const res = await fetch(`${url}?${params.toString()}`, { headers });
    const json = await res.json();

    if (!res.ok) {
      return { data: null, error: json };
    }

    let data = json.data;
    if (this.singleMode) {
      if (Array.isArray(data)) data = data[0] || null;
      if (!data) return { data: null, error: { message: 'Not found' } };
    }

    return { data, error: null };
  }
}

class MockStorageBucket {
  constructor(name) {
    this.name = name;
  }

  async upload(path, file) {
    const token = getToken();
    if (!token) return { data: null, error: { message: '未登录' } };

    const formData = new FormData();
    formData.append('path', path);
    formData.append('file', file);

    const res = await fetch('/api/demo/storage/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const json = await res.json();
    if (!res.ok) return { data: null, error: json };
    return { data: { path: json.data.path }, error: null };
  }

  getPublicUrl(path) {
    return { data: { publicUrl: `/api/demo-file/${path}` } };
  }

  async createSignedUrl(path, expiresIn = 3600) {
    return { data: { signedUrl: `/api/demo-file/${path}` }, error: null };
  }

  async remove(paths) {
    return { data: [], error: null };
  }
}

class MockAuth {
  constructor() {
    this._listeners = new Set();
  }

  _notify(event, session) {
    for (const cb of this._listeners) {
      try { cb(event, session); } catch (e) {}
    }
  }

  async signUp({ email, password, options }) {
    const username = options?.data?.username || email.split('@')[0];
    const res = await fetch('/api/demo/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, username }),
    });
    const json = await res.json();
    if (!res.ok) return { data: { user: null, session: null }, error: json };

    const session = json.data.session;
    setToken(session.access_token);
    this._notify('SIGNED_IN', session);
    return { data: { user: json.data.user, session }, error: null };
  }

  async signInWithPassword({ email, password }) {
    const res = await fetch('/api/demo/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!res.ok) return { data: { user: null, session: null }, error: json };

    const session = json.data.session;
    setToken(session.access_token);
    this._notify('SIGNED_IN', session);
    return { data: { user: json.data.user, session }, error: null };
  }

  async signOut() {
    const token = getToken();
    if (token) {
      await fetch('/api/demo/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
    }
    setToken(null);
    this._notify('SIGNED_OUT', null);
    return { error: null };
  }

  async getSession() {
    const token = getToken();
    if (!token) return { data: { session: null }, error: null };

    const res = await fetch('/api/demo/auth/session', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    return { data: { session: json.data?.session || null }, error: null };
  }

  async getUser(token) {
    const t = token || getToken();
    if (!t) return { data: { user: null }, error: null };
    const res = await fetch('/api/demo/auth/session', {
      headers: { Authorization: `Bearer ${t}` },
    });
    const json = await res.json();
    return { data: { user: json.data?.session?.user || null }, error: null };
  }

  onAuthStateChange(callback) {
    this._listeners.add(callback);
    return {
      data: {
        subscription: {
          unsubscribe: () => this._listeners.delete(callback),
        },
      },
    };
  }
}

class MockSupabaseClient {
  constructor() {
    this.auth = new MockAuth();
    this._storageCache = {};
  }

  from(table) {
    return new MockQueryBuilder(table);
  }

  storage = {
    from: (bucket) => {
      if (!this._storageCache[bucket]) {
        this._storageCache[bucket] = new MockStorageBucket(bucket);
      }
      return this._storageCache[bucket];
    },
  };

  async rpc(name, params) {
    return { data: null, error: null };
  }
}

let _instance = null;
export function getMockSupabase() {
  if (!_instance) _instance = new MockSupabaseClient();
  return _instance;
}