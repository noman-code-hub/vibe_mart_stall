import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useRuntimeConfig } from '../context/RuntimeConfigContext.jsx'
import footerBg from '../assets/d8770035-4dca-4c22-aef3-f2d92299155f.png'
import headerBg from '../assets/399f487b-9e42-4393-8c24-72bf2418072d.png'
import brandLogo from '../assets/96b97ec6-2221-44b3-b791-966c3b89491c.png'
import iconHome from '../assets/1 HOME.png'
import iconVibes from '../assets/2 VIBES.png'
import iconSell from '../assets/3 SELL.png'
import iconAccount from '../assets/4 ACCOUNT.png'
import iconMarket from '../assets/5 MARKET.png'
import iconLogin from '../assets/6 LOGIN.png'
import iconCart from '../assets/7 MY CART.png'
import iconContact from '../assets/8 CONTACT.png'
import iconLogout from '../assets/LOG OUT.png'
import './MainLayout.css'

const NAV = [
  { to: '/', label: 'Home', end: true, icon: iconHome },
  { to: '/our-vibes', label: 'Our Vibes', icon: iconVibes },
  { to: '/sell-smart', label: 'Sell Smart', icon: iconSell },
  { to: '/my-account', label: 'My Account', icon: iconAccount, auth: 'in' },
  { to: '/market', label: 'Market', icon: iconMarket },
  { to: '/login', label: 'Log In', icon: iconLogin, auth: 'out' },
  { to: '/my-trolley', label: 'My Trolley', icon: iconCart },
  { to: '/contact', label: 'Contact', icon: iconContact },
]

const FOOTER_EXPLORE = [
  { to: '/', label: 'Home', end: true },
  { to: '/our-vibes', label: 'Our Vibes' },
  { to: '/market', label: 'Market' },
  { to: '/contact', label: 'Contact' },
]

const FOOTER_TRADE = [
  { to: '/sell-smart', label: 'Sell Smart' },
  { to: '/my-account', label: 'My Account' },
  { to: '/my-trolley', label: 'My Trolley' },
]

export default function MainLayout() {
  const { siteName } = useRuntimeConfig()
  const { isAuthenticated, loading, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const wideMain =
    location.pathname.startsWith('/market') ||
    location.pathname.startsWith('/sell-smart') ||
    location.pathname.startsWith('/our-vibes') ||
    location.pathname.startsWith('/contact') ||
    location.pathname.startsWith('/my-trolley') ||
    location.pathname.startsWith('/my-account') ||
    location.pathname.startsWith('/register') ||
    location.pathname.startsWith('/forgot-password') ||
    location.pathname.startsWith('/reset-password') ||
    location.pathname.startsWith('/home') ||
    location.pathname === '/' ||
    location.pathname === ''
  const accountTab = new URLSearchParams(location.search).get('tab')
  const folderOnly =
    location.pathname.startsWith('/my-account') && accountTab === 'stalls'
  // Dashboard is the default My Account tab (including bare /my-account).
  const dashboardOnly =
    location.pathname.startsWith('/my-account') && !folderOnly
  const marketOnly =
    location.pathname === '/market' || location.pathname === '/market/'
  const trolleyOnly =
    location.pathname === '/my-trolley' || location.pathname === '/my-trolley/'
  const homeOnly =
    location.pathname === '/' ||
    location.pathname === '' ||
    location.pathname === '/home' ||
    location.pathname === '/home/'
  const loginOnly =
    location.pathname === '/login' || location.pathname === '/login/'
  const registerOnly =
    location.pathname === '/register' || location.pathname === '/register/'
  const resetOnly =
    location.pathname.startsWith('/forgot-password') ||
    location.pathname.startsWith('/reset-password')
  const contactOnly =
    location.pathname === '/contact' || location.pathname === '/contact/'
  const vibesOnly =
    location.pathname === '/our-vibes' || location.pathname === '/our-vibes/'
  const year = new Date().getFullYear()

  const navItems = NAV.filter((item) => {
    if (loading) return !item.auth
    if (item.auth === 'in') return isAuthenticated
    if (item.auth === 'out') return !isAuthenticated
    return true
  })

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const onLogout = async () => {
    setMenuOpen(false)
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <div className={`vm-shell${menuOpen ? ' is-open' : ''}${dashboardOnly ? ' vm-shell--dashboard' : ''}${folderOnly ? ' vm-shell--folder' : ''}${marketOnly ? ' vm-shell--market' : ''}${trolleyOnly ? ' vm-shell--trolley' : ''}${homeOnly ? ' vm-shell--home' : ''}${loginOnly ? ' vm-shell--login' : ''}${registerOnly ? ' vm-shell--register' : ''}${resetOnly ? ' vm-shell--reset' : ''}${contactOnly ? ' vm-shell--contact' : ''}${vibesOnly ? ' vm-shell--vibes' : ''}`}>
      <header
        className={`vm-header${menuOpen ? ' is-open' : ''}`}
        style={{ '--vm-header-bg': `url(${headerBg})` }}
      >
        {menuOpen ? (
          <button
            type="button"
            className="vm-menu-backdrop"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
        ) : null}
        <div className={`vm-header__inner${menuOpen ? ' is-open' : ''}`}>
          <NavLink to="/" className="vm-logo" end aria-label={siteName}>
            <img
              className="vm-logo__img"
              src={brandLogo}
              alt={siteName}
              draggable={false}
            />
          </NavLink>
          <button
            type="button"
            className={`vm-menu-toggle${menuOpen ? ' is-open' : ''}`}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="vm-primary-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="vm-menu-toggle__bar" />
            <span className="vm-menu-toggle__bar" />
            <span className="vm-menu-toggle__bar" />
          </button>
          <nav
            id="vm-primary-nav"
            className={`vm-nav${menuOpen ? ' is-open' : ''}`}
            aria-label="Primary"
          >
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className="vm-nav__icon-link"
                aria-label={item.label}
              >
                <img
                  className="vm-nav__icon"
                  src={item.icon}
                  alt=""
                  draggable={false}
                />
                <span className="vm-nav__label">{item.label}</span>
              </NavLink>
            ))}
            {!loading && isAuthenticated ? (
              <button
                type="button"
                className="vm-nav__icon-link vm-nav__logout"
                aria-label="Log out"
                onClick={onLogout}
              >
                <img
                  className="vm-nav__icon"
                  src={iconLogout}
                  alt=""
                  draggable={false}
                />
                <span className="vm-nav__label">Log out</span>
              </button>
            ) : null}
          </nav>
        </div>
      </header>

      <main
        className={`vm-main${wideMain ? ' vm-main--wide' : ''}${dashboardOnly ? ' vm-main--dashboard' : ''}${folderOnly ? ' vm-main--folder' : ''}${marketOnly ? ' vm-main--market' : ''}${trolleyOnly ? ' vm-main--trolley' : ''}${homeOnly ? ' vm-main--home' : ''}${loginOnly ? ' vm-main--login' : ''}${registerOnly ? ' vm-main--register' : ''}${resetOnly ? ' vm-main--reset' : ''}${contactOnly ? ' vm-main--contact' : ''}${vibesOnly ? ' vm-main--vibes' : ''}`}
      >
        <Outlet />
      </main>

      <footer
        className="vm-footer"
        style={{ '--vm-footer-bg': `url(${footerBg})` }}
      >
        <div className="vm-footer__inner">
          <div className="vm-footer__top">
            <NavLink to="/" className="vm-footer__logo" aria-label={siteName}>
              <img
                className="vm-footer__logo-img"
                src={brandLogo}
                alt={siteName}
                draggable={false}
              />
            </NavLink>
            <nav className="vm-footer__nav" aria-label="Footer">
              {FOOTER_EXPLORE.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className="vm-footer__link">
                  {item.label}
                </NavLink>
              ))}
              {FOOTER_TRADE.map((item) => (
                <NavLink key={item.to} to={item.to} className="vm-footer__link">
                  {item.label}
                </NavLink>
              ))}
              {!isAuthenticated && (
                <NavLink to="/register" className="vm-footer__link">
                  Register
                </NavLink>
              )}
            </nav>
          </div>
          <div className="vm-footer__bar">
            <p className="vm-footer__copy">
              © {year} {siteName}. Market stalls, made personal.
            </p>
            <p className="vm-footer__meta">Built for traders · Powered by WordPress</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
