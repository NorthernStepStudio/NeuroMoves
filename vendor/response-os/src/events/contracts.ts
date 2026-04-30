export type ResponseOsEventType =
  | 'call.missed'
  | 'sms.received'
  | 'form.submitted'
  | 'appointment.booked'
  | 'appointment.cancelled'
  | 'operator.handled'
  | 'job.completed';

export interface ResponseOsEvent<TType extends ResponseOsEventType, TPayload> {
  eventId: string;
  type: TType;
  occurredAt: string;
  source: string;
  tenantId?: string;
  payload: TPayload;
}

export interface MissedCallEventPayload {
  fromNumber: string;
  toNumber: string;
  callSid: string;
  durationSeconds?: number;
  answered?: boolean;
}

export interface SmsReceivedEventPayload {
  fromNumber: string;
  toNumber: string;
  body: string;
  messageSid?: string;
  mediaUrls?: string[];
}

export interface JobCompletedEventPayload {
  leadId: string;
  leadPhone: string;
  leadName?: string;
  leadStatus: 'won' | 'lost' | 'scheduled' | 'estimate_sent' | 'contacted' | 'new';
  serviceCategory?: string;
  completedAt: string;
  reviewUrl?: string;
}

export type MissedCallEvent = ResponseOsEvent<'call.missed', MissedCallEventPayload>;
export type SmsReceivedEvent = ResponseOsEvent<'sms.received', SmsReceivedEventPayload>;
export type JobCompletedEvent = ResponseOsEvent<'job.completed', JobCompletedEventPayload>;

export type AnyResponseOsEvent =
  | MissedCallEvent
  | SmsReceivedEvent
  | ResponseOsEvent<'form.submitted', Record<string, unknown>>
  | ResponseOsEvent<'appointment.booked', Record<string, unknown>>
  | ResponseOsEvent<'appointment.cancelled', Record<string, unknown>>
  | ResponseOsEvent<'operator.handled', Record<string, unknown>>
  | JobCompletedEvent;

export function isMissedCallEvent(event: AnyResponseOsEvent): event is MissedCallEvent {
  return event.type === 'call.missed';
}

export function isSmsReceivedEvent(event: AnyResponseOsEvent): event is SmsReceivedEvent {
  return event.type === 'sms.received';
}

export function isJobCompletedEvent(event: AnyResponseOsEvent): event is JobCompletedEvent {
  return event.type === 'job.completed';
}
