import { AuthLink, AuthScreen, ProductIntro } from '../auth/AuthScreen';
import { Button, Card, InlineNotice, Small } from '@contenox/ui';
import type { ProductMutation, ProductQuery } from '../../ports';
import type { TenantInvite, TenantMembership } from './TenantScreens';
import { ScreenError, ScreenLoading } from '../ScreenState';

export function AcceptTenantInviteScreen({ token, signedIn, preview, accept, signInURL, signUpURL, legalLinks }: { token: string; signedIn: boolean; preview: ProductQuery<TenantInvite>; accept: ProductMutation<string, TenantMembership>; signInURL: string; signUpURL: string; legalLinks?: { to: string; label: string }[] }) {
  if (token === '') return <AuthScreen legalLinks={legalLinks}><InlineNotice variant="error">This invitation link is missing its token.</InlineNotice></AuthScreen>;
  if (preview.isPending) return <AuthScreen legalLinks={legalLinks} intro={<ProductIntro />}><ScreenLoading label="Checking the invitation" /></AuthScreen>;
  if (preview.error) return <AuthScreen legalLinks={legalLinks}><ScreenError error={preview.error} onRetry={() => void preview.refetch()} retrying={preview.isFetching} /></AuthScreen>;
  if (!signedIn) return <AuthScreen legalLinks={legalLinks} intro={<ProductIntro />} footer={<><AuthLink to={signInURL}>Sign in</AuthLink><AuthLink to={signUpURL}>Create an account</AuthLink></>}><Card><Small>{preview.data?.email} was invited to join workspace {preview.data?.accountID} as {preview.data?.role}.</Small></Card></AuthScreen>;
  return <AuthScreen legalLinks={legalLinks} intro={<ProductIntro />}><Card className="space-y-4"><Small>Join workspace {preview.data?.accountID} as {preview.data?.role}.</Small>{accept.error && <ScreenError error={accept.error} />}<Button disabled={accept.isPending} onClick={() => accept.mutate(token)}>{accept.isPending ? 'Joining…' : 'Accept invitation'}</Button></Card></AuthScreen>;
}
