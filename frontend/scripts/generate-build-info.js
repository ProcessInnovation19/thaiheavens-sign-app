import { writeFileSync } from 'fs';
import { join } from 'path';

const buildTimestamp = Date.now().toString();
const buildInfo = {
  timestamp: buildTimestamp,
  date: new Date().toISOString(),
};

const outputPath = join(process.cwd(), 'src', 'build-info.json');
writeFileSync(outputPath, JSON.stringify(buildInfo, null, 2));

console.log('Build info generated:', buildInfo);


