// 記録をブラウザ内のIndexedDBへ保存する。サーバーには何も送らない。
import { emptyData, normalizeData } from './logic.js';

const DB_NAME = 'musclelog';
const STORE = 'kv';
const KEY = 'appdata';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function run(db, mode, action) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = action(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export function createStore({ onError }) {
  let db = null;
  let timer = null;
  const store = {
    data: emptyData(),
    /** 保存先を使えないとき true。画面に警告を出す。 */
    unavailable: false,
    /** 読めなかった元のデータを別のキーへ退避したとき true */
    recovered: false,

    async load() {
      try {
        db = await openDb();
      } catch {
        store.unavailable = true;
        return;
      }
      const raw = await run(db, 'readonly', (s) => s.get(KEY));
      if (raw === undefined) return;
      try {
        store.data = normalizeData(JSON.parse(raw));
      } catch {
        // 上書きで記録を失わないよう、読めなかった内容は残しておく
        await run(db, 'readwrite', (s) => s.put(raw, `${KEY}-unreadable-${Date.now()}`));
        store.recovered = true;
      }
    },

    /** 入力のたびに書き込まないよう、少し待ってから保存する */
    save() {
      clearTimeout(timer);
      timer = setTimeout(store.flush, 300);
    },

    async flush() {
      clearTimeout(timer);
      timer = null;
      if (!db) return;
      try {
        await run(db, 'readwrite', (s) => s.put(JSON.stringify(store.data), KEY));
      } catch (error) {
        onError(error);
      }
    },

    /** ブラウザの判断でデータが消されにくくなるよう依頼する */
    async requestPersistence() {
      try {
        return (await navigator.storage?.persist?.()) ?? false;
      } catch {
        return false;
      }
    },
  };
  return store;
}
