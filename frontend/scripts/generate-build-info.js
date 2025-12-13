import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Increment version number for each deployment
const VERSION = '1.3.0'; // Increment this number when making changes - FEATURE: Signature cursor preview and improved positioning - Fixed process.cwd() null handling

// Get git commit hash
let commitHash = 'unknown';

// When npm runs "npm run prebuild", the working directory is always frontend/
// So we can use simple relative paths - no need to determine frontendDir
// This is the most reliable approach
console.log('Script execution context:');
console.log('  import.meta.url:', import.meta?.url || 'undefined');
try {
  console.log('  process.cwd():', process.cwd() || 'null/undefined');
} catch (e) {
  console.log('  process.cwd(): ERROR -', e.message);
}

// Use relative paths - npm always runs from frontend/ directory
// These paths are relative to the current working directory (frontend/)
const outputPath = 'src/build-info.json';
const distPath = 'dist/build-info.json';
const distDir = 'dist';

console.log('Using relative paths (assuming working directory is frontend/):');
console.log('  outputPath:', outputPath);
console.log('  distPath:', distPath);
console.log('  distDir:', distDir);

// Skip Git if SKIP_GIT environment variable is set OR if .skip-git file exists
const skipGitEnv = process.env.SKIP_GIT;
let skipGitFile = false;
try {
  skipGitFile = existsSync('.skip-git');
  if (skipGitFile) {
    console.log('Found .skip-git file in current directory');
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
    // Try to get Git commit hash from project root (one level up from frontend/)
    // First try from current directory (frontend/), then from parent (project root)
    let result = null;
    
    try {
      // Try from current directory first (in case we're in a monorepo)
      result = execSync('git rev-parse --short HEAD', { 
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'], // Ignore stderr
        maxBuffer: 1024 * 1024, // 1MB buffer
      });
    } catch (e) {
      // Try from project root (one level up)
      try {
        result = execSync('git rev-parse --short HEAD', { 
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore'],
          cwd: '..',
          maxBuffer: 1024 * 1024,
        });
      } catch (e2) {
        // Git not available or repository corrupted - silently fail
        console.log('Git failed from both current and parent directory, using "unknown"');
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

// Paths are already defined above as relative paths
// No need for additional validation - they're just strings

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


