import { NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/cors';
import { mapEducation, mapExperience, mapProfile, mapSkill, mapSocialLink } from '@/lib/mappers';
import { createAdminClient } from '@/lib/supabase-admin';

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();
    const [profileResult, socialResult, skillsResult, educationResult, experienceResult, projectResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('singleton', true).single(),
      supabase.from('social_links').select('*').order('sort_order', { ascending: true }),
      supabase.from('skills').select('*').order('sort_order', { ascending: true }),
      supabase.from('education').select('*').order('sort_order', { ascending: true }),
      supabase.from('experiences').select('*').order('sort_order', { ascending: true }),
      supabase.from('projects').select('*').order('sort_order', { ascending: true }),
    ]);

    const error = [profileResult, socialResult, skillsResult, educationResult, experienceResult, projectResult]
      .map((result) => result.error)
      .find(Boolean);
    if (error) throw error;

    const projects = (projectResult.data || []) as Record<string, unknown>[];
    const payload = {
      profile: mapProfile(profileResult.data),
      socialLinks: (socialResult.data || []).map(mapSocialLink),
      skills: (skillsResult.data || []).map(mapSkill),
      education: (educationResult.data || []).map(mapEducation),
      experiences: (experienceResult.data || []).map((experience) => mapExperience(experience, projects)),
    };

    return NextResponse.json(payload, {
      headers: { ...corsHeaders(request), 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Resume API error:', error);
    return NextResponse.json(
      { error: 'Unable to load resume data' },
      { status: 500, headers: { ...corsHeaders(request), 'Cache-Control': 'no-store' } }
    );
  }
}
