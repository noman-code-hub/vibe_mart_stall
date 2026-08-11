import marketHero from '../../assets/5 MARKET.png'

/**
 * Marketplace entrance banner — large hero with Vibe Mart splash.
 */
export default function MarketBanner({
  kicker = '',
  title,
  subtitle,
  variant = 'default',
}) {
  if (variant === 'hero') {
    return (
      <header className="vm-market-hero" style={{ '--vm-market-hero-mark': `url(${marketHero})` }}>
        <div className="vm-market-hero__wash" aria-hidden="true" />
        <div className="vm-market-hero__inner">
          <div className="vm-market-hero__splash">
            <img className="vm-market-hero__mark" src={marketHero} alt="" />
            <p className="vm-market-hero__brand">Vibe Mart</p>
          </div>
          {kicker ? <p className="vm-market-hero__kicker">{kicker}</p> : null}
          <h1 className="vm-market-hero__title">{title}</h1>
          {subtitle ? <p className="vm-market-hero__subtitle">{subtitle}</p> : null}
        </div>
      </header>
    )
  }

  return (
    <header className="vm-market-banner vm-market-banner--entrance">
      {kicker ? <p className="vm-market-banner__kicker">{kicker}</p> : null}
      <h1>{title}</h1>
      {subtitle ? <p className="vm-market-banner__subtitle">{subtitle}</p> : null}
    </header>
  )
}
