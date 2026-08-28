import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { corsHeaders } from '@/lib/cors';
import { createAdminClient } from '@/lib/supabase-admin';
import { contactSchema } from '@/lib/validators';

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: Request) {
  try {
    const parsed = contactSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid contact form', details: parsed.error.flatten().fieldErrors },
        { status: 400, headers: corsHeaders(request) }
      );
    }

    if (parsed.data.website) {
      return NextResponse.json({ success: true }, { status: 202, headers: corsHeaders(request) });
    }

    const supabase = createAdminClient();
    const clientAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateKey = createHash('sha256')
      .update(`${clientAddress}:${parsed.data.email.toLowerCase()}`)
      .digest('hex');
    const { data: allowed, error: rateError } = await supabase.rpc('consume_contact_rate_limit', {
      p_key_hash: rateKey,
      p_limit: 5,
      p_window: '1 hour',
    });
    if (rateError) throw rateError;
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many messages. Please try again later.' },
        { status: 429, headers: { ...corsHeaders(request), 'Retry-After': '3600' } }
      );
    }

    const { error } = await supabase.from('contact_messages').insert({
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject,
      message: parsed.data.message,
    });
    if (error) throw error;

    return NextResponse.json({ success: true }, { status: 201, headers: corsHeaders(request) });
  } catch (error) {
    console.error('Contact API error:', error);
    return NextResponse.json(
      { error: 'Unable to send message' },
      { status: 500, headers: corsHeaders(request) }
    );
  }
}
