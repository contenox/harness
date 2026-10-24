




export interface User {
  id: string;
  email: string;
  display_name: string;
}

export type MembershipRole = 'tenant_owner' | 'tenant_admin' | 'tenant_user';

export interface AccountMembership {
  id: string;
  slug: string;
  name: string;
  role: MembershipRole;
}

export interface CreateAccountRequest {
  name: string;
}

export interface OwnedAccounts {
  free: number;
  paid: number;
  suspended: number;
  can_create: boolean;
}

export interface SessionResponse {
  user: User;
  accounts: AccountMembership[];
  session_expires_at: string;
}

export type AccountType = 'consumer' | 'business';

export interface BusinessDetails {
  legal_name: string;
  vat_id?: string;
  address_line1: string;
  address_line2?: string;
  postal_code: string;
  city: string;
  country: string;
}

export interface ConsentRequest {
  terms_version: string;
  privacy_version: string;
  withdrawal_waiver_version?: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  display_name?: string;
  account_name?: string;
  invite_token?: string;
  account_type?: AccountType;
  business?: BusinessDetails;
  consent: ConsentRequest;
}

export interface SignupResponse {
  session: SessionResponse;
  account_type?: AccountType;
  contact_pending: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ResetRequestRequest {
  email: string;
}

export interface ResetConfirmRequest {
  token: string;
  password: string;
}

export interface UpdateMeRequest {
  email: string;
  display_name: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface DeleteMeResponse {
  accounts_deleted: number;
  instances_dropped: number;
}

export interface BrowserSession {
  id: string;
  user_agent: string;
  created_at: string;
  expires_at: string;
  last_seen_at: string | null;
  revoked_at: string | null;
  current: boolean;
}

export interface ListSessionsResponse {
  sessions: BrowserSession[];
}

export interface RevokeSessionsResponse {
  revoked: number;
}





export type Plan = 'free' | 'pro';

export type SubscriptionSource = 'stripe' | 'manual';

export type SubscriptionState =
  'none' | 'active' | 'grace' | 'on_hold' | 'paused' | 'expired' | 'canceled';

export interface ConsentRecord {
  document: string;
  version: string;
  accepted_at: string;
}

export interface Account {
  id: string;
  slug: string;
  name: string;
  plan: Plan;
  subscription_source: SubscriptionSource;
  subscription_state: SubscriptionState;
  entitled_instances?: number;
  active_instances: number;
  entitled_seats?: number;
  active_members?: number;
  invited_seats_used: number;
  pending_invites: number;
  can_subscribe: boolean;
  suspended: boolean;
  account_type?: AccountType;
  business?: BusinessDetails;
  consents: ConsentRecord[];
}

export interface UpdateAccountRequest {
  name: string;
  slug: string;
  account_type?: AccountType;
  business?: BusinessDetails;
}

export interface DeleteAccountResponse {
  account_id: string;
  instances_deleted: number;
  members_removed: number;
}























export interface BillingAccountRequest {
  account_id: string;
}

export interface CheckoutSessionResponse {
  url: string;
}

export interface BillingPortalResponse {
  url: string;
}

export interface UsageRow {
  model: string;
  output_tokens: number;
  output_allowance: number;
  input_tokens: number;
  input_allowance: number;
}

export interface HostUsage {
  client_id: string;
  models: UsageRow[];
}

export interface UsageAllowance {
  model: string;
  output_allowance: number;
  input_allowance: number;
}

export interface Usage {
  window_start: string;
  window_end: string;
  entitled_hosts: number;
  by_model: UsageRow[];
  by_host: HostUsage[];
  allowances?: UsageAllowance[];
  next_refill_at?: string;
}

export interface BillingStatus {
  account_id: string;
  can_manage_billing: boolean;
  can_subscribe: boolean;
  entitled: boolean;
  billed_directly: boolean;
  reconciled: boolean;
  subscription_source: SubscriptionSource;
  subscription_state: SubscriptionState;
  checked_at?: string;
}





export interface Instance {
  id: string;
  account_id: string;
  name: string;
  created_at: string;
  last_seen_at: string | null;
  revoked_at: string | null;
  connected: boolean;
}

export interface ListInstancesResponse {
  instances: Instance[];
}

export interface ListInstancesParams {
  cursor?: string;
  limit?: number;
}

export interface InstancePage {
  instances: Instance[];
  nextCursor: string | null;
}

export interface MintKeyRequest {
  account_id: string;
}

export interface MintKeyResponse {
  key: string;
  expires_at: string;
  expires_in: number;
}

export interface RevokeResponse {
  instance_id: string;
  account_id: string;
  dropped: boolean;
}

export interface UpdateInstanceRequest {
  name: string;
}















export type ConsumerSource = 'generic' | 'form';

export type ConsumerSessionMode = 'new' | 'reused';

export type ConsumerTargetKind = 'agent' | 'chain';


export const MAX_TARGET_NAME_BYTES = 200;

export interface EventConsumer {
  id: string;
  name: string;
  source: ConsumerSource;
  allowed_origins?: string[];
  instance_id: string;
  chain?: string;
  agent_name?: string;
  session_mode: ConsumerSessionMode;
  session_name?: string;
  context_filters?: Record<string, string>;
  created_at: string;
}

export interface CreateConsumerRequest {
  name: string;
  source: ConsumerSource;
  allowed_origins?: string[];
  instance_id: string;
  chain?: string;
  agent_name?: string;
  session_mode: ConsumerSessionMode;
  session_name?: string;
  context_filters?: Record<string, string>;
}

export interface CreateConsumerResponse extends EventConsumer {
  ingest_url: string;
  secret?: string;
}

export interface ListConsumersResponse {
  consumers: EventConsumer[];
}

export interface ListConsumersParams {
  cursor?: string;
  limit?: number;
}

export interface ConsumerPage {
  consumers: EventConsumer[];
  nextCursor: string | null;
}






export interface Member {
  user_id: string;
  email: string;
  display_name: string;
  role: MembershipRole;
  is_active: boolean;
  joined_at: string;
  last_login_at: string | null;
}

export interface ListMembersResponse {
  members: Member[];
}

export interface UpdateMemberRoleRequest {
  role: MembershipRole;
}

export interface Invite {
  id: string;
  email: string;
  role: MembershipRole;
  invited_by_user_id: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  delivery: InviteDelivery;
}

export type InviteDelivery = 'not_configured' | 'queued' | 'sent' | 'failed';

export interface ListInvitesResponse {
  invites: Invite[];
}

export interface ListInvitesParams {
  cursor?: string;
  limit?: number;
}

export interface InvitePage {
  invites: Invite[];
  nextCursor: string | null;
}

export interface InvitePreview {
  account_name: string;
  inviter_name?: string;
  role: MembershipRole;
  expires_at: string;
}

export interface CreateInviteRequest {
  email: string;
  role?: MembershipRole;
}

export interface AcceptInviteRequest {
  token: string;
}

export interface AcceptInviteResponse {
  account_id: string;
  account_name: string;
  role: MembershipRole;
}





export interface ExportConsent {
  document: string;
  version: string;
  accepted_at: string;
}

export interface ExportCredential {
  provider: string;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
}

export interface ExportInstance {
  id: string;
  name: string;
  created_at: string;
  last_seen_at: string | null;
  revoked_at: string | null;
  paired_by_this_user: boolean;
}

export interface ExportEvent {
  type: string;
  subject: string;
  time: string;
  data: unknown;
}

export interface ExportAccount {
  id: string;
  slug: string;
  name: string;
  role: MembershipRole;
  membership_active: boolean;
  created_at: string;
  subscription_source: string;
  subscription_state: string;
  account_type?: AccountType;
  business?: BusinessDetails;
  consents: ExportConsent[];
  instances: ExportInstance[];
  events: ExportEvent[];
}

export interface ExportUser {
  id: string;
  email: string;
  display_name: string;
  is_active: boolean;
  platform_role: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface ExportResponse {
  generated_at: string;
  user: ExportUser;
  credentials: ExportCredential[];
  sessions: BrowserSession[];
  accounts: ExportAccount[];
}



























export type AskDecision = 'allow' | 'deny' | 'answer';

export interface Ask {
  ask_id: string;
  instance_id: string;
  agent_name?: string;
  session_id?: string;
  mission_id?: string;
  tools_name?: string;
  tool_name?: string;
  policy_name?: string;
  matched_rule?: number;
  summary?: string;
  expires_at?: string;
  received_at: string;
  approvals_required: number;
  approvals_recorded: number;
  approver_role?: string;
  answered_by_caller: boolean;
  may_answer: boolean;
}

export interface ListAsksResponse {
  asks: Ask[];
}

export interface AnswerAskRequest {
  decision: AskDecision;
  answer?: string;
  guidance?: string;
}

export type AnswerStatus = 'recorded' | 'settled' | 'already_decided';

export interface AnswerAskResponse {
  ask_id: string;
  status: AnswerStatus;
  decision?: AskDecision;
  approvals_required: number;
  approvals_recorded: number;
}

export interface AskStreamEvent {
  type: 'ask.published' | 'ask.resolved';
  ask?: Ask;
  ask_id?: string;
  reason?: string;
}

export interface AskSubscription {
  agent_name: string;
  created_at: string;
}


export const MAX_SUBSCRIBED_AGENT_BYTES = 256;

export interface ListAskSubscriptionsResponse {
  subscriptions: AskSubscription[];
}

export interface ChangeAskSubscriptionRequest {
  agent_name: string;
  subscribed: boolean;
}

















export interface ApprovalRule {
  agent_name: string;
  approvals_required: number;
  approver_role?: string;
  updated_at: string;
}

export interface ListApprovalRulesResponse {
  rules: ApprovalRule[];
  max_approvals_required: number;
}

export interface SetApprovalRuleRequest {
  agent_name: string;
  approvals_required?: number;
  approver_role?: string;
  unset?: boolean;
}
