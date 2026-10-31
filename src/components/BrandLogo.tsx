import { cn } from '../lib/cn'

type BrandLogoProps = {
  theme: 'dark' | 'light'
  className?: string
  markOnly?: boolean
}

/** The supplied artwork contains both theme variants as a transparent two-panel sprite. */
export function BrandLogo({ theme, className, markOnly = false }: BrandLogoProps) {
  const backgroundPosition = markOnly
    ? theme === 'dark' ? '63.8% 50%' : '5.2% 50%'
    : theme === 'dark' ? 'right center' : 'left center'

  return <span
    role="img"
    aria-label="SiteCore"
    className={cn('block shrink-0 bg-no-repeat', className)}
    style={{
      backgroundImage: "url('/sitecore-logo-transparent.png')",
      backgroundPosition,
      backgroundSize: markOnly ? '700% auto' : '200% auto',
    }}
  />
}
