#!/usr/bin/env node
/* eslint-env node */
import { execSync } from 'node:child_process';

function getStagedDiff() {
  try {
    const output = execSync('git diff --cached --numstat', { encoding: 'utf8' });
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    console.error('Failed to inspect staged changes.');
    console.error(error);
    process.exit(1);
  }
}

const binaryEntries = getStagedDiff()
  .map((line) => line.split('\t'))
  .filter((parts) => parts.length === 3 && parts[0] === '-' && parts[1] === '-')
  .map(([, , filePath]) => filePath);

if (binaryEntries.length > 0) {
  console.error('\n🚫 Binary files detected in the staged changes:');
  binaryEntries.forEach((filePath) => console.error(`  • ${filePath}`));
  console.error('\nPlease remove these files from the commit or update .gitignore accordingly.');
  process.exit(1);
}
