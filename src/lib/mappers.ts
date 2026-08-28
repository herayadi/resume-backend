type Row = Record<string, unknown>;

export function mapProfile(row: Row | null) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    phone: row.phone,
    email: row.email,
    dateOfBirth: row.date_of_birth,
    website: row.website,
    city: row.city,
    summaryEn: row.summary_en,
    summaryId: row.summary_id,
    bioEn: row.bio_en,
    bioId: row.bio_id,
    aboutIntro: row.about_intro,
    resumeIntro: row.resume_intro,
    footerTagline: row.footer_tagline,
    avatarUrl: row.avatar_url,
    cvUrl: row.cv_url,
  };
}

export function mapSocialLink(row: Row) {
  return {
    id: row.id,
    type: row.type,
    label: row.label,
    href: row.href,
    icon: row.icon,
  };
}

export function mapSkill(row: Row) {
  return { id: row.id, name: row.name, percentage: row.percentage, category: row.category };
}

export function mapEducation(row: Row) {
  return {
    id: row.id,
    degree: row.degree,
    shortDegree: row.short_degree,
    school: row.school,
    thesis: row.thesis,
    field: row.field,
    startYear: row.start_year,
    endYear: row.end_year,
  };
}

export function mapProject(row: Row) {
  return {
    id: row.id,
    projectLocation: row.project_location,
    startDate: row.start_label,
    endDate: row.end_label,
    description: row.description,
  };
}

export function mapExperience(row: Row, projects: Row[]) {
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    location: row.location,
    startDate: row.start_label,
    endDate: row.end_label,
    isCurrent: row.is_current,
    description: row.description,
    projects: projects.filter((project) => project.experience_id === row.id).map(mapProject),
  };
}
