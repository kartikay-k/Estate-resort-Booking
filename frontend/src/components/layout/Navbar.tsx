import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, Phone, ShieldCheck, X } from 'lucide-react'
import { Button, Container, Logo } from '../ui'
import { NAV_LINKS, SITE } from '../../data/content'
import { cn } from '../../lib/utils'

const scrollTo = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

/**
 * Premium navigation — transparent over the cinematic hero, then
 * cream/blurred once the guest scrolls. Full-screen mobile menu with
 * staggered links, body-scroll lock and Escape support.
 */
export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const onDark = open || (isHome && !scrolled)
  const solid = !open && (scrolled || !isHome)

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-all duration-500',
          open
            ? 'bg-brand-950'
            : solid
              ? 'border-b border-sand-200/70 bg-sand-50/90 shadow-[0_10px_30px_-24px_rgba(13,32,24,0.5)] backdrop-blur-xl'
              : 'bg-transparent',
        )}
      >
        <Container className="flex h-20 items-center justify-between gap-6">
          <Link to="/" aria-label="EstateStay home" className="shrink-0">
            <Logo tone={onDark ? 'light' : 'dark'} />
          </Link>

          {/* Desktop links */}
          <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className={cn(
                  'group relative py-2 text-[0.82rem] font-medium tracking-wide transition-colors duration-300',
                  onDark
                    ? 'text-sand-200/90 hover:text-white'
                    : 'text-sand-700 hover:text-brand-900',
                )}
              >
                {link.label}
                <span
                  className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-gold-400 transition-transform duration-300 group-hover:scale-x-100"
                  aria-hidden="true"
                />
              </a>
            ))}
          </nav>

          {/* Desktop actions + mobile toggle */}
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-4 md:flex">
              <a
                href={`tel:${SITE.phone.replace(/\s/g, '')}`}
                className={cn(
                  'hidden items-center gap-2 text-xs tracking-wide transition-colors duration-300 xl:flex',
                  onDark
                    ? 'text-sand-300 hover:text-gold-300'
                    : 'text-sand-600 hover:text-brand-800',
                )}
              >
                <Phone className="size-3.5" aria-hidden="true" />
                {SITE.phone}
              </a>
              <Link
                to="/admin"
                className={cn(
                  'inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
                  onDark
                    ? 'border-white/25 text-sand-100 hover:border-gold-300 hover:text-gold-200'
                    : 'border-sand-300 text-brand-800 hover:border-brand-600 hover:bg-brand-50',
                )}
              >
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                Admin
              </Link>
              <Button
                variant={onDark ? 'accent' : 'primary'}
                size="sm"
                onClick={() => scrollTo('booking')}
              >
                Reserve
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'lg:hidden',
                onDark && 'text-sand-50 hover:bg-white/10 active:bg-white/15',
              )}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </Container>
      </header>

      {/* Full-screen mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 flex flex-col bg-brand-950 lg:hidden"
          >
            <div className="flex h-full flex-col overflow-y-auto px-6 pt-28 pb-10 sm:px-10">
              <nav aria-label="Mobile" className="flex flex-col">
                {NAV_LINKS.map((link, index) => (
                  <motion.a
                    key={link.label}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.08 + index * 0.06,
                      duration: 0.45,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="flex items-center justify-between border-b border-white/10 py-5 font-display text-3xl font-semibold tracking-tight text-sand-50"
                  >
                    {link.label}
                    <span className="font-sans text-xs text-gold-300/60">
                      0{index + 1}
                    </span>
                  </motion.a>
                ))}
              </nav>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="mt-auto pt-10"
              >
                <p className="text-[0.6rem] font-semibold tracking-[0.28em] text-sand-500 uppercase">
                  Reservations
                </p>
                <a
                  href={`tel:${SITE.phone.replace(/\s/g, '')}`}
                  className="mt-2 flex items-center gap-2 text-lg text-sand-100"
                >
                  <Phone className="size-4 text-gold-400" aria-hidden="true" />
                  {SITE.phone}
                </a>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-sand-400">
                  {SITE.address}
                </p>
                <Link
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/20 px-5 text-sm font-medium text-sand-100 transition hover:border-gold-300 hover:text-gold-200"
                >
                  <ShieldCheck className="size-4" aria-hidden="true" />
                  Admin / staff sign in
                </Link>
                <Button
                  variant="accent"
                  className="mt-3 w-full"
                  onClick={() => {
                    setOpen(false)
                    window.setTimeout(() => scrollTo('booking'), 80)
                  }}
                >
                  Reserve your stay
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
