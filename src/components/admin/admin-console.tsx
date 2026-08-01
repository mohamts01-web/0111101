'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ArrowDownUp,
  Ban,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Coins,
  CreditCard,
  ExternalLink,
  Gauge,
  LifeBuoy,
  MessageSquare,
  MoreHorizontal,
  Search,
  Shield,
  Trash2,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import type { EffectiveEntitlement } from '@/lib/effective-entitlement';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type AdminUser = {
  id: string;
  email: string;
  name: string;
  phone: string;
  status: string;
  createdAt: string;
  lastSignInAt: string | null;
  resumes: number;
  aiRequests: number;
  lastActivity: string | null;
  entitlement: EffectiveEntitlement;
};

type AdminTicket = {
  id: string;
  user_id: string | null;
  contact_email: string;
  category: string;
  subject: string;
  status: string;
  priority: string;
  assigned_admin_email: string | null;
  created_at: string;
  updated_at: string;
  messages: Array<{ id: string; author_type: string; body: string; created_at: string }>;
};

type AdminAudit = {
  id: number;
  actor_email: string;
  action: string;
  target_user_id: string | null;
  targetEmail: string | null;
  reason: string;
  before_state: Record<string, unknown>;
  after_state: Record<string, unknown>;
  created_at: string;
};

type ActivityEvent = {
  id: number;
  user_id: string | null;
  email: string | null;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
};

type BankTransfer = {
  id: string;
  user_id: string | null;
  contact_email: string;
  request_kind: string;
  plan: string | null;
  face_value_sar: number | null;
  payable_amount_sar: number;
  base_credits: number;
  bonus_credits: number;
  sender_name: string | null;
  transfer_reference: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
};

type Summary = {
  activePaidUsers: number;
  creditsInCirculation: number;
  pendingTransfers: number;
  openTickets: number;
};

export type AdminConsoleData = {
  users: AdminUser[];
  usersPage: number;
  hasNextPage: boolean;
  totalUsers: number;
  searchQuery: string;
  tickets: AdminTicket[];
  audits: AdminAudit[];
  activities: ActivityEvent[];
  bankTransfers: BankTransfer[];
  availableAdmins: string[];
  summary: Summary;
};

type Tab = 'overview' | 'users' | 'transfers' | 'tickets' | 'activity' | 'audit';
type PendingAction = {
  title: string;
  description: string;
  destructive?: boolean;
  action: Record<string, unknown>;
};

type TicketUpdate = {
  status?: string;
  priority?: string;
  assignedAdminEmail?: string | null;
  reply?: string;
};

export function AdminConsole({ initialData }: { initialData: AdminConsoleData }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [search, setSearch] = useState(initialData.searchQuery);
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(initialData.users[0]?.id ?? '');
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [plan, setPlan] = useState('basic');
  const [endsAt, setEndsAt] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().slice(0, 10);
  });
  const [reply, setReply] = useState<Record<string, string>>({});
  const [transferNotes, setTransferNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const selected = initialData.users.find((user) => user.id === selectedId) ?? null;
  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return initialData.users.filter((user) => {
      const haystack = `${user.name} ${user.email} ${user.phone}`.toLowerCase();
      return (
        (!normalizedSearch || haystack.includes(normalizedSearch)) &&
        (planFilter === 'all' || user.entitlement.plan === planFilter) &&
        (statusFilter === 'all' || user.status === statusFilter)
      );
    });
  }, [initialData.users, planFilter, search, statusFilter]);

  function requestAction(action: PendingAction['action'], title: string, description: string, destructive = false) {
    if (!selected) return;
    if (reason.trim().length < 3) {
      setNotice({ kind: 'error', text: 'اكتب سبباً واضحاً من ثلاثة أحرف على الأقل قبل تنفيذ الإجراء.' });
      return;
    }
    setPendingAction({ action, title, description, destructive });
  }

  async function confirmUserAction() {
    if (!selected || !pendingAction) return;
    setLoading(true);
    setNotice(null);
    const response = await fetch(`/api/admin/users/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...pendingAction.action,
        reason,
        operationId: crypto.randomUUID(),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      setNotice({ kind: 'error', text: payload.error ?? 'تعذر تنفيذ الإجراء. حاول مرة أخرى.' });
      return;
    }
    setPendingAction(null);
    setReason('');
    setNotice({
      kind: 'success',
      text: payload.pendingWebhook
        ? 'تم إرسال طلب الإلغاء إلى Paddle. ستتحدث الحالة النهائية بعد وصول Webhook.'
        : 'تم تنفيذ الإجراء وتسجيله وإشعار المستخدم.',
    });
    router.refresh();
  }

  async function updateTicket(ticketId: string, update: TicketUpdate = {}) {
    const response = await fetch(`/api/admin/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return setNotice({ kind: 'error', text: payload.error ?? 'تعذر تحديث التذكرة.' });
    setReply((current) => ({ ...current, [ticketId]: '' }));
    setNotice({ kind: 'success', text: 'تم تحديث التذكرة وإشعار المستخدم.' });
    router.refresh();
  }

  async function reviewTransfer(transferId: string, decision: 'approved' | 'rejected') {
    const note = transferNotes[transferId]?.trim() ?? '';
    if (note.length < 3) {
      setNotice({ kind: 'error', text: 'اكتب ملاحظة مراجعة واضحة قبل قبول أو رفض التحويل.' });
      return;
    }
    setLoading(true);
    const response = await fetch(`/api/admin/bank-transfers/${transferId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, note }),
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) return setNotice({ kind: 'error', text: payload.error ?? 'تعذرت مراجعة التحويل.' });
    setNotice({
      kind: 'success',
      text: decision === 'approved' ? 'تم قبول التحويل ومنح الخدمة.' : 'تم رفض التحويل وإشعار المستخدم.',
    });
    router.refresh();
  }

  function submitUserSearch() {
    const params = new URLSearchParams();
    if (search.trim()) params.set('query', search.trim());
    router.push(`/admin${params.size ? `?${params.toString()}` : ''}`);
  }

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 px-4 py-6 md:px-8 md:py-8" dir="rtl">
      <header className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
            <Shield className="h-4 w-4" /> مركز تشغيل LOAD
          </p>
          <h1 className="text-3xl font-bold tracking-tight">لوحة الإدارة</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            راقب الاشتراكات والرصيد والدعم وقرارات الإدارة من واجهة واحدة واضحة.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm shadow-sm">
          <Users className="h-5 w-5 text-primary" />
          <div>
            <strong className="block text-base">{formatNumber(initialData.totalUsers)}</strong>
            <span className="text-xs text-muted-foreground">حساب مسجل</span>
          </div>
        </div>
      </header>

      <nav className="flex gap-1 overflow-x-auto rounded-lg border bg-card p-1.5 shadow-sm" aria-label="أقسام الإدارة">
        <TabButton active={tab === 'overview'} onClick={() => setTab('overview')} icon={Gauge}>
          نظرة عامة
        </TabButton>
        <TabButton active={tab === 'users'} onClick={() => setTab('users')} icon={Users}>
          المستخدمون
        </TabButton>
        <TabButton
          active={tab === 'transfers'}
          onClick={() => setTab('transfers')}
          icon={Building2}
          count={initialData.summary.pendingTransfers}
        >
          التحويلات
        </TabButton>
        <TabButton
          active={tab === 'tickets'}
          onClick={() => setTab('tickets')}
          icon={LifeBuoy}
          count={initialData.summary.openTickets}
        >
          الدعم
        </TabButton>
        <TabButton active={tab === 'activity'} onClick={() => setTab('activity')} icon={Activity}>
          النشاط
        </TabButton>
        <TabButton active={tab === 'audit'} onClick={() => setTab('audit')} icon={ClipboardList}>
          التدقيق
        </TabButton>
      </nav>

      {notice && (
        <Notice kind={notice.kind} onClose={() => setNotice(null)}>
          {notice.text}
        </Notice>
      )}

      {tab === 'overview' && <Overview data={initialData} onNavigate={setTab} />}
      {tab === 'users' && (
        <UsersWorkspace
          users={filteredUsers}
          selected={selected}
          search={search}
          planFilter={planFilter}
          statusFilter={statusFilter}
          reason={reason}
          amount={amount}
          plan={plan}
          endsAt={endsAt}
          loading={loading}
          page={initialData.usersPage}
          hasNextPage={initialData.hasNextPage}
          onSearch={setSearch}
          onPlanFilter={setPlanFilter}
          onStatusFilter={setStatusFilter}
          onSelect={setSelectedId}
          onReason={setReason}
          onAmount={setAmount}
          onPlan={setPlan}
          onEndsAt={setEndsAt}
          onRequestAction={requestAction}
          onSearchSubmit={submitUserSearch}
        />
      )}
      {tab === 'transfers' && (
        <TransfersWorkspace
          transfers={initialData.bankTransfers}
          notes={transferNotes}
          loading={loading}
          onNotes={setTransferNotes}
          onReview={reviewTransfer}
        />
      )}
      {tab === 'tickets' && (
        <TicketsWorkspace
          tickets={initialData.tickets}
          admins={initialData.availableAdmins}
          reply={reply}
          onReply={setReply}
          onUpdate={updateTicket}
        />
      )}
      {tab === 'activity' && <ActivityWorkspace activities={initialData.activities} />}
      {tab === 'audit' && <AuditWorkspace audits={initialData.audits} />}

      <Dialog open={Boolean(pendingAction)} onOpenChange={(open) => !open && setPendingAction(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{pendingAction?.title}</DialogTitle>
            <DialogDescription>{pendingAction?.description}</DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <span className="text-muted-foreground">المستخدم: </span>
            <strong dir="ltr">{selected?.email}</strong>
            <span className="mx-2 text-muted-foreground">|</span>
            <span className="text-muted-foreground">السبب: </span>
            <strong>{reason}</strong>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={loading} onClick={() => setPendingAction(null)}>
              إلغاء
            </Button>
            <Button
              variant={pendingAction?.destructive ? 'destructive' : 'default'}
              disabled={loading}
              onClick={confirmUserAction}
            >
              {loading ? 'جارٍ التنفيذ...' : 'تأكيد الإجراء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Overview({ data, onNavigate }: { data: AdminConsoleData; onNavigate: (tab: Tab) => void }) {
  const cards = [
    {
      label: 'اشتراكات ومنح فعالة',
      value: data.summary.activePaidUsers,
      detail: 'على مستوى المنصة',
      icon: CreditCard,
      tab: 'users' as const,
    },
    {
      label: 'رصيد متاح',
      value: data.summary.creditsInCirculation,
      detail: 'نقطة موزعة على الحسابات النشطة',
      icon: Coins,
      tab: 'users' as const,
    },
    {
      label: 'تحويلات بانتظار القرار',
      value: data.summary.pendingTransfers,
      detail: 'تتطلب مراجعة الإيصال',
      icon: Building2,
      tab: 'transfers' as const,
    },
    {
      label: 'تذاكر مفتوحة',
      value: data.summary.openTickets,
      detail: 'شكوى أو اقتراح أو طلب دعم',
      icon: LifeBuoy,
      tab: 'tickets' as const,
    },
  ];
  const recentTickets = data.tickets.filter((ticket) => ticket.status !== 'resolved').slice(0, 4);
  const recentTransfers = data.bankTransfers.filter((transfer) => transfer.status === 'pending').slice(0, 4);
  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              type="button"
              onClick={() => onNavigate(card.tab)}
              className="group rounded-lg border bg-card p-5 text-right shadow-sm transition hover:border-primary/40 hover:shadow"
            >
              <div className="mb-5 flex items-start justify-between">
                <span className="rounded-md bg-primary/10 p-2.5 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <ChevronLeft className="h-4 w-4 text-muted-foreground transition group-hover:-translate-x-1 group-hover:text-primary" />
              </div>
              <strong className="block text-3xl">{formatNumber(card.value)}</strong>
              <span className="mt-2 block font-medium">{card.label}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{card.detail}</span>
            </button>
          );
        })}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <WorkQueue
          title="طلبات تحتاج قراراً"
          empty="لا توجد تحويلات معلقة حالياً."
          icon={Building2}
          action="عرض التحويلات"
          onAction={() => onNavigate('transfers')}
        >
          {recentTransfers.map((transfer) => (
            <QueueItem
              key={transfer.id}
              title={
                transfer.request_kind === 'credits'
                  ? `${formatNumber(transfer.base_credits)} نقطة`
                  : planLabel(transfer.plan ?? 'free')
              }
              meta={`${formatSar(transfer.payable_amount_sar)} · ${formatDate(transfer.created_at)}`}
            />
          ))}
        </WorkQueue>
        <WorkQueue
          title="الدعم يحتاج متابعة"
          empty="لا توجد تذاكر مفتوحة حالياً."
          icon={LifeBuoy}
          action="فتح الدعم"
          onAction={() => onNavigate('tickets')}
        >
          {recentTickets.map((ticket) => (
            <QueueItem
              key={ticket.id}
              title={ticket.subject}
              meta={`${ticket.contact_email} · ${ticketStatusLabel(ticket.status)}`}
            />
          ))}
        </WorkQueue>
      </div>
      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">آخر نشاط المستخدمين</h2>
            <p className="mt-1 text-sm text-muted-foreground">مختصر للأحداث المسجلة ضمن الصفحة الحالية.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => onNavigate('activity')}>
            عرض النشاط
          </Button>
        </div>
        <ActivityList activities={data.activities.slice(0, 6)} />
      </section>
    </section>
  );
}

function UsersWorkspace(props: {
  users: AdminUser[];
  selected: AdminUser | null;
  search: string;
  planFilter: string;
  statusFilter: string;
  reason: string;
  amount: string;
  plan: string;
  endsAt: string;
  loading: boolean;
  page: number;
  hasNextPage: boolean;
  onSearch: (value: string) => void;
  onPlanFilter: (value: string) => void;
  onStatusFilter: (value: string) => void;
  onSelect: (id: string) => void;
  onReason: (value: string) => void;
  onAmount: (value: string) => void;
  onPlan: (value: string) => void;
  onEndsAt: (value: string) => void;
  onRequestAction: (action: Record<string, unknown>, title: string, description: string, destructive?: boolean) => void;
  onSearchSubmit: () => void;
}) {
  const { users, selected } = props;
  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-4">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              props.onSearchSubmit();
            }}
            className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_160px_92px]"
          >
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={props.search}
                onChange={(event) => props.onSearch(event.target.value)}
                placeholder="ابحث بالاسم أو البريد أو رقم الهاتف"
                className="pr-10"
              />
            </div>
            <Select value={props.planFilter} onValueChange={props.onPlanFilter}>
              <SelectTrigger>
                <SelectValue placeholder="كل الباقات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الباقات</SelectItem>
                <SelectItem value="free">مجانية</SelectItem>
                <SelectItem value="trial_basic">تجريبية</SelectItem>
                <SelectItem value="basic">الأساسية بلس</SelectItem>
                <SelectItem value="advanced">المتقدمة</SelectItem>
              </SelectContent>
            </Select>
            <Select value={props.statusFilter} onValueChange={props.onStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="حالة الحساب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="disabled">معطّل</SelectItem>
                <SelectItem value="pending_deletion">قيد الحذف</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit">بحث</Button>
          </form>
        </div>
        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="font-semibold">المستخدمون</h2>
              <p className="mt-1 text-xs text-muted-foreground">{formatNumber(users.length)} نتيجة ضمن هذه الصفحة</p>
            </div>
            <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <HeaderCell>المستخدم</HeaderCell>
                  <HeaderCell>الوصول الفعّال</HeaderCell>
                  <HeaderCell>الرصيد</HeaderCell>
                  <HeaderCell>السير / AI</HeaderCell>
                  <HeaderCell>الاشتراك</HeaderCell>
                  <HeaderCell>آخر نشاط</HeaderCell>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    selected={user.id === selected?.id}
                    onSelect={() => props.onSelect(user.id)}
                  />
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-muted-foreground">
                      لا توجد نتائج مطابقة للفلاتر الحالية.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t px-5 py-3 text-sm">
            <span className="text-muted-foreground">صفحة {props.page}</span>
            <div className="flex gap-2">
              <Link href={adminPageHref(Math.max(1, props.page - 1), props.search)}>
                <Button size="sm" variant="outline" disabled={props.page === 1}>
                  <ChevronRight className="h-4 w-4" /> السابق
                </Button>
              </Link>
              <Link href={adminPageHref(props.page + 1, props.search)}>
                <Button size="sm" variant="outline" disabled={!props.hasNextPage}>
                  التالي <ChevronLeft className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
      <UserDetailPanel {...props} />
    </section>
  );
}

function UserRow({ user, selected, onSelect }: { user: AdminUser; selected: boolean; onSelect: () => void }) {
  return (
    <tr onClick={onSelect} className={`cursor-pointer transition hover:bg-muted/50 ${selected ? 'bg-primary/5' : ''}`}>
      <td className="p-4">
        <strong className="block">{user.name || 'بلا اسم'}</strong>
        <span dir="ltr" className="mt-1 block text-xs text-muted-foreground">
          {user.email}
        </span>
      </td>
      <td className="p-4">
        <PlanBadge plan={user.entitlement.plan} />
        <span className="mt-1 block text-xs text-muted-foreground">
          {sourceLabel(user.entitlement.source)}{' '}
          {user.entitlement.accessUntil ? `· حتى ${formatDate(user.entitlement.accessUntil)}` : ''}
        </span>
      </td>
      <td className="p-4">
        <strong>{formatNumber(user.entitlement.totalCredits)}</strong>
        <span className="mr-1 text-xs text-muted-foreground">نقطة</span>
      </td>
      <td className="p-4">
        {user.resumes} / {user.aiRequests}
      </td>
      <td className="p-4">
        <SubscriptionBadge status={user.entitlement.subscriptionStatus} />
      </td>
      <td className="p-4 text-xs text-muted-foreground">
        {user.lastActivity ? formatDate(user.lastActivity) : 'لا يوجد'}
      </td>
    </tr>
  );
}

function UserDetailPanel(props: {
  selected: AdminUser | null;
  reason: string;
  amount: string;
  plan: string;
  endsAt: string;
  loading: boolean;
  onReason: (value: string) => void;
  onAmount: (value: string) => void;
  onPlan: (value: string) => void;
  onEndsAt: (value: string) => void;
  onRequestAction: (action: Record<string, unknown>, title: string, description: string, destructive?: boolean) => void;
}) {
  const { selected } = props;
  if (!selected)
    return (
      <aside className="rounded-lg border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
        اختر مستخدماً لعرض ملفه وإدارته.
      </aside>
    );
  const entitlement = selected.entitlement;
  return (
    <aside className="space-y-5 rounded-lg border bg-card p-5 shadow-sm xl:sticky xl:top-6 xl:h-fit">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{selected.name || 'بلا اسم'}</h2>
          <p dir="ltr" className="mt-1 text-xs text-muted-foreground">
            {selected.email}
          </p>
        </div>
        <AccountBadge status={selected.status} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Metric label="الباقة" value={planLabel(entitlement.plan)} />
        <Metric label="إجمالي الرصيد" value={`${formatNumber(entitlement.totalCredits)} نقطة`} />
        <Metric label="الاشتراك" value={subscriptionLabel(entitlement.subscriptionStatus)} />
        <Metric label="آخر دخول" value={selected.lastSignInAt ? formatDate(selected.lastSignInAt) : 'لا يوجد'} />
      </div>
      <div className="rounded-md border bg-muted/30 p-3 text-sm">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-medium">تفصيل الرصيد</span>
          <Coins className="h-4 w-4 text-primary" />
        </div>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <CreditLine label="الباقة الحالية" value={entitlement.monthly_credits} />
          <CreditLine label="الرصيد المشترى" value={entitlement.purchased_credits} />
          <CreditLine label="رصيد ترويجي" value={entitlement.promotional_credits} />
          <CreditLine label="منحة الإدارة" value={entitlement.adminGrantCredits} />
          <CreditLine label="منح الدفع/التحويل" value={entitlement.accessGrantCredits} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="admin-reason">سبب الإجراء</Label>
        <Textarea
          id="admin-reason"
          value={props.reason}
          onChange={(event) => props.onReason(event.target.value)}
          className="min-h-20"
          placeholder="يحفظ في سجل التدقيق ويصل للمستخدم عند الاقتضاء"
        />
      </div>
      <div className="space-y-3 border-t pt-4">
        <p className="text-sm font-medium">إدارة الرصيد</p>
        <div className="flex gap-2">
          <Input
            type="number"
            value={props.amount}
            onChange={(event) => props.onAmount(event.target.value)}
            placeholder="مثال: 50 أو -20"
          />
          <Button
            size="sm"
            disabled={props.loading || !props.amount}
            onClick={() =>
              props.onRequestAction(
                { action: 'adjust_credit', amount: Number(props.amount) },
                'تعديل رصيد المستخدم',
                `${Number(props.amount) > 0 ? 'إضافة' : 'خصم'} ${Math.abs(Number(props.amount))} نقطة من رصيد ${selected.email}.`,
              )
            }
          >
            <Coins className="h-4 w-4" /> تطبيق
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">الإضافة تصبح رصيداً ترويجياً، والخصم لا يتجاوز الرصيد المتاح.</p>
      </div>
      <div className="space-y-3 border-t pt-4">
        <p className="text-sm font-medium">منحة إدارية محددة المدة</p>
        <Select value={props.plan} onValueChange={props.onPlan}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="basic">الأساسية بلس · 200 نقطة</SelectItem>
            <SelectItem value="standard">المتوسطة · 700 نقطة</SelectItem>
            <SelectItem value="advanced">المتقدمة · 1400 نقطة</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={props.endsAt} onChange={(event) => props.onEndsAt(event.target.value)} />
        <Button
          variant="outline"
          className="w-full"
          disabled={props.loading || Boolean(entitlement.adminGrantId)}
          onClick={() =>
            props.onRequestAction(
              { action: 'grant_plan', plan: props.plan, endsAt: new Date(`${props.endsAt}T23:59:59`).toISOString() },
              'منح باقة إدارية',
              `سيمنح المستخدم باقة ${planLabel(props.plan)} حتى ${props.endsAt}.`,
            )
          }
        >
          <Shield className="h-4 w-4" /> منح الباقة
        </Button>
        {entitlement.adminGrantId && (
          <Button
            variant="outline"
            className="w-full"
            disabled={props.loading}
            onClick={() =>
              props.onRequestAction(
                { action: 'revoke_grant', grantId: entitlement.adminGrantId },
                'إيقاف المنحة الإدارية',
                'سينتهي رصيد المنحة المتبقي فوراً، ولا يمس الرصيد المشترى أو الاشتراك المدفوع.',
                true,
              )
            }
          >
            إيقاف المنحة الحالية
          </Button>
        )}
      </div>
      <div className="space-y-2 border-t pt-4">
        <p className="text-sm font-medium">عمليات حساسة</p>
        <Button
          variant="outline"
          className="w-full"
          disabled={props.loading || !['active', 'trialing'].includes(entitlement.subscriptionStatus ?? '')}
          onClick={() =>
            props.onRequestAction(
              { action: 'cancel_subscription' },
              'إلغاء اشتراك Paddle فوراً',
              'سيطلب من Paddle إلغاء الاشتراك الآن. الحالة النهائية تعتمد على Webhook، وقد ينشأ استرداد نسبي حسب Paddle.',
              true,
            )
          }
        >
          <CreditCard className="h-4 w-4" /> إلغاء اشتراك Paddle
        </Button>
        <Button
          variant="outline"
          className="w-full"
          disabled={props.loading}
          onClick={() =>
            props.onRequestAction(
              { action: 'set_status', status: selected.status === 'disabled' ? 'active' : 'disabled' },
              selected.status === 'disabled' ? 'إعادة تفعيل الحساب' : 'تعطيل الحساب',
              selected.status === 'disabled'
                ? 'سيتمكن المستخدم من الدخول مجدداً.'
                : 'سيفقد المستخدم الوصول مؤقتاً مع بقاء بياناته محفوظة.',
              selected.status !== 'disabled',
            )
          }
        >
          {selected.status === 'disabled' ? <UserCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
          {selected.status === 'disabled' ? 'إعادة تفعيل الحساب' : 'تعطيل الحساب'}
        </Button>
        <Button
          variant="destructive"
          className="w-full"
          disabled={props.loading}
          onClick={() =>
            props.onRequestAction(
              { action: 'request_delete', disableImmediately: true },
              'جدولة حذف الحساب',
              'سيعطل الحساب الآن ويُحذف المحتوى بعد سبعة أيام، مع الاحتفاظ بسجل الفوترة والتدقيق.',
              true,
            )
          }
        >
          <Trash2 className="h-4 w-4" /> جدولة حذف الحساب
        </Button>
      </div>
    </aside>
  );
}

function TransfersWorkspace({
  transfers,
  notes,
  loading,
  onNotes,
  onReview,
}: {
  transfers: BankTransfer[];
  notes: Record<string, string>;
  loading: boolean;
  onNotes: (notes: Record<string, string>) => void;
  onReview: (id: string, decision: 'approved' | 'rejected') => void;
}) {
  return (
    <section className="space-y-4">
      <SectionHeading
        title="التحويلات البنكية"
        description="راجع الإيصال والمبلغ ثم اقبل الطلب أو ارفضه مع ملاحظة واضحة."
      />
      {transfers.length === 0 ? (
        <EmptyState icon={Building2} text="لا توجد طلبات تحويل بنكي حالياً." />
      ) : (
        transfers.map((transfer) => (
          <article key={transfer.id} className="rounded-lg border bg-card p-5 shadow-sm">
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex gap-3">
                <span className="rounded-md bg-primary/10 p-2.5 text-primary">
                  <Building2 className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-semibold">
                    {transfer.request_kind === 'credits'
                      ? `${formatNumber(transfer.base_credits)} نقطة + ${formatNumber(transfer.bonus_credits)} هدية`
                      : planLabel(transfer.plan ?? 'free')}
                  </h2>
                  <p dir="ltr" className="mt-1 text-xs text-muted-foreground">
                    {transfer.contact_email}
                  </p>
                </div>
              </div>
              <div className="text-left">
                <strong className="text-lg">{formatSar(transfer.payable_amount_sar)}</strong>
                <span className="mt-1 block text-xs text-muted-foreground">{formatDate(transfer.created_at)}</span>
              </div>
            </header>
            <div className="my-5 grid gap-3 border-y py-4 text-sm sm:grid-cols-4">
              <Metric label="الحالة" value={transferStatusLabel(transfer.status)} />
              <Metric label="اسم المحوّل" value={transfer.sender_name || 'غير مذكور'} />
              <Metric label="المرجع" value={transfer.transfer_reference || 'غير مذكور'} />
              <Metric
                label="القيمة قبل الخصم"
                value={transfer.face_value_sar ? formatSar(transfer.face_value_sar) : '—'}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <a href={`/api/admin/bank-transfers/${transfer.id}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" /> فتح الإيصال
                </a>
              </Button>
              {transfer.status === 'pending' && (
                <>
                  <Input
                    className="min-w-[240px] flex-1"
                    value={notes[transfer.id] ?? ''}
                    onChange={(event) => onNotes({ ...notes, [transfer.id]: event.target.value })}
                    placeholder="ملاحظة المراجعة التي ستصل للمستخدم"
                  />
                  <Button size="sm" disabled={loading} onClick={() => onReview(transfer.id, 'approved')}>
                    <CheckCircle2 className="h-4 w-4" /> قبول ومنح
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={loading}
                    onClick={() => onReview(transfer.id, 'rejected')}
                  >
                    <XCircle className="h-4 w-4" /> رفض
                  </Button>
                </>
              )}
              {transfer.admin_note && (
                <p className="w-full text-sm text-muted-foreground">ملاحظة الإدارة: {transfer.admin_note}</p>
              )}
            </div>
          </article>
        ))
      )}
    </section>
  );
}

function TicketsWorkspace({
  tickets,
  admins,
  reply,
  onReply,
  onUpdate,
}: {
  tickets: AdminTicket[];
  admins: string[];
  reply: Record<string, string>;
  onReply: (value: Record<string, string>) => void;
  onUpdate: (id: string, update?: TicketUpdate) => void;
}) {
  const [statusFilter, setStatusFilter] = useState('open');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const filteredTickets = tickets.filter(
    (ticket) =>
      (statusFilter === 'all' || ticket.status === statusFilter) &&
      (priorityFilter === 'all' || ticket.priority === priorityFilter),
  );
  return (
    <section className="space-y-4">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <SectionHeading
          title="صندوق الدعم"
          description="الشكاوى والاقتراحات وطلبات المساعدة، مع أولوية ومالك واضح لكل تذكرة."
        />
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="open">مفتوحة</SelectItem>
              <SelectItem value="in_progress">قيد المعالجة</SelectItem>
              <SelectItem value="resolved">محلولة</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأولويات</SelectItem>
              <SelectItem value="urgent">عاجلة</SelectItem>
              <SelectItem value="high">مرتفعة</SelectItem>
              <SelectItem value="normal">عادية</SelectItem>
              <SelectItem value="low">منخفضة</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {filteredTickets.length === 0 ? (
        <EmptyState icon={LifeBuoy} text="لا توجد تذاكر دعم." />
      ) : (
        filteredTickets.map((ticket) => (
          <article key={ticket.id} className="rounded-lg border bg-card p-5 shadow-sm">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <TicketBadge status={ticket.status} />
                  <PriorityBadge priority={ticket.priority} />
                  <span className="text-xs text-muted-foreground">{ticketCategoryLabel(ticket.category)}</span>
                </div>
                <h2 className="font-semibold">{ticket.subject}</h2>
                <p dir="ltr" className="mt-1 text-xs text-muted-foreground">
                  {ticket.contact_email}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select
                  value={ticket.assigned_admin_email ?? 'unassigned'}
                  onValueChange={(value) =>
                    onUpdate(ticket.id, { assignedAdminEmail: value === 'unassigned' ? null : value })
                  }
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="تعيين مسؤول" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">بدون مسؤول</SelectItem>
                    {admins.map((email) => (
                      <SelectItem key={email} value={email}>
                        {email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={ticket.priority} onValueChange={(value) => onUpdate(ticket.id, { priority: value })}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">عاجلة</SelectItem>
                    <SelectItem value="high">مرتفعة</SelectItem>
                    <SelectItem value="normal">عادية</SelectItem>
                    <SelectItem value="low">منخفضة</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={ticket.status} onValueChange={(value) => onUpdate(ticket.id, { status: value })}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">مفتوحة</SelectItem>
                    <SelectItem value="in_progress">قيد المعالجة</SelectItem>
                    <SelectItem value="resolved">محلولة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </header>
            <div className="my-4 space-y-2 border-y py-4">
              {ticket.messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[90%] rounded-lg p-3 text-sm ${message.author_type === 'admin' ? 'mr-auto bg-primary/10' : 'ml-auto bg-muted'}`}
                >
                  <strong className="mb-1 block text-xs">
                    {message.author_type === 'admin' ? 'الإدارة' : 'المستخدم'}
                  </strong>
                  <p className="whitespace-pre-wrap">{message.body}</p>
                  <span className="mt-2 block text-[11px] text-muted-foreground">
                    {formatDateTime(message.created_at)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={reply[ticket.id] ?? ''}
                onChange={(event) => onReply({ ...reply, [ticket.id]: event.target.value })}
                placeholder="اكتب رد الإدارة..."
              />
              <Button onClick={() => onUpdate(ticket.id, { reply: reply[ticket.id] })}>
                <MessageSquare className="h-4 w-4" /> إرسال
              </Button>
            </div>
          </article>
        ))
      )}
    </section>
  );
}

function ActivityWorkspace({ activities }: { activities: ActivityEvent[] }) {
  return (
    <section className="space-y-4">
      <SectionHeading
        title="آخر النشاط"
        description="أحداث المحرر والحساب والذكاء الاصطناعي للمستخدمين في صفحة النتائج الحالية."
      />
      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <ActivityList activities={activities} />
      </section>
    </section>
  );
}

function AuditWorkspace({ audits }: { audits: AdminAudit[] }) {
  return (
    <section className="space-y-4">
      <SectionHeading
        title="سجل التدقيق"
        description="كل إجراء إداري مهم، مع المنفذ والمستخدم المتأثر والسبب والتغير المسجل."
      />
      {audits.length === 0 ? (
        <EmptyState icon={ClipboardList} text="لا توجد إجراءات إدارية مسجلة بعد." />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <HeaderCell>التاريخ</HeaderCell>
                  <HeaderCell>المدير</HeaderCell>
                  <HeaderCell>المستخدم</HeaderCell>
                  <HeaderCell>الإجراء</HeaderCell>
                  <HeaderCell>السبب</HeaderCell>
                  <HeaderCell>التغير</HeaderCell>
                </tr>
              </thead>
              <tbody className="divide-y">
                {audits.map((audit) => (
                  <tr key={audit.id}>
                    <td className="p-4 text-xs text-muted-foreground">{formatDateTime(audit.created_at)}</td>
                    <td dir="ltr" className="p-4 text-xs">
                      {audit.actor_email}
                    </td>
                    <td dir="ltr" className="p-4 text-xs">
                      {audit.targetEmail ?? 'حساب محذوف أو غير موجود'}
                    </td>
                    <td className="p-4">{auditActionLabel(audit.action)}</td>
                    <td className="max-w-xs p-4">{audit.reason}</td>
                    <td className="p-4">
                      <details>
                        <summary className="cursor-pointer text-primary">عرض</summary>
                        <pre dir="ltr" className="mt-2 max-w-sm overflow-auto rounded bg-muted p-2 text-[11px]">
                          {JSON.stringify({ before: audit.before_state, after: audit.after_state }, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function WorkQueue({
  title,
  empty,
  icon: Icon,
  action,
  onAction,
  children,
}: {
  title: string;
  empty: string;
  icon: typeof Building2;
  action: string;
  onAction: () => void;
  children: React.ReactNode;
}) {
  const hasItems = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-primary/10 p-2 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <h2 className="font-semibold">{title}</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onAction}>
          {action}
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
      {hasItems ? (
        <div className="divide-y">{children}</div>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}
function QueueItem({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <strong className="block truncate text-sm">{title}</strong>
        <span className="mt-1 block truncate text-xs text-muted-foreground">{meta}</span>
      </div>
      <MoreHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
    </div>
  );
}
function ActivityList({ activities }: { activities: ActivityEvent[] }) {
  return activities.length === 0 ? (
    <p className="py-8 text-center text-sm text-muted-foreground">لا توجد أحداث مسجلة بعد.</p>
  ) : (
    <div className="divide-y">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-center justify-between gap-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="rounded-md bg-muted p-2">
              <Activity className="h-4 w-4 text-primary" />
            </span>
            <div className="min-w-0">
              <strong className="block text-sm">{activityLabel(activity.event_type)}</strong>
              <span dir="ltr" className="mt-1 block truncate text-xs text-muted-foreground">
                {activity.email ?? 'حساب محذوف أو غير موجود'}
              </span>
            </div>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(activity.created_at)}</span>
        </div>
      ))}
    </div>
  );
}
function TabButton({
  active,
  onClick,
  icon: Icon,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Gauge;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
    >
      <Icon className="h-4 w-4" />
      {children}
      {typeof count === 'number' && count > 0 && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[11px] ${active ? 'bg-primary-foreground/20' : 'bg-destructive/10 text-destructive'}`}
        >
          {formatNumber(count)}
        </span>
      )}
    </button>
  );
}
function HeaderCell({ children }: { children: React.ReactNode }) {
  return <th className="p-4 text-right text-xs font-medium">{children}</th>;
}
function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
function EmptyState({ icon: Icon, text }: { icon: typeof Building2; text: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-card p-12 text-center text-sm text-muted-foreground">
      <Icon className="mx-auto mb-3 h-7 w-7 text-primary" />
      {text}
    </div>
  );
}
function Notice({
  kind,
  onClose,
  children,
}: {
  kind: 'success' | 'error';
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className={`flex items-center justify-between gap-3 rounded-lg border p-4 text-sm ${kind === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100' : 'border-destructive/30 bg-destructive/10 text-destructive'}`}
    >
      <span>{children}</span>
      <button type="button" onClick={onClose} aria-label="إغلاق">
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <span className="block text-xs text-muted-foreground">{label}</span>
      <strong className="mt-1 block truncate text-sm" title={value}>
        {value}
      </strong>
    </div>
  );
}
function CreditLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
    </div>
  );
}
function PlanBadge({ plan }: { plan: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${plan === 'free' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}
    >
      {planLabel(plan)}
    </span>
  );
}
function SubscriptionBadge({ status }: { status: string | null }) {
  const tone =
    status === 'active' || status === 'trialing'
      ? 'bg-emerald-500/10 text-emerald-700'
      : status === 'canceled'
        ? 'bg-muted text-muted-foreground'
        : 'bg-amber-500/10 text-amber-700';
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs ${tone}`}>{subscriptionLabel(status)}</span>;
}
function AccountBadge({ status }: { status: string }) {
  const tone =
    status === 'active'
      ? 'bg-emerald-500/10 text-emerald-700'
      : status === 'disabled'
        ? 'bg-destructive/10 text-destructive'
        : 'bg-amber-500/10 text-amber-700';
  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${tone}`}>{accountStatusLabel(status)}</span>;
}
function TicketBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-medium ${status === 'resolved' ? 'bg-emerald-500/10 text-emerald-700' : status === 'in_progress' ? 'bg-primary/10 text-primary' : 'bg-amber-500/10 text-amber-700'}`}
    >
      {ticketStatusLabel(status)}
    </span>
  );
}
function PriorityBadge({ priority }: { priority: string }) {
  const tone =
    priority === 'urgent'
      ? 'bg-destructive/10 text-destructive'
      : priority === 'high'
        ? 'bg-orange-500/10 text-orange-700'
        : priority === 'low'
          ? 'bg-muted text-muted-foreground'
          : 'bg-primary/10 text-primary';
  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${tone}`}>{priorityLabel(priority)}</span>;
}
function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}
function adminPageHref(page: number, query: string) {
  const params = new URLSearchParams({ page: String(page) });
  if (query.trim()) params.set('query', query.trim());
  return `/admin?${params.toString()}`;
}
function formatSar(value: number) {
  return `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value)} ر.س`;
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
function planLabel(value: string) {
  return (
    (
      {
        free: 'مجانية',
        trial_basic: 'التجريبية الأساسية',
        basic: 'الأساسية بلس',
        standard: 'المتوسطة',
        advanced: 'المتقدمة',
      } as Record<string, string>
    )[value] ?? value
  );
}
function sourceLabel(value: EffectiveEntitlement['source']) {
  return (
    {
      free: 'بدون اشتراك',
      paddle: 'Paddle',
      admin: 'منحة إدارية',
      bank_transfer: 'تحويل بنكي',
      paddle_transaction: 'شراء مباشر',
    } as Record<string, string>
  )[value];
}
function subscriptionLabel(value: string | null) {
  return (
    (
      { active: 'نشط', trialing: 'تجريبي', canceled: 'ملغى', past_due: 'متأخر', paused: 'موقوف' } as Record<
        string,
        string
      >
    )[value ?? ''] ?? 'لا يوجد'
  );
}
function accountStatusLabel(value: string) {
  return (
    ({ active: 'نشط', disabled: 'معطّل', pending_deletion: 'قيد الحذف', deleted: 'محذوف' } as Record<string, string>)[
      value
    ] ?? value
  );
}
function ticketStatusLabel(value: string) {
  return (
    ({ open: 'مفتوحة', in_progress: 'قيد المعالجة', resolved: 'محلولة' } as Record<string, string>)[value] ?? value
  );
}
function ticketCategoryLabel(value: string) {
  return ({ complaint: 'شكوى', suggestion: 'اقتراح', support: 'طلب مساعدة' } as Record<string, string>)[value] ?? value;
}
function priorityLabel(value: string) {
  return (
    ({ urgent: 'عاجلة', high: 'مرتفعة', normal: 'عادية', low: 'منخفضة' } as Record<string, string>)[value] ?? value
  );
}
function transferStatusLabel(value: string) {
  return (
    ({ pending: 'قيد المراجعة', approved: 'مقبول', rejected: 'مرفوض', canceled: 'ملغى' } as Record<string, string>)[
      value
    ] ?? value
  );
}
function activityLabel(value: string) {
  return (
    (
      {
        'resume.saved': 'حفظ سيرة ذاتية',
        'account.profile_updated': 'تحديث الملف الشخصي',
        'support.ticket_created': 'إنشاء تذكرة دعم',
        'ai.operation_completed': 'اكتمال أداة ذكاء اصطناعي',
        'ai.chat_completed': 'رسالة للمساعد الذكي',
      } as Record<string, string>
    )[value] ?? value
  );
}
function auditActionLabel(value: string) {
  return (
    (
      {
        credit_adjustment: 'تعديل رصيد',
        plan_grant_created: 'منح باقة',
        plan_grant_revoked: 'إيقاف منحة',
        paddle_subscription_canceled: 'طلب إلغاء اشتراك Paddle',
        account_deletion_requested: 'طلب حذف حساب',
        account_status_changed: 'تغيير حالة الحساب',
        support_ticket_updated: 'تحديث تذكرة دعم',
        bank_transfer_approved: 'قبول تحويل بنكي',
        bank_transfer_rejected: 'رفض تحويل بنكي',
      } as Record<string, string>
    )[value] ?? value
  );
}
