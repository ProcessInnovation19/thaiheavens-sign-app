import { writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

// Increment version number for each deployment
const VERSION = '1.3.0'; // Increment this number when making changes - FEATURE: Signature cursor preview and improved positioning

// Get git commit hash
let commitHash = 'unknown';

// Skip Git if SKIP_GIT environment variable is set
if (!process.env.SKIP_GIT) {
  try {
    // Try to get commit hash, but don't fail if Git is not available or corrupted
    // Try from project root first, then from current directory
    const projectRoot = join(process.cwd(), '..');
    let result = null;
    
    try {
      result = execSync('git rev-parse --short HEAD', { 
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'], // Ignore stderr
        cwd: projectRoot,
      });
    } catch (e) {
      // Try from current directory
      try {
        result = execSync('git rev-parse --short HEAD', { 
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore'],
          cwd: process.cwd(),
        });
      } catch (e2) {
        // Git not available or repository corrupted
        result = null;
      }
    }
    
    if (result && result.trim()) {
      commitHash = result.trim();
    }
  } catch (error) {
    // Git not available or repository corrupted - use 'unknown'
    console.warn('Could not get git commit hash, using "unknown"');
  }
} else {
  console.log('Skipping Git operations (SKIP_GIT is set)');
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


