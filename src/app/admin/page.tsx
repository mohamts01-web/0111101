import { redirect } from 'next/navigation';
import { AdminConsole, type AdminConsoleData } from '@/components/admin/admin-console';
import {
  deriveEffectiveEntitlement,
  type EntitlementAccessGrant,
  type EntitlementAdminGrant,
  type EntitlementSubscription,
  type EntitlementWallet,
} from '@/lib/effective-entitlement';
import { getAdminUser, getConfiguredAdminEmails } from '@/lib/admin-auth';
import { createClient as createInternalClient } from '@/utils/supabase/server-internal';

const USERS_PER_PAGE = 50;

type DirectoryUser = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  account_status: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  total_count: number;
};

type DashboardSummary = {
  total_users: number;
  paid_access_users: number;
  credits_in_circulation: number;
  pending_transfers: number;
  open_tickets: number;
};

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string; query?: string }> }) {
  const admin = await getAdminUser();
  if (!admin) redirect('/dashboard');

  const { page: pageParam, query: queryParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? '1', 10) || 1);
  const query = queryParam?.trim().slice(0, 120) ?? '';
  const internal = await createInternalClient();
  const [{ data: directoryData, error: directoryError }, { data: summaryData, error: summaryError }] =
    await Promise.all([
      internal.rpc('admin_user_directory', { p_search: query || null, p_page: page, p_page_size: USERS_PER_PAGE }),
      internal.rpc('admin_dashboard_summary'),
    ]);
  if (directoryError || summaryError) throw directoryError ?? summaryError;

  const directoryUsers = (directoryData ?? []) as DirectoryUser[];
  const dashboardSummary = (summaryData?.[0] ?? {
    total_users: 0,
    paid_access_users: 0,
    credits_in_circulation: 0,
    pending_transfers: 0,
    open_tickets: 0,
  }) as DashboardSummary;
  const userIds = directoryUsers.map((user) => user.user_id);
  const userIdFilter = <T,>(query: T) =>
    userIds.length
      ? (query as typeof query & { in: (column: string, values: string[]) => typeof query }).in('user_id', userIds)
      : query;

  const [
    walletsResult,
    customersResult,
    resumesResult,
    aiRequestsResult,
    grantsResult,
    accessGrantsResult,
    activitiesResult,
    ticketsResult,
    messagesResult,
    bankTransfersResult,
    auditsResult,
  ] = await Promise.all([
    userIdFilter(
      internal
        .from('user_entitlements')
        .select(
          'user_id,plan,trial_ends_at,monthly_credits,purchased_credits,promotional_credits,monthly_credits_expire_at',
        ),
    ),
    userIdFilter(internal.from('customers').select('customer_id,user_id')),
    userIdFilter(internal.from('resumes').select('user_id,updated_at')),
    userIdFilter(internal.from('ai_requests').select('user_id,created_at,status')),
    userIdFilter(
      internal
        .from('admin_plan_grants')
        .select('id,user_id,plan,ends_at,credits_granted,credits_remaining,status,starts_at'),
    ),
    userIdFilter(
      internal
        .from('plan_access_grants')
        .select('id,user_id,plan,source,ends_at,credits_granted,credits_remaining,status,starts_at'),
    ),
    userIdFilter(
      internal
        .from('activity_events')
        .select('id,user_id,event_type,entity_type,entity_id,created_at')
        .order('created_at', { ascending: false })
        .limit(200),
    ),
    internal
      .from('support_tickets')
      .select('id,user_id,contact_email,category,subject,status,priority,assigned_admin_email,created_at,updated_at')
      .order('updated_at', { ascending: false })
      .limit(100),
    internal
      .from('support_messages')
      .select('id,ticket_id,author_type,body,created_at')
      .order('created_at', { ascending: true })
      .limit(300),
    internal
      .from('bank_transfer_requests')
      .select(
        'id,user_id,contact_email,request_kind,plan,face_value_sar,payable_amount_sar,base_credits,bonus_credits,sender_name,transfer_reference,status,admin_note,created_at,reviewed_at',
      )
      .order('created_at', { ascending: false })
      .limit(100),
    internal
      .from('admin_audit_logs')
      .select('id,actor_email,action,target_user_id,reason,before_state,after_state,created_at')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  const customerIds = (customersResult.data ?? []).map((item) => item.customer_id);
  const subscriptionsResult = customerIds.length
    ? await internal
        .from('subscriptions')
        .select(
          'subscription_id,customer_id,subscription_status,price_id,access_until,scheduled_change_action,updated_at',
        )
        .in('customer_id', customerIds)
        .order('updated_at', { ascending: false })
    : { data: [], error: null };

  const results = [
    walletsResult,
    customersResult,
    resumesResult,
    aiRequestsResult,
    grantsResult,
    accessGrantsResult,
    activitiesResult,
    ticketsResult,
    messagesResult,
    bankTransfersResult,
    auditsResult,
    subscriptionsResult,
  ];
  const failedResult = results.find((result) => result.error);
  if (failedResult?.error) throw failedResult.error;

  const walletsByUser = new Map((walletsResult.data ?? []).map((item) => [item.user_id, item as EntitlementWallet]));
  const customerByUser = new Map((customersResult.data ?? []).map((item) => [item.user_id, item.customer_id]));
  const subscriptionsByCustomer = new Map<string, EntitlementSubscription[]>();
  for (const subscription of subscriptionsResult.data ?? []) {
    subscriptionsByCustomer.set(subscription.customer_id, [
      ...(subscriptionsByCustomer.get(subscription.customer_id) ?? []),
      subscription,
    ]);
  }
  const grantsByUser = groupByUser(grantsResult.data ?? []) as Map<string, EntitlementAdminGrant[]>;
  const accessGrantsByUser = groupByUser(accessGrantsResult.data ?? []) as Map<string, EntitlementAccessGrant[]>;
  const resumesByUser = groupByUser(resumesResult.data ?? []);
  const aiRequestsByUser = groupByUser(aiRequestsResult.data ?? []);
  const latestActivityByUser = new Map<string, string>();
  for (const item of activitiesResult.data ?? []) {
    if (item.user_id && !latestActivityByUser.has(item.user_id))
      latestActivityByUser.set(item.user_id, item.created_at);
  }

  const users = directoryUsers.map((user) => {
    const customerId = customerByUser.get(user.user_id);
    const entitlement = deriveEffectiveEntitlement({
      wallet: walletsByUser.get(user.user_id) ?? null,
      subscriptions: customerId ? (subscriptionsByCustomer.get(customerId) ?? []) : [],
      adminGrants: grantsByUser.get(user.user_id) ?? [],
      accessGrants: accessGrantsByUser.get(user.user_id) ?? [],
    });
    const userResumes = resumesByUser.get(user.user_id) ?? [];
    const userAi = aiRequestsByUser.get(user.user_id) ?? [];
    return {
      id: user.user_id,
      email: user.email ?? '',
      name: user.full_name ?? '',
      phone: user.phone ?? '',
      status: user.account_status ?? 'active',
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at,
      resumes: userResumes.length,
      aiRequests: userAi.length,
      lastActivity:
        latestActivityByUser.get(user.user_id) ??
        [...userResumes.map((item) => item.updated_at), ...userAi.map((item) => item.created_at)].sort().at(-1) ??
        null,
      entitlement,
    };
  });

  const emailByUser = new Map(directoryUsers.map((user) => [user.user_id, user.email ?? null]));
  const messagesByTicket = new Map<string, NonNullable<typeof messagesResult.data>>();
  for (const message of messagesResult.data ?? []) {
    messagesByTicket.set(message.ticket_id, [...(messagesByTicket.get(message.ticket_id) ?? []), message]);
  }

  const data: AdminConsoleData = {
    users,
    usersPage: page,
    hasNextPage: page * USERS_PER_PAGE < Number(directoryUsers[0]?.total_count ?? 0),
    totalUsers: Number(dashboardSummary.total_users),
    searchQuery: query,
    tickets: (ticketsResult.data ?? []).map((ticket) => ({
      ...ticket,
      messages: messagesByTicket.get(ticket.id) ?? [],
    })),
    audits: (auditsResult.data ?? []).map((audit) => ({
      ...audit,
      targetEmail: audit.target_user_id ? (emailByUser.get(audit.target_user_id) ?? null) : null,
    })),
    activities: (activitiesResult.data ?? []).map((item) => ({
      ...item,
      email: item.user_id ? (emailByUser.get(item.user_id) ?? null) : null,
    })),
    bankTransfers: bankTransfersResult.data ?? [],
    availableAdmins: getConfiguredAdminEmails(),
    summary: {
      activePaidUsers: Number(dashboardSummary.paid_access_users),
      creditsInCirculation: Number(dashboardSummary.credits_in_circulation),
      pendingTransfers: Number(dashboardSummary.pending_transfers),
      openTickets: Number(dashboardSummary.open_tickets),
    },
  };

  return <AdminConsole initialData={data} />;
}

function groupByUser<T extends { user_id: string | null }>(items: T[]) {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    if (!item.user_id) continue;
    grouped.set(item.user_id, [...(grouped.get(item.user_id) ?? []), item]);
  }
  return grouped;
}
