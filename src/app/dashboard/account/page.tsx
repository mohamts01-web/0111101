import { redirect } from 'next/navigation';
import { AccountPage } from '@/components/dashboard/account/account-page';
import { resolveEffectiveEntitlement } from '@/lib/effective-entitlement';
import { createClient } from '@/utils/supabase/server';

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect('/login');

  const [profile, customer, deletion, entitlement] = await Promise.all([
    supabase.from('profiles').select('full_name,phone').eq('user_id', user.id).maybeSingle(),
    supabase.from('customers').select('customer_id').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('account_deletion_requests')
      .select('status,execute_after')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle(),
    resolveEffectiveEntitlement(supabase, user.id),
  ]);

  return (
    <AccountPage
      email={user.email}
      initialName={profile.data?.full_name || user.user_metadata?.full_name || ''}
      initialPhone={profile.data?.phone || ''}
      entitlement={entitlement}
      hasPaddleCustomer={Boolean(customer.data?.customer_id)}
      initialDeletion={deletion.data ?? null}
    />
  );
}
