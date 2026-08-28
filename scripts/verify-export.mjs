import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/laravel-export.json'), 'utf8'));
const expected = { socialLinks: 2, skills: 7, education: 2, experiences: 3, projects: 34 };
const problems = [];

if (!data.profile?.name) problems.push('Profile is missing');
Object.entries(expected).forEach(([key, count]) => {
  if (data[key]?.length !== count) problems.push(`${key}: expected ${count}, received ${data[key]?.length ?? 0}`);
});

for (const key of Object.keys(expected)) {
  const ids = data[key].map((item) => item.legacyId);
  if (new Set(ids).size !== ids.length) problems.push(`${key} contains duplicate legacy IDs`);
}
data.experiences.forEach((experience) => {
  const bulletCount = String(experience.description || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean).length;
  if (bulletCount < 5 || bulletCount > 6) {
    problems.push(`Experience ${experience.legacyId} must contain 5–6 CV description bullets; received ${bulletCount}`);
  }
});

const experienceIds = new Set(data.experiences.map((item) => item.legacyId));
data.projects.forEach((project) => {
  if (!experienceIds.has(project.experienceLegacyId)) problems.push(`Project ${project.legacyId} has no experience`);
});

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('Laravel export verified:', { profile: 1, ...expected });
