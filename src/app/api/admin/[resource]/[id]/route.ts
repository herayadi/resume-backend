import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AdminAuthError, requireAdmin } from '@/lib/admin-auth';
import { getAdminResource } from '@/lib/admin-resources';
import { createAdminClient } from '@/lib/supabase-admin';

type Context = { params: Promise<{ resource: string; id: string }> };

function errorResponse(error: unknown) {
  if (error instanceof AdminAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error('Admin API error:', error);
  return NextResponse.json({ error: 'Admin operation failed' }, { status: 500 });
}

export async function GET(request: Request, context: Context) {
  try {
    await requireAdmin(request);
    const { resource, id } = await context.params;
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    const config = getAdminResource(resource);
    if (!config || config.singleton) return NextResponse.json({ error: 'Unknown resource' }, { status: 404 });
    const { data, error } = await createAdminClient().from(config.table).select('*').eq('id', id).single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request, context: Context) {
  try {
    await requireAdmin(request);
    const { resource, id } = await context.params;
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    const config = getAdminResource(resource);
    if (!config) return NextResponse.json({ error: 'Unknown resource' }, { status: 404 });
    if (config.singleton || !config.writable || !config.updateSchema) {
      return NextResponse.json({ error: 'Update is not supported for this resource' }, { status: 405 });
    }
    const parsed = config.updateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    const { data, error } = await createAdminClient().from(config.table).update(parsed.data).eq('id', id).select().single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    await requireAdmin(request);
    const { resource, id } = await context.params;
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    const config = getAdminResource(resource);
    if (!config) return NextResponse.json({ error: 'Unknown resource' }, { status: 404 });
    if (config.singleton) return NextResponse.json({ error: 'The profile cannot be deleted' }, { status: 405 });
    const { error } = await createAdminClient().from(config.table).delete().eq('id', id);
    if (error) throw error;
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
