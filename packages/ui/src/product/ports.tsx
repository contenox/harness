import { createContext, useContext, type ReactNode } from 'react';
import type {
  Account,
  AccountMembership,
  BillingStatus,
  BrowserSession,
  ChangePasswordRequest,
  CreateConsumerRequest,
  CreateConsumerResponse,
  CreateInviteRequest,
  DeleteAccountResponse,
  DeleteMeResponse,
  EventConsumer,
  ExportResponse,
  AcceptInviteRequest,
  AcceptInviteResponse,
  AnswerAskRequest,
  AnswerAskResponse,
  Ask,
  AskSubscription,
  ChangeAskSubscriptionRequest,
  Instance,
  Invite,
  InvitePreview,
  ListApprovalRulesResponse,
  ListAskSubscriptionsResponse,
  LoginRequest,
  Member,
  MembershipRole,
  MintKeyResponse,
  OwnedAccounts,
  ResetConfirmRequest,
  ResetRequestRequest,
  SetApprovalRuleRequest,
  SessionResponse,
  SignupRequest,
  SignupResponse,
  UpdateAccountRequest,
  UpdateMeRequest,
  Usage,
  User,
} from './lib/api/types';
import type { AskBoard } from './lib/asks';

export interface ProductRoutes {
  signIn: string;
  signUp: string;
  forgotPassword: string;
  resetPassword: string;
  asks: string;
  askSubscriptions: string;
  approvalRules: string;
  session: string;
  hosts: string;
  host: (instanceID: string) => string;
  account: string;
  profile: string;
  accountDetails: string;
  accountSessions: string;
  team: string;
  consumers: string;
  accountData: string;
  legalTerms: string;
  legalPrivacy: string;
  legalWithdrawal: string;
  legalImprint: string;
  askAgent: (agentName: string) => string;
  askHost: (instanceID: string) => string;
}

export interface ProductMutation<TInput = void, TOutput = unknown> {
  mutate: (
    ...args: [TInput] extends [void]
      ? [input?: TInput, options?: { onSuccess?: (output: TOutput) => void }]
      : [input: TInput, options?: { onSuccess?: (output: TOutput) => void }]
  ) => void;
  isPending: boolean;
  error: Error | null;
  data?: TOutput;
  isSuccess?: boolean;
  reset?: () => void;
}

export interface ProductQuery<T> {
  data: T | undefined;
  isPending: boolean;
  isFetching: boolean;
  error: Error | null;
  isError?: boolean;
  refetch: () => unknown;
}

export interface ProductAuth {
  user: User | undefined;
  accounts: AccountMembership[];
  accountID: string | null;
  isLoading: boolean;
}

export interface ProductAskState {
  board: AskBoard;
  waiting: Ask[];
  stream: 'connecting' | 'live' | 'reconnecting';
  isPending: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => unknown;
  recordAnswer: (response: AnswerAskResponse) => void;
}

export interface ProductPorts {
  routes: ProductRoutes;
  useAuth: () => ProductAuth;
  useSwitchAccount: () => (accountID: string) => void;
  useAccount: (accountID: string) => ProductQuery<Account>;
  useOpenBillingPortal: (accountID: string) => ProductMutation<void>;
  useSignOut: () => ProductMutation<void>;
  useSignIn: () => ProductMutation<LoginRequest, SessionResponse>;
  useSignUp: () => ProductMutation<SignupRequest, SignupResponse>;
  useAcceptInvite: () => ProductMutation<AcceptInviteRequest, AcceptInviteResponse>;
  useRequestPasswordReset: () => ProductMutation<ResetRequestRequest, void>;
  useConfirmPasswordReset: () => ProductMutation<ResetConfirmRequest, void>;
  useInvitePreview: (token: string) => ProductQuery<InvitePreview>;
  useSwapAuthGate: () => () => void;
  authLegal: {
    termsVersion: string;
    privacyVersion: string;
    withdrawalWaiverVersion: string;
    termsURL: string;
    privacyURL: string;
    withdrawalURL: string;
    acceptDocumentsLabel: string;
    withdrawalWaiverLabel: string;
    withdrawalVersionLabel: string;
    contactPendingNotice: string;
  };
  useCreateAccount: () => ProductMutation<{ name: string }>;
  useUpdateAccount: (accountID: string) => ProductMutation<UpdateAccountRequest>;
  useDeleteAccount: (accountID: string) => ProductMutation<void, DeleteAccountResponse>;
  useBillingStatus: (accountID: string) => ProductQuery<BillingStatus>;
  useOwnedAccounts: () => ProductQuery<OwnedAccounts>;
  useStartCheckout: (accountID: string) => ProductMutation<void, string>;
  useUsage: (accountID: string) => ProductQuery<Usage>;
  useUpdateMe: () => ProductMutation<UpdateMeRequest>;
  useChangePassword: () => ProductMutation<ChangePasswordRequest>;
  useDeleteMe: () => ProductMutation<void, DeleteMeResponse>;
  useExportMyData: () => ProductMutation<void, ExportResponse>;
  useBrowserSessions: () => ProductQuery<BrowserSession[]>;
  useRevokeSession: () => ProductMutation<string>;
  useRevokeOtherSessions: () => ProductMutation<void>;
  useConsumers: (accountID: string) => ProductQuery<EventConsumer[]>;
  useCreateConsumer: (
    accountID: string,
  ) => ProductMutation<CreateConsumerRequest, CreateConsumerResponse>;
  useDeleteConsumer: (accountID: string) => ProductMutation<string>;
  useMembers: (accountID: string) => ProductQuery<Member[]>;
  useInvites: (accountID: string) => ProductQuery<Invite[]>;
  useCreateInvite: (accountID: string) => ProductMutation<CreateInviteRequest, Invite>;
  useRevokeInvite: (accountID: string) => ProductMutation<string>;
  useUpdateMemberRole: (
    accountID: string,
  ) => ProductMutation<{ userID: string; role: MembershipRole }>;
  useRemoveMember: (accountID: string) => ProductMutation<string>;
  useAskBoard: () => ProductAskState;
  useAnswerAsk: (
    accountID: string,
  ) => ProductMutation<{ askID: string; body: AnswerAskRequest }, AnswerAskResponse>;
  useHosts: (accountID: string) => ProductQuery<Instance[]>;
  useMintPairingKey: (accountID: string) => ProductMutation<void, MintKeyResponse>;
  useRevokeHost: (accountID: string) => ProductMutation<string>;
  useRenameHost: (accountID: string) => ProductMutation<{ instanceID: string; name: string }>;
  useAskSubscriptions: (accountID: string) => ProductQuery<AskSubscription[]>;
  useChangeAskSubscription: (
    accountID: string,
  ) => ProductMutation<ChangeAskSubscriptionRequest, ListAskSubscriptionsResponse>;
  useApprovalRules: (accountID: string) => ProductQuery<ListApprovalRulesResponse>;
  useSetApprovalRule: (
    accountID: string,
  ) => ProductMutation<SetApprovalRuleRequest, ListApprovalRulesResponse>;
  refusalSell: (error: unknown) => {
    message: string | null;
    cta: { label: string; href: string };
  } | null;
  commerce: {
    contactMailto: string;
    proPriceLabel: string;
  };
}

const ProductPortsContext = createContext<ProductPorts | null>(null);

export function ProductPortsProvider({
  ports,
  children,
}: {
  ports: ProductPorts;
  children: ReactNode;
}) {
  return <ProductPortsContext.Provider value={ports}>{children}</ProductPortsContext.Provider>;
}

export function useProductPorts(): ProductPorts {
  const ports = useContext(ProductPortsContext);
  if (ports === null) throw new Error('ProductPortsProvider is required');
  return ports;
}
