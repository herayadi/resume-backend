import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) throw new Error('Missing Supabase environment variables');

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const source = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/laravel-export.json'), 'utf8'));

const upsert = async (table, values, conflict = 'legacy_id') => {
  const { data, error } = await supabase.from(table).upsert(values, { onConflict: conflict }).select();
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
};

const seed = async () => {
  const [profile] = await upsert('profiles', {
    singleton: true,
    legacy_id: source.profile.legacyId,
    name: source.profile.name,
    role: source.profile.role,
    phone: source.profile.phone,
    email: source.profile.email,
    date_of_birth: source.profile.dateOfBirth,
    website: source.profile.website,
    city: source.profile.city,
    summary_en: source.profile.summaryEn,
    summary_id: source.profile.summaryId,
    bio_en: source.profile.bioEn,
    bio_id: source.profile.bioId,
    about_intro: source.profile.aboutIntro,
    resume_intro: source.profile.resumeIntro,
    footer_tagline: source.profile.footerTagline,
    avatar_url: source.profile.avatarUrl,
    cv_url: source.profile.cvUrl,
    updated_at: new Date().toISOString(),
  }, 'singleton');

  await upsert('social_links', source.socialLinks.map((item) => ({
    legacy_id: item.legacyId,
    profile_id: profile.id,
    type: item.type,
    label: item.label,
    href: item.href,
    icon: item.icon,
    sort_order: item.sortOrder,
    updated_at: new Date().toISOString(),
  })));

  await upsert('skills', source.skills.map((item) => ({
    legacy_id: item.legacyId,
    name: item.name,
    percentage: item.percentage,
    category: item.category,
    sort_order: item.sortOrder,
    updated_at: new Date().toISOString(),
  })));

  await upsert('education', source.education.map((item) => ({
    legacy_id: item.legacyId,
    degree: item.degree,
    short_degree: item.shortDegree,
    school: item.school,
    thesis: item.thesis,
    field: item.field,
    start_year: item.startYear,
    end_year: item.endYear,
    sort_order: item.sortOrder,
    updated_at: new Date().toISOString(),
  })));

  const experiences = await upsert('experiences', source.experiences.map((item) => ({
    legacy_id: item.legacyId,
    company: item.company,
    role: item.role,
    location: item.location,
    start_label: item.startDate,
    end_label: item.endDate,
    is_current: item.isCurrent,
    description: item.description,
    sort_order: item.sortOrder,
    updated_at: new Date().toISOString(),
  })));
  const experienceIds = new Map(experiences.map((item) => [item.legacy_id, item.id]));

  await upsert('projects', source.projects.map((item) => {
    const experienceId = experienceIds.get(item.experienceLegacyId);
    if (!experienceId) throw new Error(`Missing experience for project legacy ID ${item.legacyId}`);
    return {
      legacy_id: item.legacyId,
      experience_id: experienceId,
      project_location: item.projectLocation,
      start_label: item.startDate,
      end_label: item.endDate,
      description: item.description,
      sort_order: item.sortOrder,
      updated_at: new Date().toISOString(),
    };
  }));

  console.log('Resume seed completed without deleting existing rows.');
};

seed().catch((error) => {
  console.error('Resume seed failed:', error);
  process.exit(1);
});
