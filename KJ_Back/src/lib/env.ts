import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

let loaded = false;

function stripQuotes(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

export function loadEnv() {
  if (loaded) {
    return;
  }

  loaded = true;

  const envPath = path.resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, 'utf-8').split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = stripQuotes(line.slice(separatorIndex + 1).trim());

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnv();
