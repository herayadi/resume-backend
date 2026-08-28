import { NextResponse } from 'next/server';
import { AdminAuthError, requireAdmin } from '@/lib/admin-auth';
import { getAdminResource } from '@/lib/admin-resources';
import { createAdminClient } from '@/lib/supabase-admin';

type Context = { params: Promise<{ resource: string }> };

function errorResponse(error: unknown) {
  if (error instanceof AdminAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error('Admin API error:', error);
  return NextResponse.json({ error: 'Admin operation failed' }, { status: 500 });
}

export async function GET(request: Request, context: Context) {
  try {
    await requireAdmin(request);
    const { resource } = await context.params;
    const config = getAdminResource(resource);
    if (!config) return NextResponse.json({ error: 'Unknown resource' }, { status: 404 });

    const supabase = createAdminClient();
    if (config.singleton) {
      const { data, error } = await supabase.from(config.table).select('*').eq('singleton', true).single();
      if (error) throw error;
      return NextResponse.json({ data });
    }

    let query = supabase.from(config.table).select('*');
    query = config.sortable
      ? query.order('sort_order', { ascending: true }).order('created_at', { ascending: false })
      : query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    await requireAdmin(request);
    const { resource } = await context.params;
    const config = getAdminResource(resource);
    if (!config) return NextResponse.json({ error: 'Unknown resource' }, { status: 404 });
    if (!config.writable || config.singleton || !config.createSchema) {
      return NextResponse.json({ error: 'Create is not supported for this resource' }, { status: 405 });
    }

    const parsed = config.createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const values: Record<string, unknown> = { ...parsed.data };
    const supabase = createAdminClient();
    if (resource === 'social-links' && !values.profile_id) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles').select('id').eq('singleton', true).single();
      if (profileError) throw profileError;
      values.profile_id = profile.id;
    }
    if (config.sortable && values.sort_order === undefined) {
      const { data: first, error: orderError } = await supabase
        .from(config.table).select('sort_order').order('sort_order', { ascending: true }).limit(1).maybeSingle();
      if (orderError) throw orderError;
      values.sort_order = Number(first?.sort_order ?? 1) - 1;
    }
    const { data, error } = await supabase.from(config.table).insert(values).select().single();
    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request, context: Context) {
  try {
    await requireAdmin(request);
    const { resource } = await context.params;
    const config = getAdminResource(resource);
    if (!config) return NextResponse.json({ error: 'Unknown resource' }, { status: 404 });
    if (!config.singleton || !config.updateSchema) {
      return NextResponse.json({ error: 'Use the resource ID when updating this resource' }, { status: 405 });
    }
    const parsed = config.updateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const supabase = createAdminClient();
    const { data, error } = await supabase.from(config.table).update(parsed.data).eq('singleton', true).select().single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    return errorResponse(error);
  }
}
