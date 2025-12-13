import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Increment version number for each deployment
const VERSION = '1.3.0'; // Increment this number when making changes - FEATURE: Signature cursor preview and improved positioning

// Get git commit hash
let commitHash = 'unknown';

// Skip Git if SKIP_GIT environment variable is set
const skipGit = process.env.SKIP_GIT === 'true' || process.env.SKIP_GIT === '1';
if (skipGit) {
  console.log('Skipping Git operations (SKIP_GIT is set)');
} else {
  try {
    // Try to get commit hash, but don't fail if Git is not available or corrupted
    // Try from project root first, then from current directory
    const currentDir = process.cwd();
    if (!currentDir) {
      throw new Error('process.cwd() returned null');
    }
    const projectRoot = join(currentDir, '..');
    let result = null;
    
    try {
      result = execSync('git rev-parse --short HEAD', { 
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'], // Ignore stderr
        cwd: projectRoot,
        maxBuffer: 1024 * 1024, // 1MB buffer
      });
    } catch (e) {
      // Try from current directory
      try {
        result = execSync('git rev-parse --short HEAD', { 
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore'],
          cwd: currentDir,
          maxBuffer: 1024 * 1024,
        });
      } catch (e2) {
        // Git not available or repository corrupted - silently fail
        result = null;
      }
    }
    
    if (result && typeof result === 'string' && result.trim()) {
      commitHash = result.trim();
    }
  } catch (error) {
    // Git not available or repository corrupted - use 'unknown'
    // Don't throw, just use default
    console.warn('Could not get git commit hash, using "unknown"');
  }
}

const buildTimestamp = Date.now().toString();
const buildInfo = {
  version: VERSION,
  timestamp: buildTimestamp,
  date: new Date().toISOString(),
  commit: commitHash,
};

// Use relative paths - when npm runs this script, working directory is frontend/
// So we can use simple relative paths
const outputPath = 'src/build-info.json';
const distPath = 'dist/build-info.json';
const distDir = 'dist';

console.log('Writing build-info.json to:', outputPath);
writeFileSync(outputPath, JSON.stringify(buildInfo, null, 2));

// Also write to dist for API access
console.log('Writing build-info.json to dist:', distPath);
// Create dist directory if it doesn't exist
if (!existsSync(distDir)) {
  console.log('Creating dist directory:', distDir);
  mkdirSync(distDir, { recursive: true });
}
writeFileSync(distPath, JSON.stringify(buildInfo, null, 2));

console.log('Build info generated:', buildInfo);


