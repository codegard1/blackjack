// IndexedDB wrapper class
// Source: https://github.com/craigbuckler/asayer-idbstate/blob/main/js/lib/indexeddb.js

export interface IIndexedDB {
  db: IDBDatabase;
  connection: IDBDatabase;
  get: (storeName: string, key: IDBValidKey) => void;
  set: () => void;
}

export class IndexedDB {
  public db!: IDBDatabase;

  // connect to IndexedDB database
  constructor(dbName: string, dbVersion: number, dbUpgrade: (result: IDBDatabase, oldVersion: number, newVersion: number) => void) {

    if (!('indexedDB' in window)) return;

    const dbOpen = indexedDB.open(dbName, dbVersion);

    if (dbUpgrade) {
      // database upgrade event
      dbOpen.onupgradeneeded = (e: IDBVersionChangeEvent) => {
        dbUpgrade(dbOpen.result, e.oldVersion, Number(e.newVersion));
      };
    }

    dbOpen.onsuccess = () => {
      this.db = dbOpen.result;
    };

    dbOpen.onerror = (e: Event) => {
      return;
    };
  }

  // return database connection
  public get connection() {
    return this.db;
  }

  // get named item
  public async get(storeName: string, key: IDBValidKey) {

    try {
      // new transaction
      const
        transaction = this.db.transaction(storeName, 'readonly'),
        store = transaction.objectStore(storeName),

        // read record
        request = await store.get(key);
      if (request) return request.result;

    } catch (error) {
      console.log(error);
    }

  };

  // store item
  public async set(storeName: string, key: IDBValidKey, value: string) {

    try {
      // new transaction
      const
        transaction = this.db.transaction(storeName, 'readwrite'),
        store = transaction.objectStore(storeName);

      // write record
      await store.put(value, key);

      transaction.oncomplete = () => {
        return true;
      };
    } catch (error) {
      console.log(error);
    }
  };

}
