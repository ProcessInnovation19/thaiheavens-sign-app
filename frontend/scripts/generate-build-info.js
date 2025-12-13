import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Increment version number for each deployment
const VERSION = '1.3.0'; // Increment this number when making changes - FEATURE: Signature cursor preview and improved positioning - Fixed process.cwd() null handling

// Get git commit hash
let commitHash = 'unknown';

// Get frontend directory from script location (more reliable than process.cwd())
// Script is in frontend/scripts/generate-build-info.js
const scriptPath = fileURLToPath(import.meta.url);
const scriptsDir = dirname(scriptPath); // frontend/scripts/
const frontendDir = dirname(scriptsDir); // frontend/
console.log('Script path:', scriptPath);
console.log('Scripts directory:', scriptsDir);
console.log('Frontend directory:', frontendDir);

// Skip Git if SKIP_GIT environment variable is set OR if .skip-git file exists
const skipGitEnv = process.env.SKIP_GIT;
let skipGitFile = false;
try {
  const skipGitPath = join(frontendDir, '.skip-git');
  skipGitFile = existsSync(skipGitPath);
  if (skipGitFile) {
    console.log('Found .skip-git file at:', skipGitPath);
  }
} catch (e) {
  console.warn('Could not check for .skip-git file:', e.message);
}
console.log('SKIP_GIT environment variable:', skipGitEnv);
console.log('.skip-git file exists:', skipGitFile);
if (skipGitFile) {
  console.log('Found .skip-git file, will skip Git operations');
}
const skipGit = skipGitFile || skipGitEnv === 'true' || skipGitEnv === '1' || skipGitEnv === 'TRUE';
console.log('Final skipGit value:', skipGit);

if (skipGit) {
  console.log('Skipping Git operations (SKIP_GIT is set to:', skipGitEnv, 'or .skip-git file exists)');
  // Don't try to get commit hash at all
} else {
  console.log('Attempting to get Git commit hash...');
  try {
    // Try to get commit hash, but don't fail if Git is not available or corrupted
    // Use frontendDir to find project root (go up one level)
    const projectRoot = dirname(frontendDir); // Should be the project root
    
    // Validate projectRoot before using it
    if (!projectRoot || typeof projectRoot !== 'string' || projectRoot.length === 0) {
      throw new Error('projectRoot is invalid: ' + String(projectRoot));
    }
    
    console.log('Trying to get Git commit hash from project root:', projectRoot);
    let result = null;
    
    try {
      result = execSync('git rev-parse --short HEAD', { 
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'], // Ignore stderr
        cwd: projectRoot,
        maxBuffer: 1024 * 1024, // 1MB buffer
      });
    } catch (e) {
      // Try from frontend directory as fallback
      console.log('Git failed from project root, trying frontend directory...');
      try {
        result = execSync('git rev-parse --short HEAD', { 
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore'],
          cwd: frontendDir,
          maxBuffer: 1024 * 1024,
        });
      } catch (e2) {
        // Git not available or repository corrupted - silently fail
        console.log('Git failed from frontend directory too, using "unknown"');
        result = null;
      }
    }
    
    if (result && typeof result === 'string' && result.trim()) {
      commitHash = result.trim();
      console.log('Git commit hash obtained:', commitHash);
    } else {
      console.log('Git commit hash not available, using "unknown"');
    }
  } catch (error) {
    // Git not available or repository corrupted - use 'unknown'
    // Don't throw, just use default
    console.warn('Could not get git commit hash, using "unknown":', error.message);
  }
}

const buildTimestamp = Date.now().toString();
const buildInfo = {
  version: VERSION,
  timestamp: buildTimestamp,
  date: new Date().toISOString(),
  commit: commitHash,
};

// Use frontendDir that we already calculated above
// Validate it
if (!frontendDir || typeof frontendDir !== 'string' || frontendDir.length === 0) {
  console.error('FATAL: frontendDir is invalid:', frontendDir);
  process.exit(1);
}

// Build absolute paths based on frontend directory
const outputPath = join(frontendDir, 'src', 'build-info.json');
const distPath = join(frontendDir, 'dist', 'build-info.json');
const distDir = join(frontendDir, 'dist');

console.log('Working directory:', workingDir);
console.log('Writing build-info.json to:', outputPath);
try {
  writeFileSync(outputPath, JSON.stringify(buildInfo, null, 2));
  console.log('✓ Successfully wrote', outputPath);
} catch (writeError) {
  console.error('ERROR writing', outputPath, ':', writeError.message);
  throw writeError;
}

// Also write to dist for API access
console.log('Writing build-info.json to dist:', distPath);
// Create dist directory if it doesn't exist
if (!existsSync(distDir)) {
  console.log('Creating dist directory:', distDir);
  try {
    mkdirSync(distDir, { recursive: true });
    console.log('✓ Successfully created', distDir);
  } catch (mkdirError) {
    console.error('ERROR creating', distDir, ':', mkdirError.message);
    throw mkdirError;
  }
}
try {
  writeFileSync(distPath, JSON.stringify(buildInfo, null, 2));
  console.log('✓ Successfully wrote', distPath);
} catch (writeError) {
  console.error('ERROR writing', distPath, ':', writeError.message);
  throw writeError;
}

console.log('Build info generated:', buildInfo);


