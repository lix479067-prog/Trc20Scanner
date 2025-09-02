import type { WalletInfo } from "@shared/schema";

export interface IStorage {
  // Storage interface for any future data persistence needs
  // Currently using external APIs only
}

export class MemStorage implements IStorage {
  constructor() {
    // Empty constructor as we're using external TRON APIs
  }
}

export const storage = new MemStorage();
