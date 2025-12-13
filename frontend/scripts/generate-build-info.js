import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Increment version number for each deployment
const VERSION = '1.3.0'; // Increment this number when making changes - FEATURE: Signature cursor preview and improved positioning - Fixed process.cwd() null handling

// Get git commit hash
let commitHash = 'unknown';

// Skip Git if SKIP_GIT environment variable is set OR if .skip-git file exists
const skipGitEnv = process.env.SKIP_GIT;
let skipGitFile = false;
try {
  const cwd = process.cwd();
  console.log('Current working directory:', cwd);
  if (cwd && typeof cwd === 'string') {
    skipGitFile = existsSync('.skip-git');
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
    // Try from project root first, then from current directory
    let currentDir;
    try {
      currentDir = process.cwd();
      if (!currentDir || typeof currentDir !== 'string' || currentDir.length === 0) {
        console.warn('process.cwd() returned invalid value, skipping Git');
        throw new Error('process.cwd() returned invalid value: ' + String(currentDir));
      }
    } catch (cwdError) {
      console.warn('Could not get current directory, skipping Git:', cwdError.message);
      // Don't proceed with Git operations if we can't get current directory
      throw cwdError;
    }
    
    // Validate currentDir before using it in join()
    if (!currentDir || typeof currentDir !== 'string') {
      throw new Error('currentDir is invalid before join()');
    }
    
    const projectRoot = join(currentDir, '..');
    
    // Validate projectRoot before using it
    if (!projectRoot || typeof projectRoot !== 'string') {
      throw new Error('projectRoot is invalid after join()');
    }
    
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

// Get working directory - use import.meta.url as primary method (more reliable in ES modules)
// Script is in frontend/scripts/generate-build-info.js, so we need to get frontend/ directory
let workingDir;
try {
  // Primary method: use import.meta.url to get script location
  const scriptPath = fileURLToPath(import.meta.url);
  const scriptsDir = dirname(scriptPath); // frontend/scripts/
  workingDir = dirname(scriptsDir); // frontend/
  console.log('Using frontend directory from import.meta.url:', workingDir);
  
  // Validate the path
  if (!workingDir || typeof workingDir !== 'string' || workingDir.length === 0) {
    throw new Error('Invalid workingDir from import.meta.url: ' + String(workingDir));
  }
  
  // Fallback: try process.cwd() if import.meta.url fails
  // (This shouldn't happen, but just in case)
} catch (metaError) {
  console.warn('import.meta.url method failed, trying process.cwd() fallback...', metaError.message);
  try {
    workingDir = process.cwd();
    if (!workingDir || typeof workingDir !== 'string' || workingDir.length === 0) {
      throw new Error('process.cwd() also returned invalid value: ' + String(workingDir));
    }
    console.log('Using frontend directory from process.cwd():', workingDir);
  } catch (cwdError) {
    console.error('FATAL: Both import.meta.url and process.cwd() failed');
    console.error('import.meta.url error:', metaError.message);
    console.error('process.cwd() error:', cwdError.message);
    console.error('This is required to write build-info.json files.');
    process.exit(1);
  }
}

// Build absolute paths based on working directory
// Script is in frontend/scripts/, so paths are relative to frontend/
// Final validation of workingDir before using it
if (!workingDir || typeof workingDir !== 'string' || workingDir.length === 0) {
  console.error('FATAL: workingDir is invalid:', workingDir);
  process.exit(1);
}

const outputPath = join(workingDir, 'src', 'build-info.json');
const distPath = join(workingDir, 'dist', 'build-info.json');
const distDir = join(workingDir, 'dist');

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


