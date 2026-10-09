import 'server-only';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function requireWorkspace(write = false) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');
  const { data: membership, error } = await supabase.from('organization_members')
    .select('organization_id,role').eq('user_id', user.id).limit(1).maybeSingle();
  if (error || !membership) throw new Error('No Command Center organization membership found.');
  if (write && !['owner','admin','editor'].includes(membership.role))
    throw new Error('This account has read-only access.');
  return { supabase, user, organizationId: membership.organization_id as string, role: membership.role as string };
}

export function shortText(value: FormDataEntryValue | null, max = 180): string {
  return String(value ?? '').trim().slice(0,max);
}

export function webUrl(value: FormDataEntryValue | null): string | null {
  const raw = shortText(value, 1024);
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw Error();
    return parsed.href;
  } catch {
    throw new Error('Enter a valid http:// or https:// address.');
  }
}

export function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
