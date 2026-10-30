import { H1, P } from '@contenox/ui';
import logoMarkLightUrl from '../../assets/logo-mark-light.svg?url';
import logoMarkDarkUrl from '../../assets/logo-mark.svg?url';
import { useTheme } from '../../lib/ThemeProvider';

type Props = {
  title: string;
  subtitle?: string;
};

/** Logo, heading and one line of text at the top of the sign-in column. */
export function SignInHero({ title, subtitle }: Props) {
  const { theme } = useTheme();
  const logoUrl = theme === 'dark' ? logoMarkDarkUrl : logoMarkLightUrl;
  return (
    <>
      <img src={logoUrl} alt="" aria-hidden className="size-12" />
      <hgroup className="flex flex-col items-center gap-2 text-center">
        <H1 variant="page">{title}</H1>
        {subtitle && <P variant="muted">{subtitle}</P>}
      </hgroup>
    </>
  );
}
