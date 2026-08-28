import { z } from 'zod';

const optionalText = z.string().trim().nullable().optional();
const sortOrder = z.coerce.number().int().optional();

const profileFields = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  role: optionalText,
  phone: optionalText,
  email: z.union([z.string().trim().email(), z.literal(''), z.null()]).optional(),
  date_of_birth: optionalText,
  website: optionalText,
  city: optionalText,
  summary_en: optionalText,
  summary_id: optionalText,
  bio_en: optionalText,
  bio_id: optionalText,
  about_intro: optionalText,
  resume_intro: optionalText,
  footer_tagline: optionalText,
  avatar_url: optionalText,
  cv_url: optionalText,
});

const socialFields = z.object({
  profile_id: z.string().uuid().nullable().optional(),
  type: z.string().trim().min(2).max(60),
  label: z.string().trim().min(1).max(200),
  href: z.string().trim().min(1).max(500),
  icon: optionalText,
  sort_order: sortOrder,
});

const skillFields = z.object({
  name: z.string().trim().min(1).max(160),
  percentage: z.coerce.number().int().min(0).max(100),
  category: optionalText,
  sort_order: sortOrder,
});

const educationFields = z.object({
  degree: z.string().trim().min(1).max(240),
  short_degree: optionalText,
  school: z.string().trim().min(1).max(240),
  thesis: optionalText,
  field: optionalText,
  start_year: optionalText,
  end_year: optionalText,
  sort_order: sortOrder,
});

const experienceFields = z.object({
  company: z.string().trim().min(1).max(240),
  role: optionalText,
  location: optionalText,
  start_label: optionalText,
  end_label: optionalText,
  is_current: z.boolean().optional(),
  description: optionalText,
  sort_order: sortOrder,
});

const projectFields = z.object({
  experience_id: z.string().uuid(),
  project_location: z.string().trim().min(1).max(300),
  start_label: optionalText,
  end_label: optionalText,
  description: optionalText,
  sort_order: sortOrder,
});

export const adminResources = {
  profile: {
    table: 'profiles', singleton: true, sortable: false, writable: true,
    createSchema: null, updateSchema: profileFields,
  },
  'social-links': {
    table: 'social_links', singleton: false, sortable: true, writable: true,
    createSchema: socialFields, updateSchema: socialFields.partial(),
  },
  skills: {
    table: 'skills', singleton: false, sortable: true, writable: true,
    createSchema: skillFields, updateSchema: skillFields.partial(),
  },
  education: {
    table: 'education', singleton: false, sortable: true, writable: true,
    createSchema: educationFields, updateSchema: educationFields.partial(),
  },
  experiences: {
    table: 'experiences', singleton: false, sortable: true, writable: true,
    createSchema: experienceFields, updateSchema: experienceFields.partial(),
  },
  projects: {
    table: 'projects', singleton: false, sortable: true, writable: true,
    createSchema: projectFields, updateSchema: projectFields.partial(),
  },
  'contact-messages': {
    table: 'contact_messages', singleton: false, sortable: false, writable: false,
    createSchema: null, updateSchema: null,
  },
} as const;

export type AdminResourceName = keyof typeof adminResources;

export function getAdminResource(name: string) {
  return Object.prototype.hasOwnProperty.call(adminResources, name)
    ? adminResources[name as AdminResourceName]
    : null;
}
