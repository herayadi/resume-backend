import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultDatabase = path.resolve(__dirname, '../../../source-laravel/database/database.sqlite');
const sourceDatabase = process.env.LARAVEL_SQLITE_PATH
  ? path.resolve(process.env.LARAVEL_SQLITE_PATH)
  : defaultDatabase;
const outputPath = path.resolve(__dirname, '../data/laravel-export.json');

if (!fs.existsSync(sourceDatabase)) {
  throw new Error(`Laravel SQLite database not found: ${sourceDatabase}`);
}

const db = new DatabaseSync(sourceDatabase, { readOnly: true });
const rows = (table) => db.prepare(`SELECT * FROM ${table} ORDER BY id ASC`).all();
const normalize = (value) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : value;

const user = rows('users')[0];
if (!user) throw new Error('The Laravel database does not contain a profile');
const socialLinks = rows('social_media');
const primaryEmail = socialLinks.find((item) => normalize(item.type).toLowerCase() === 'email');

const exportData = {
  profile: {
    legacyId: user.id,
    name: normalize(user.name),
    role: normalize(user.role),
    phone: normalize(user.phoneNum),
    email: primaryEmail ? normalize(primaryEmail.href) : null,
    dateOfBirth: normalize(user.dob),
    website: normalize(user.website),
    city: normalize(user.city),
    summaryEn: normalize(user.summary),
    summaryId: null,
    bioEn: 'I am a dedicated Structural Drafter with over nine years of experience in the architecture, engineering, and construction industry. I leverage Revit, AutoCAD, and point-cloud data to deliver precise, efficient, and code-compliant structural models and drawings. I work across commercial, industrial, and infrastructure projects while reporting directly to BIM leadership.',
    bioId: null,
    aboutIntro: 'An Experienced Structural Drafter delivering high-precision structural design solutions',
    resumeIntro: 'Results-oriented Structural Drafter skilled in translating complex engineering requirements into buildable Revit and AutoCAD designs, backed by advanced Point Cloud integration. Adept at maintaining compliance with industry standards, optimizing workflows, and supporting multidisciplinary teams on both local and international assignments.',
    footerTagline: 'An Experienced Structural Drafter delivering high-precision structural design solutions',
    avatarUrl: 'assets/img/regina-profile-img.jpg',
    cvUrl: 'assets/resume/Regina-Resume.pdf',
  },
  socialLinks: socialLinks.map((item, index) => ({
    legacyId: item.id,
    type: normalize(item.type),
    label: normalize(item.label),
    href: normalize(item.href),
    icon: normalize(item.icon),
    sortOrder: index + 1,
  })),
  skills: rows('skills').map((item, index) => ({
    legacyId: item.id,
    name: normalize(item.skill),
    percentage: Number(item.percentage),
    category: null,
    sortOrder: index + 1,
  })),
  education: rows('educations').map((item, index) => ({
    legacyId: item.id,
    degree: normalize(item.degree),
    shortDegree: normalize(item.degree).split(' ')[0],
    school: normalize(item.school),
    thesis: normalize(item.thesis),
    field: null,
    startYear: normalize(item.startYear),
    endYear: normalize(item.endYear),
    sortOrder: index + 1,
  })),
  experiences: rows('experiences').map((item, index) => ({
    legacyId: item.id,
    company: normalize(item.company),
    role: normalize(item.role),
    location: normalize(item.location),
    startDate: normalize(item.startDate),
    endDate: normalize(item.endDate),
    isCurrent: String(item.endDate).toLowerCase() === 'present',
    description: null,
    sortOrder: index + 1,
  })),
  projects: rows('projects').map((item, index) => ({
    legacyId: item.id,
    experienceLegacyId: item.companyId,
    projectLocation: normalize(item.projectLocation),
    startDate: normalize(item.startDate),
    endDate: normalize(item.endDate),
    description: normalize(item.description),
    sortOrder: index + 1,
  })),
};

fs.writeFileSync(outputPath, `${JSON.stringify(exportData, null, 2)}\n`, 'utf8');
console.log(`Exported Laravel resume data to ${outputPath}`);
console.log(`Experiences: ${exportData.experiences.length}; projects: ${exportData.projects.length}`);
