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
  if (!import.meta || !import.meta.url) {
    throw new Error('import.meta.url is not available');
  }
  const urlString = import.meta.url;
  if (!urlString || typeof urlString !== 'string') {
    throw new Error('import.meta.url returned invalid value');
  }
  const __filename = fileURLToPath(urlString);
  if (!__filename || typeof __filename !== 'string') {
    throw new Error('fileURLToPath returned invalid value');
  }
  const scriptDir = dirname(__filename); // scripts/
  if (!scriptDir || typeof scriptDir !== 'string') {
    throw new Error('dirname returned invalid value');
  }
  cwd = dirname(scriptDir); // frontend/
  if (!cwd || typeof cwd !== 'string' || cwd.length === 0) {
    throw new Error('Final cwd is invalid');
  }
  console.log('Using directory from import.meta.url:', cwd);
} catch (error) {
  // Fallback: try process.cwd()
  try {
    cwd = process.cwd();
    if (!cwd || typeof cwd !== 'string' || cwd.length === 0) {
      throw new Error('process.cwd() returned invalid value: ' + String(cwd));
    }
    console.log('Using process.cwd():', cwd);
  } catch (cwdError) {
    // Last resort: use absolute path assumption
    console.error('ERROR: Failed to determine working directory');
    console.error('import.meta.url error:', error.message);
    console.error('process.cwd() error:', cwdError.message);
    // Try to use a known path - this script is always in frontend/scripts/
    // So frontend/ is one level up
    try {
      // Use __dirname equivalent from import.meta.url if available
      if (import.meta.url) {
        const url = new URL(import.meta.url);
        const pathParts = url.pathname.split('/').filter(p => p);
        // Remove 'scripts' and 'generate-build-info.js' to get to frontend/
        const frontendIndex = pathParts.lastIndexOf('scripts');
        if (frontendIndex > 0) {
          const frontendParts = pathParts.slice(0, frontendIndex);
          cwd = '/' + frontendParts.join('/');
          console.log('Using calculated path from URL:', cwd);
        } else {
          throw new Error('Could not calculate path from URL');
        }
      } else {
        throw new Error('import.meta.url not available for fallback');
      }
    } catch (calcError) {
      console.error('Path calculation failed:', calcError.message);
      // Absolute last resort - this will likely fail but at least we tried
      cwd = process.env.PWD || process.env.INIT_CWD || '.';
      console.warn('Using environment variable fallback:', cwd);
    }
  }
}

// Final validation
if (!cwd || typeof cwd !== 'string' || cwd.length === 0) {
  console.error('FATAL: Could not determine working directory. All methods failed.');
  console.error('cwd value:', cwd);
  process.exit(1);
}

// Validate paths before using join
const srcPath = 'src';
const distPathName = 'dist';
const buildInfoFileName = 'build-info.json';

if (!srcPath || !distPathName || !buildInfoFileName) {
  console.error('FATAL: Path components are invalid');
  process.exit(1);
}

const outputPath = join(cwd, srcPath, buildInfoFileName);
const distPath = join(cwd, distPathName, buildInfoFileName);
const distDir = join(cwd, distPathName);

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


