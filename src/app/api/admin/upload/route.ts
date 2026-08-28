import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { AdminAuthError, requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase-admin';

const mimeExtensions: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf',
};

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const form = await request.formData();
    const file = form.get('file');
    const kind = form.get('kind');
    if (!(file instanceof File) || (kind !== 'avatar' && kind !== 'cv')) {
      return NextResponse.json({ error: 'A valid file and upload kind are required' }, { status: 400 });
    }
    const extension = mimeExtensions[file.type];
    const validKind = kind === 'avatar' ? file.type.startsWith('image/') : file.type === 'application/pdf';
    if (!extension || !validKind || file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Unsupported file type or file larger than 10 MB' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const path = `${kind}/${randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from('resume-assets').upload(path, file, {
      contentType: file.type, cacheControl: '3600', upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from('resume-assets').getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl, path }, { status: 201 });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
