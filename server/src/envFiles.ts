import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'dotenv';

function setMissingEnvironmentValues(envFilePath: string) {
  if (!existsSync(envFilePath)) return;

  const values = parse(readFileSync(envFilePath));
  for (const [key, value] of Object.entries(values)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function loadEnvFiles() {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const serverRoot = resolve(currentDir, '..');
  const projectRoot = resolve(serverRoot, '..');

  setMissingEnvironmentValues(resolve(projectRoot, '.env'));
  setMissingEnvironmentValues(resolve(serverRoot, '.env'));
}
