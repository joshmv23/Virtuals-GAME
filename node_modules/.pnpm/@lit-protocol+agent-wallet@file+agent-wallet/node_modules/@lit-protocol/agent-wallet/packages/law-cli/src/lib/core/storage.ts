import { LocalStorage as NodeLocalStorage } from 'node-localstorage';

export enum StorageKeys {
  LIT_NETWORK = 'litNetwork',
  RPCS = 'rpcs',
  ADMIN_SIGNER_TYPE = 'adminSignerType',
  ADMIN_STORAGE = 'adminStorage',
  ADMIN_ACTIVE_ADDRESS = 'adminActiveAddress',
  DELEGATEE_STORAGE = 'delegateeStorage',
  DELEGATEE_ACTIVE_ADDRESS = 'delegateeActiveAddress',
  DELEGATEE_SIGNER_TYPE = 'delegateeSignerType',
}

export class LocalStorage {
  private storage: NodeLocalStorage;

  constructor(storageFilePath: string) {
    this.storage = new NodeLocalStorage(storageFilePath);
  }

  getItem(key: string): string | null {
    return this.storage.getItem(key);
  }

  setItem(key: string, value: string): void {
    this.storage.setItem(key, value);
  }

  removeItem(key: string): void {
    this.storage.removeItem(key);
  }

  clear(): void {
    this.storage.clear();
  }
}
