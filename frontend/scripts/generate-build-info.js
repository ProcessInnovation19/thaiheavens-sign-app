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

// Get working directory - use import.meta.url as primary method since it's more reliable
let cwd;
try {
  // Primary: use import.meta.url to get script location, then go up to frontend/
  const __filename = fileURLToPath(import.meta.url);
  const scriptDir = dirname(__filename); // scripts/
  cwd = dirname(scriptDir); // frontend/
  console.log('Using directory from import.meta.url:', cwd);
} catch (error) {
  // Fallback: try process.cwd()
  try {
    cwd = process.cwd();
    if (!cwd || typeof cwd !== 'string' || cwd.length === 0) {
      throw new Error('process.cwd() returned invalid value');
    }
    console.log('Using process.cwd():', cwd);
  } catch (cwdError) {
    // Last resort: assume we're in frontend directory
    console.error('ERROR: Failed to determine working directory');
    console.error('import.meta.url error:', error.message);
    console.error('process.cwd() error:', cwdError.message);
    cwd = '.'; // Last resort
    console.warn('Using current directory as last resort');
  }
}

const outputPath = join(cwd, 'src', 'build-info.json');
writeFileSync(outputPath, JSON.stringify(buildInfo, null, 2));

// Also write to dist for API access
const distPath = join(cwd, 'dist', 'build-info.json');
// Create dist directory if it doesn't exist
const distDir = join(cwd, 'dist');
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}
writeFileSync(distPath, JSON.stringify(buildInfo, null, 2));

console.log('Build info generated:', buildInfo);


