import { createClient as createInternalClient } from '@/utils/supabase/server-internal';

type ActivityEvent = {
  userId: string;
  eventType: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export async function recordActivity(event: ActivityEvent) {
  try {
    const supabase = await createInternalClient();
    const { error } = await supabase.from('activity_events').insert({
      user_id: event.userId,
      event_type: event.eventType,
      entity_type: event.entityType ?? null,
      entity_id: event.entityId ?? null,
      metadata: event.metadata ?? {},
    });
    if (error) console.error('Recording activity failed', error);
  } catch (error) {
    console.error('Recording activity failed', error);
  }
}
