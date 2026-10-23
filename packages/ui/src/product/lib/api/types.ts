/**
 * The relay's `/v1` wire shapes, as this client needs them.
 */





/**
 * The signed-in human.
 */
export interface User {
  id: string;
  email: string;
  display_name: string;
}

/**
 * Membership roles.
 */
export type MembershipRole = 'tenant_owner' | 'tenant_admin' | 'tenant_user';

/**
 * One account the signed-in user is an ACTIVE member of, with the role held in it.
 */
export interface AccountMembership {
  id: string;
  slug: string;
  name: string;
  role: MembershipRole;
}

/**
 * Body of `POST /v1/accounts` — creating a team.
 */
export interface CreateAccountRequest {
  name: string;
}

/**
 * What `GET /v1/accounts/owned` answers: the caller's ownership position.
 */
export interface OwnedAccounts {
  free: number;
  paid: number;
  /**
   * Owned accounts under administrative suspension.
   */
  suspended: number;
  can_create: boolean;
}

/**
 * Transcribed from signin.SessionResponse — the one shape sign-up, sign-in and `GET /v1/auth/me` all answer with.
 */
export interface SessionResponse {
  user: User;
  /**
   * Only accounts with an active membership.
   */
  accounts: AccountMembership[];
  /**
   * RFC3339.
   */
  session_expires_at: string;
}

/**
 * How an account is invoiced, priced and taxed.
 */
export type AccountType = 'consumer' | 'business';

/**
 * The legal identity an invoice is addressed to.
 */
export interface BusinessDetails {
  legal_name: string;
  vat_id?: string;
  address_line1: string;
  address_line2?: string;
  postal_code: string;
  city: string;
  country: string;
}

/**
 * Which published documents a registration accepted.
 */
export interface ConsentRequest {
  terms_version: string;
  privacy_version: string;
  withdrawal_waiver_version?: string;
}

/**
 * Body of `POST /v1/auth/signup` (201 -> [SignupResponse]).
 */
export interface SignupRequest {
  email: string;
  password: string;
  display_name?: string;
  account_name?: string;
  invite_token?: string;
  /**
   * Absent means consumer.
   */
  account_type?: AccountType;
  business?: BusinessDetails;
  consent: ConsentRequest;
}

/**
 * 201 from `POST /v1/auth/signup`.
 */
export interface SignupResponse {
  session: SessionResponse;
  /**
   * Absent for a registration that joined an existing account by invitation.
   */
  account_type?: AccountType;
  contact_pending: boolean;
}

/**
 * Body of `POST /v1/auth/login`.
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Body of `POST /v1/auth/password/reset/request`.
 */
export interface ResetRequestRequest {
  email: string;
}

/**
 * Body of `POST /v1/auth/password/reset/confirm`.
 */
export interface ResetConfirmRequest {
  token: string;
  password: string;
}

/**
 * Body of `PATCH /v1/auth/me` (200 -> [SessionResponse]).
 */
export interface UpdateMeRequest {
  email: string;
  display_name: string;
}

/**
 * Body of `POST /v1/auth/password/change` (204).
 */
export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

/**
 * 200 from `DELETE /v1/auth/me`.
 */
export interface DeleteMeResponse {
  accounts_deleted: number;
  instances_dropped: number;
}

/**
 * One browser session.
 */
export interface BrowserSession {
  id: string;
  user_agent: string;
  created_at: string;
  expires_at: string;
  /**
   * Most recent authenticated request.
   */
  last_seen_at: string | null;
  /**
   * Non-null once signed out.
   */
  revoked_at: string | null;
  current: boolean;
}

/**
 * 200 from `GET /v1/auth/sessions`.
 */
export interface ListSessionsResponse {
  sessions: BrowserSession[];
}

/**
 * 200 from `DELETE /v1/auth/sessions`.
 */
export interface RevokeSessionsResponse {
  revoked: number;
}





/**
 * Which tier the account is on.
 */
export type Plan = 'free' | 'pro';

/**
 * Where the entitlement comes from.
 */
export type SubscriptionSource = 'stripe' | 'manual';

/**
 * Lifecycle position.
 */
export type SubscriptionState =
  'none' | 'active' | 'grace' | 'on_hold' | 'paused' | 'expired' | 'canceled';

/**
 * One acceptance of one published document.
 */
export interface ConsentRecord {
  /**
   * store's ConsentDocument* value: `terms`, `privacy` or `withdrawal_waiver`.
   */
  document: string;
  /**
   * Identifies the exact text that was accepted.
   */
  version: string;
  accepted_at: string;
}

/**
 * `GET /v1/accounts/{account_id}` (200).
 */
export interface Account {
  id: string;
  slug: string;
  name: string;
  /**
   * DERIVED FROM THE ALLOWANCE, not from the subscription.
   */
  plan: Plan;
  subscription_source: SubscriptionSource;
  subscription_state: SubscriptionState;
  /**
   * The allowance.
   */
  entitled_instances?: number;
  active_instances: number;
  /**
   * How many INVITED members the plan includes — the owner is not counted.
   */
  entitled_seats?: number;
  /**
   * Active memberships, the owner included — the count the seat allowance is enforced against at invite mint.
   */
  active_members?: number;
  /**
   * Invited seats that are OCCUPIED: the active NON-OWNER memberships.
   */
  invited_seats_used: number;
  /**
   * Live invitations: unspent and unexpired — seats already promised.
   */
  pending_invites: number;
  /**
   * Checkout would open a session for THIS caller on THIS account: the relay's `CheckoutRefusal` answers nothing, and the caller is an owner or admin of an unsuspended account.
   */
  can_subscribe: boolean;
  /**
   * True when administratively suspended, which is separate from the subscription lapsing.
   */
  suspended: boolean;
  /**
   * ABSENT means UNKNOWN and never "consumer": the field is empty for an account created before the distinction was recorded, and guessing would guess wrong in the direction that shows a trader a withdrawal right they do not have.
   */
  account_type?: AccountType;
  /**
   * The legal identity on the invoice.
   */
  business?: BusinessDetails;
  /**
   * Newest acceptance of each published document.
   */
  consents: ConsentRecord[];
}

/**
 * Body of `PATCH /v1/accounts/{account_id}` (200 -> [Account]).
 */
export interface UpdateAccountRequest {
  name: string;
  slug: string;
  account_type?: AccountType;
  business?: BusinessDetails;
}

/**
 * 200 from `DELETE /v1/accounts/{account_id}`.
 */
export interface DeleteAccountResponse {
  account_id: string;
  instances_deleted: number;
  members_removed: number;
}























/**
 * Body of `POST /v1/billing/checkout`, and the query of `GET /v1/billing/portal`.
 */
export interface BillingAccountRequest {
  account_id: string;
}

/**
 * 201 from `POST /v1/billing/checkout`.
 */
export interface CheckoutSessionResponse {
  url: string;
}

/**
 * 200 from `GET /v1/billing/portal`.
 */
export interface BillingPortalResponse {
  url: string;
}

/**
 * 200 from `GET /v1/billing/status?account_id=…`.
 */
/**
 * One model's metered usage against its weekly allowance, per `GET /v1/license/usage`.
 */
export interface UsageRow {
  model: string;
  output_tokens: number;
  output_allowance: number;
  input_tokens: number;
  input_allowance: number;
}

/**
 * One paired machine's per-model usage rows.
 */
export interface HostUsage {
  client_id: string;
  models: UsageRow[];
}

/**
 * One model's weekly grant from the plan, carrying no usage of its own.
 */
export interface UsageAllowance {
  model: string;
  output_allowance: number;
  input_allowance: number;
}

/**
 * The account's metered usage surface: totals per model and per paired host, over the trailing week, plus the plan's per-model grants and the moment the next weekly allowance is minted.
 */
export interface Usage {
  window_start: string;
  window_end: string;
  /**
   * How many machines the plan's allowance covers — the account-ceiling basis.
   */
  entitled_hosts: number;
  by_model: UsageRow[];
  by_host: HostUsage[];
  /**
   * The plan's grant per model, present even when `by_model` is empty, so an account that has spent nothing can still be shown its allowance.
   */
  allowances?: UsageAllowance[];
  /**
   * When the next weekly allowance is minted; absent when nothing is waiting to reset.
   */
  next_refill_at?: string;
}

export interface BillingStatus {
  account_id: string;
  /**
   * There is a Customer Portal to open: the account has a Stripe subscription reference.
   */
  can_manage_billing: boolean;
  /**
   * Checkout would open a session rather than refuse.
   */
  can_subscribe: boolean;
  /**
   * Whether the account currently carries the Pro allowance.
   */
  entitled: boolean;
  /**
   * The account is INVOICED rather than sold through checkout: a business registration, or a manual arrangement against an external reference.
   */
  billed_directly: boolean;
  /**
   * Whether THIS request re-read the subscription from Stripe.
   */
  reconciled: boolean;
  subscription_source: SubscriptionSource;
  subscription_state: SubscriptionState;
  checked_at?: string;
}





/**
 * LIVE — an element of `GET /v1/accounts/{account_id}/instances` (200).
 */
export interface Instance {
  id: string;
  account_id: string;
  name: string;
  created_at: string;
  /**
   * Null until the instance has dialed in at least once.
   */
  last_seen_at: string | null;
  /**
   * Non-null once revoked.
   */
  revoked_at: string | null;
  /**
   * Holding a connection to this relay right now.
   */
  connected: boolean;
}

/**
 * LIVE — body of `GET /v1/accounts/{account_id}/instances` (200).
 */
export interface ListInstancesResponse {
  instances: Instance[];
}

/**
 * Query parameters of `GET /v1/accounts/{account_id}/instances`.
 */
export interface ListInstancesParams {
  /**
   * Verbatim from a prior response's `X-Next-Cursor`.
   */
  cursor?: string;
  /**
   * Page size.
   */
  limit?: number;
}

/**
 * One page of `GET /v1/accounts/{account_id}/instances`, as the typed client returns it: the body's array joined to the position the header carried.
 */
export interface InstancePage {
  instances: Instance[];
  nextCursor: string | null;
}

/**
 * LIVE — body of `POST /v1/pair/keys`.
 */
export interface MintKeyRequest {
  account_id: string;
}

/**
 * LIVE — 201 from `POST /v1/pair/keys`.
 */
export interface MintKeyResponse {
  /**
   * Display form, grouped for reading off a screen.
   */
  key: string;
  /**
   * RFC3339.
   */
  expires_at: string;
  /**
   * The same deadline in seconds, for a client that would rather not trust its own clock against the relay's.
   */
  expires_in: number;
}

/**
 * LIVE — 200 from `POST /v1/accounts/{account_id}/instances/{instance_id}/revoke`.
 */
export interface RevokeResponse {
  instance_id: string;
  account_id: string;
  /**
   * The instance was connected at the moment of revocation and its connection was closed.
   */
  dropped: boolean;
}

/**
 * Body of `PATCH /v1/accounts/{account_id}/instances/{instance_id}` (200 -> [Instance]).
 */
export interface UpdateInstanceRequest {
  name: string;
}















/**
 * What posts to the consumer's ingest URL.
 */
export type ConsumerSource = 'generic' | 'form';

/**
 * What each delivered event lands in on the machine: `new` starts a fresh session per event, `reused` delivers every event into one standing session.
 */
export type ConsumerSessionMode = 'new' | 'reused';

/**
 * What a consumer runs per event, as the relay models it: an AGENT the machine declares, or a CHAIN file on its configuration path.
 */
export type ConsumerTargetKind = 'agent' | 'chain';


export const MAX_TARGET_NAME_BYTES = 200;

/**
 * One event consumer, as the listing serves it.
 */
export interface EventConsumer {
  id: string;
  name: string;
  source: ConsumerSource;
  /**
   * The web origins a `form`-source key accepts posts from, echoed NORMALISED — lower-case `scheme://host[:port]`, no path — however they were typed.
   */
  allowed_origins?: string[];
  /**
   * The paired machine that receives each event.
   */
  instance_id: string;
  /**
   * Names a chain file on that machine.
   */
  chain?: string;
  /**
   * Names an agent the machine declares.
   */
  agent_name?: string;
  session_mode: ConsumerSessionMode;
  /**
   * The standing session every event lands in.
   */
  session_name?: string;
  /**
   * Routing rules: event context attribute to glob pattern, every entry of which must match.
   */
  context_filters?: Record<string, string>;
  created_at: string;
}

/**
 * Body of `POST /v1/accounts/{account_id}/consumers` (201 -> [CreateConsumerResponse]).
 */
export interface CreateConsumerRequest {
  name: string;
  source: ConsumerSource;
  /**
   * The web origins allowed to post to a `form`-source key, each `scheme://host[:port]` with no path.
   */
  allowed_origins?: string[];
  instance_id: string;
  /**
   * Give this or `agent_name`, never both and never neither.
   */
  chain?: string;
  /**
   * Give this or `chain`, never both and never neither.
   */
  agent_name?: string;
  session_mode: ConsumerSessionMode;
  /**
   * REQUIRED for session mode `reused` — a standing session is found by name, so one without a name cannot be found — and refused for `new`, which the machine names itself.
   */
  session_name?: string;
  context_filters?: Record<string, string>;
}

/**
 * 201 from `POST /v1/accounts/{account_id}/consumers`.
 */
export interface CreateConsumerResponse extends EventConsumer {
  /**
   * Where deliveries POST, with the token in the path.
   */
  ingest_url: string;
  /**
   * The URL's path token and the HMAC-SHA256 signing key, in one value.
   */
  secret?: string;
}

/**
 * Body of `GET /v1/accounts/{account_id}/consumers` (200).
 */
export interface ListConsumersResponse {
  consumers: EventConsumer[];
}

/**
 * Query parameters of `GET /v1/accounts/{account_id}/consumers`.
 */
export interface ListConsumersParams {
  /**
   * Verbatim from a prior response's `X-Next-Cursor`.
   */
  cursor?: string;
  /**
   * Page size.
   */
  limit?: number;
}

/**
 * One page of the consumer listing, as the typed client returns it: the body's array joined to the position the header carried.
 */
export interface ConsumerPage {
  consumers: EventConsumer[];
  nextCursor: string | null;
}






/**
 * One person on an account.
 */
export interface Member {
  user_id: string;
  email: string;
  display_name: string;
  role: MembershipRole;
  is_active: boolean;
  /**
   * When the MEMBERSHIP was created, not when the identity was.
   */
  joined_at: string;
  /**
   * Null for somebody who has never signed in — an invitation accepted by a person who then stopped.
   */
  last_login_at: string | null;
}

/**
 * 200 from `GET /v1/accounts/{account_id}/members`.
 */
export interface ListMembersResponse {
  members: Member[];
}

/**
 * Body of `PATCH /v1/accounts/{account_id}/members/{user_id}` (200 -> [Member]).
 */
export interface UpdateMemberRoleRequest {
  role: MembershipRole;
}

/**
 * One unspent or spent invitation.
 */
export interface Invite {
  id: string;
  email: string;
  role: MembershipRole;
  /**
   * Who issued it.
   */
  invited_by_user_id: string;
  created_at: string;
  expires_at: string;
  /**
   * When it was spent.
   */
  used_at: string | null;
  delivery: InviteDelivery;
}

/**
 * What became of the message an invitation owes its recipient, folded by the relay from its own mail events (`store.MailDelivery*`).
 */
export type InviteDelivery = 'not_configured' | 'queued' | 'sent' | 'failed';

/**
 * ONE PAGE of `GET /v1/accounts/{account_id}/invites`.
 */
export interface ListInvitesResponse {
  invites: Invite[];
}

/**
 * Query parameters of `GET /v1/accounts/{account_id}/invites`.
 */
export interface ListInvitesParams {
  /**
   * Verbatim from a prior response's `X-Next-Cursor`.
   */
  cursor?: string;
  /**
   * Page size.
   */
  limit?: number;
}

/**
 * One page of the invitation listing, as the typed client returns it: the body's array joined to the position the header carried.
 */
export interface InvitePage {
  invites: Invite[];
  nextCursor: string | null;
}

/**
 * 200 from `GET /v1/invites/preview?token=…` — UNAUTHENTICATED, the one route an invitee can ask before committing an email address.
 */
export interface InvitePreview {
  account_name: string;
  /**
   * The inviter's display name.
   */
  inviter_name?: string;
  role: MembershipRole;
  /**
   * RFC3339.
   */
  expires_at: string;
}

/**
 * Body of `POST /v1/accounts/{account_id}/invites` (201 -> [Invite]).
 */
export interface CreateInviteRequest {
  email: string;
  role?: MembershipRole;
}

/**
 * Body of `POST /v1/invites/accept` — the acceptance an invitee who ALREADY has an identity makes.
 */
export interface AcceptInviteRequest {
  token: string;
}

/**
 * 200 from `POST /v1/invites/accept` — the account just joined.
 */
export interface AcceptInviteResponse {
  account_id: string;
  account_name: string;
  role: MembershipRole;
}





/**
 * An acceptance as the export records it.
 */
export interface ExportConsent {
  document: string;
  version: string;
  accepted_at: string;
}

/**
 * A sign-in mechanism, without any of its secrets.
 */
export interface ExportCredential {
  /**
   * Names the mechanism, e.g. `password`.
   */
  provider: string;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
}

/**
 * A machine as the export records it.
 */
export interface ExportInstance {
  id: string;
  /**
   * The machine's hostname as it proposed it at pairing.
   */
  name: string;
  created_at: string;
  last_seen_at: string | null;
  revoked_at: string | null;
  /**
   * Whether this person is the one who enrolled it.
   */
  paired_by_this_user: boolean;
}

/**
 * One line of an account's control-plane log.
 */
export interface ExportEvent {
  type: string;
  subject: string;
  time: string;
  data: unknown;
}

/**
 * One account the person belongs to, with what it holds.
 */
export interface ExportAccount {
  id: string;
  slug: string;
  name: string;
  role: MembershipRole;
  /**
   * False for a membership that was removed; the row survives for the audit trail.
   */
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

/**
 * The identity itself.
 */
export interface ExportUser {
  id: string;
  email: string;
  display_name: string;
  is_active: boolean;
  /**
   * `none` for everybody but the operator.
   */
  platform_role: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

/**
 * 200 from `GET /v1/auth/me/export` — everything the relay holds about the signed-in person.
 */
export interface ExportResponse {
  /**
   * When the export was assembled, so a person can tell two of them apart.
   */
  generated_at: string;
  user: ExportUser;
  credentials: ExportCredential[];
  /**
   * Every session ever issued to this person: live, expired and revoked.
   */
  sessions: BrowserSession[];
  accounts: ExportAccount[];
}



























/**
 * What one answer says.
 */
export type AskDecision = 'allow' | 'deny' | 'answer';

/**
 * One ask awaiting this caller.
 */
export interface Ask {
  ask_id: string;
  /**
   * The machine holding the run.
   */
  instance_id: string;
  /**
   * What a subscription names.
   */
  agent_name?: string;
  session_id?: string;
  mission_id?: string;
  tools_name?: string;
  tool_name?: string;
  /**
   * The HITL policy envelope that stopped the call, and the rule inside it.
   */
  policy_name?: string;
  matched_rule?: number;
  /**
   * The host's own one-line rendering of what is about to happen.
   */
  summary?: string;
  /**
   * When the host stops waiting, and therefore when the ask is REFUSED: a durable row resolves on its `on_timeout`, which `hitlservice.validatePolicy` refuses to let say allow and which defaults to deny.
   */
  expires_at?: string;
  /**
   * When THIS relay learned of the ask — not when the ask was created.
   */
  received_at: string;
  /**
   * The ask's own N-of-M rule, and the progress against it.
   */
  approvals_required: number;
  approvals_recorded: number;
  /**
   * The least role the ask's envelope accepts, absent when it accepts any member.
   */
  approver_role?: string;
  answered_by_caller: boolean;
  may_answer: boolean;
}

/**
 * 200 from `GET /v1/accounts/{account_id}/asks`.
 */
export interface ListAsksResponse {
  asks: Ask[];
}

/**
 * Body of `POST /v1/accounts/{account_id}/asks/{ask_id}/answer`.
 */
export interface AnswerAskRequest {
  decision: AskDecision;
  answer?: string;
  guidance?: string;
}

/**
 * What answering did.
 */
export type AnswerStatus = 'recorded' | 'settled' | 'already_decided';

export interface AnswerAskResponse {
  ask_id: string;
  status: AnswerStatus;
  /**
   * The decision now standing on the ask.
   */
  decision?: AskDecision;
  approvals_required: number;
  approvals_recorded: number;
}

/**
 * One message on `GET /v1/accounts/{account_id}/asks/stream`.
 */
export interface AskStreamEvent {
  type: 'ask.published' | 'ask.resolved';
  /**
   * The whole card, on `ask.published`.
   */
  ask?: Ask;
  /**
   * Which ask is being retracted, on `ask.resolved`.
   */
  ask_id?: string;
  /**
   * Why it was retracted: `answered`, `expired` or `superseded`.
   */
  reason?: string;
}

/**
 * One of the caller's own ask subscriptions.
 */
export interface AskSubscription {
  /**
   * The subscribed agent, or [ALL_AGENTS] for every one of them.
   */
  agent_name: string;
  created_at: string;
}


export const MAX_SUBSCRIBED_AGENT_BYTES = 256;

/**
 * 200 from both ask-subscription routes — the caller's own list, oldest first.
 */
export interface ListAskSubscriptionsResponse {
  subscriptions: AskSubscription[];
}

/**
 * Body of `PUT /v1/accounts/{account_id}/ask-subscriptions`.
 */
export interface ChangeAskSubscriptionRequest {
  agent_name: string;
  subscribed: boolean;
}

















/**
 * One stored rule.
 */
export interface ApprovalRule {
  /**
   * The agent this rule governs, or [ALL_AGENTS_RULE] for the account's default.
   */
  agent_name: string;
  approvals_required: number;
  /**
   * The least role that may answer, absent when any active member may.
   */
  approver_role?: string;
  updated_at: string;
}

/**
 * 200 from both approval-rule routes — the default first, then the per-agent rules by name.
 */
export interface ListApprovalRulesResponse {
  rules: ApprovalRule[];
  /**
   * The ceiling `approvals_required` is refused above (`store.MaxApprovalsRequired`).
   */
  max_approvals_required: number;
}

/**
 * Body of `PUT /v1/accounts/{account_id}/approval-rules`.
 */
export interface SetApprovalRuleRequest {
  agent_name: string;
  approvals_required?: number;
  approver_role?: string;
  unset?: boolean;
}
