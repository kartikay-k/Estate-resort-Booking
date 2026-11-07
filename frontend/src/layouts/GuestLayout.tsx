import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router'
import { Navbar } from '../components/layout/Navbar'
import { Footer } from '../components/layout/Footer'

/** Scrolls to top whenever the route changes. */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])
  return null
}

/** Shell shared by every page: navbar, routed content, footer. */
export function GuestLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-sand-50 font-sans text-sand-900 antialiased">
      <ScrollToTop />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
