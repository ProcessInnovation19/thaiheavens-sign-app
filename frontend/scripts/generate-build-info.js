import { writeFileSync } from 'fs';
import { join } from 'path';

// Increment version number for each deployment
const VERSION = '1.2.5'; // Increment this number when making changes - FIX: Fullscreen timing and version display

const buildTimestamp = Date.now().toString();
const buildInfo = {
  version: VERSION,
  timestamp: buildTimestamp,
  date: new Date().toISOString(),
};

const outputPath = join(process.cwd(), 'src', 'build-info.json');
writeFileSync(outputPath, JSON.stringify(buildInfo, null, 2));

console.log('Build info generated:', buildInfo);


