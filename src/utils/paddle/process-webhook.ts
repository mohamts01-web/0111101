import {
  CustomerCreatedEvent,
  CustomerUpdatedEvent,
  EventEntity,
  EventName,
  SubscriptionCanceledEvent,
  SubscriptionCreatedEvent,
  SubscriptionUpdatedEvent,
  TransactionCompletedEvent,
} from '@paddle/paddle-node-sdk';
import { createClient } from '@/utils/supabase/server-internal';
import { PricingTier, tierForPriceId } from '@/constants/pricing-tier';
import { planDurationEnd } from '@/lib/billing';
import { getPaddleInstance } from '@/utils/paddle/get-paddle-instance';

export class ProcessWebhook {
  async processEvent(eventData: EventEntity) {
    switch (eventData.eventType) {
      case EventName.SubscriptionCreated:
      case EventName.SubscriptionUpdated:
      case EventName.SubscriptionCanceled:
        await this.updateSubscriptionData(eventData);
        break;
      case EventName.CustomerCreated:
      case EventName.CustomerUpdated:
        await this.updateCustomerData(eventData);
        break;
      case EventName.TransactionCompleted:
        await this.processCompletedTransaction(eventData);
        break;
    }
  }

  private async updateSubscriptionData(
    eventData: SubscriptionCreatedEvent | SubscriptionUpdatedEvent | SubscriptionCanceledEvent,
  ) {
    const supabase = await createClient();
    const priceId = eventData.data.items[0].price?.id ?? '';
    const accessUntil =
      eventData.data.currentBillingPeriod?.endsAt ??
      eventData.data.items.find((item) => item.trialDates?.endsAt)?.trialDates?.endsAt ??
      eventData.data.nextBilledAt ??
      null;
    const { data: storedCustomer, error: customerError } = await supabase
      .from('customers')
      .select('user_id,email')
      .eq('customer_id', eventData.data.customerId)
      .maybeSingle();
    if (customerError) throw customerError;
    const customer = storedCustomer ?? (await this.fetchAndStoreCustomer(eventData.data.customerId));
    if (!customer) return;
    const userId = customer.user_id ?? (await this.resolveUserIdByEmail(customer.email));
    if (!userId) return;
    if (!customer.user_id)
      await supabase.from('customers').update({ user_id: userId }).eq('customer_id', eventData.data.customerId);

    const { data: applied, error } = await supabase.rpc('upsert_paddle_subscription', {
      p_subscription_id: eventData.data.id,
      p_customer_id: eventData.data.customerId,
      p_status: eventData.data.status,
      p_price_id: priceId,
      p_product_id: eventData.data.items[0].price?.productId ?? '',
      p_scheduled_change_action: eventData.data.scheduledChange?.action ?? null,
      p_scheduled_change_at: eventData.data.scheduledChange?.effectiveAt ?? null,
      p_event_at: eventData.occurredAt,
      p_access_until: accessUntil,
    });
    if (error) throw error;
    if (!applied) return;

    const tier = tierForPriceId(priceId);
    if (!tier) return;
    if (tier.id === 'trial') return;
    const plan = tier.entitlementPlan;
    const periodKey = eventData.data.currentBillingPeriod?.startsAt ?? eventData.data.updatedAt;
    const { error: entitlementError } = await supabase.rpc('sync_subscription_entitlement', {
      p_user_id: userId,
      p_subscription_id: eventData.data.id,
      p_plan: plan,
      p_status: eventData.data.status,
      p_period_key: periodKey,
      p_trial_ends_at: eventData.data.currentBillingPeriod?.endsAt ?? eventData.data.nextBilledAt,
      p_access_until: accessUntil,
    });
    if (entitlementError) throw entitlementError;
  }

  private async updateCustomerData(eventData: CustomerCreatedEvent | CustomerUpdatedEvent) {
    const supabase = await createClient();
    const userId = await this.resolveUserIdByEmail(eventData.data.email);
    const { error } = await supabase.rpc('upsert_paddle_customer', {
      p_customer_id: eventData.data.id,
      p_email: eventData.data.email,
      p_user_id: userId,
      p_event_at: eventData.occurredAt,
    });

    if (error) throw error;
  }

  private async processCompletedTransaction(eventData: TransactionCompletedEvent) {
    if (eventData.data.subscriptionId) return;
    const supabase = await createClient();
    const customerId = eventData.data.customerId;
    if (!customerId) return;
    const { data: storedCustomer, error: customerError } = await supabase
      .from('customers')
      .select('user_id,email')
      .eq('customer_id', customerId)
      .maybeSingle();
    if (customerError) throw customerError;
    const customer = storedCustomer ?? (await this.fetchAndStoreCustomer(customerId));
    if (!customer) return;
    const userId = customer.user_id ?? (await this.resolveUserIdByEmail(customer.email));
    if (!userId) return;

    const customData = eventData.data.customData as Record<string, unknown> | null;
    if (customData?.loadKind === 'credit_topup') {
      const { error } = await supabase.rpc('complete_paddle_credit_order', { p_transaction_id: eventData.data.id });
      if (error) throw error;
      return;
    }

    const trialTier = PricingTier.find(
      (tier) => tier.id === 'trial' && eventData.data.items.some((item) => item.price?.id === tier.priceId),
    );
    if (trialTier) {
      const startsAt = new Date(eventData.occurredAt);
      const { error } = await supabase.rpc('grant_plan_access', {
        p_user_id: userId,
        p_source: 'paddle_transaction',
        p_source_id: `paddle:${eventData.data.id}`,
        p_plan: trialTier.entitlementPlan,
        p_starts_at: startsAt.toISOString(),
        p_ends_at: planDurationEnd(trialTier.entitlementPlan, startsAt).toISOString(),
        p_credits: trialTier.credits,
      });
      if (error) throw error;
      return;
    }

    for (const item of eventData.data.items) {
      if (!item.price?.id) continue;
      const { error } = await supabase.rpc('grant_purchased_credits', {
        p_user_id: userId,
        p_price_id: item.price.id,
        p_transaction_id: `${eventData.data.id}:${item.price.id}`,
        p_quantity: item.quantity,
      });
      if (error && !error.message.includes('Unknown credit price')) throw error;
    }
  }

  private async fetchAndStoreCustomer(customerId: string) {
    const paddleCustomer = await getPaddleInstance().customers.get(customerId);
    if (!paddleCustomer.email) return null;
    const userId = await this.resolveUserIdByEmail(paddleCustomer.email);
    const supabase = await createClient();
    const customer = { customer_id: customerId, email: paddleCustomer.email, user_id: userId };
    const { error } = await supabase.rpc('upsert_paddle_customer', {
      p_customer_id: customerId,
      p_email: paddleCustomer.email,
      p_user_id: userId,
      p_event_at: new Date().toISOString(),
    });
    if (error) throw error;
    return customer;
  }

  private async resolveUserIdByEmail(email: string) {
    const supabase = await createClient();
    const normalized = email.trim().toLowerCase();
    for (let page = 1; page <= 10; page += 1) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
      if (error) throw error;
      const user = data.users.find((item) => item.email?.toLowerCase() === normalized);
      if (user) return user.id;
      if (data.users.length < 100) break;
    }
    return null;
  }
}
