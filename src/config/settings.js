import fs from 'fs';
import path from 'path';

const DEFAULT_SETTINGS_PATH = process.env.SETTINGS_FILE || path.resolve(process.cwd(), 'config', 'settings.json');

function ensureFolderExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readRaw() {
  try {
    const raw = fs.readFileSync(DEFAULT_SETTINGS_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    // If the file doesn't exist or is invalid, start fresh
    return {};
  }
}

function writeRaw(data) {
  ensureFolderExists(DEFAULT_SETTINGS_PATH);
  fs.writeFileSync(DEFAULT_SETTINGS_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export function getAll() {
  return readRaw();
}

export function get(key) {
  const all = readRaw();
  return all[key];
}

export function set(key, value) {
  const all = readRaw();
  all[key] = value;
  writeRaw(all);
  return all[key];
}

export function remove(key) {
  const all = readRaw();
  if (Object.prototype.hasOwnProperty.call(all, key)) {
    delete all[key];
    writeRaw(all);
    return true;
  }
  return false;
}
