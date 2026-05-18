import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const STORAGE_PATH = path.resolve(process.cwd(), "server", "site-engg", "storage.json");

export const storage = {
  read: () => JSON.parse(fs.readFileSync(STORAGE_PATH, "utf-8")),
  write: (data: any) => fs.writeFileSync(STORAGE_PATH, JSON.stringify(data, null, 2)),
  getTable: (tableName: string) => storage.read()[tableName] || [],
  insert: (tableName: string, item: any) => {
    const data = storage.read();
    const newItem = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...item };
    if (!data[tableName]) data[tableName] = [];
    data[tableName].push(newItem);
    storage.write(data);
    return newItem;
  },
  update: (tableName: string, id: string, updates: any) => {
    const data = storage.read();
    const index = data[tableName].findIndex((i: any) => String(i.id) === String(id));
    if (index !== -1) {
      data[tableName][index] = { ...data[tableName][index], ...updates, updatedAt: new Date().toISOString() };
      storage.write(data);
      return data[tableName][index];
    }
    return null;
  },
  delete: (tableName: string, id: string) => {
    const data = storage.read();
    const index = data[tableName].findIndex((i: any) => String(i.id) === String(id));
    if (index !== -1) {
      data[tableName].splice(index, 1);
      storage.write(data);
      return true;
    }
    return false;
  }
};
