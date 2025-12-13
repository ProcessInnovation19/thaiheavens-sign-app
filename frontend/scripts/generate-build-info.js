import { writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

// Increment version number for each deployment
const VERSION = '1.3.0'; // Increment this number when making changes - FEATURE: Signature cursor preview and improved positioning

// Get git commit hash
let commitHash = 'unknown';
try {
  commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
} catch (error) {
  console.warn('Could not get git commit hash:', error.message);
}

const buildTimestamp = Date.now().toString();
const buildInfo = {
  version: VERSION,
  timestamp: buildTimestamp,
  date: new Date().toISOString(),
  commit: commitHash,
};

const outputPath = join(process.cwd(), 'src', 'build-info.json');
writeFileSync(outputPath, JSON.stringify(buildInfo, null, 2));

// Also write to dist for API access
const distPath = join(process.cwd(), 'dist', 'build-info.json');
writeFileSync(distPath, JSON.stringify(buildInfo, null, 2));

console.log('Build info generated:', buildInfo);


