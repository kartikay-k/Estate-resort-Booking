import { createBrowserRouter } from 'react-router'
import { lazy, Suspense } from 'react'
import { GuestLayout } from './layouts/GuestLayout'
const HomePage = lazy(() => import('./pages/Home/Home'))
const RoomsPage = lazy(() => import('./pages/Rooms/Rooms'))
const BookingPage = lazy(() => import('./pages/Booking/Booking'))
const MyBookingsPage = lazy(() => import('./pages/Booking/MyBookings'))
const ConfirmationPage = lazy(() => import('./pages/Confirmation/Confirmation'))
const NotFound = lazy(() => import('./pages/NotFound'))
const PrivacyPage = lazy(() => import('./pages/Privacy'))
import { Spinner } from './components/ui'

const AdminPage = lazy(() => import('./pages/Admin/Admin'))
const loading = <div className="flex min-h-[50vh] items-center justify-center bg-sand-50" role="status" aria-label="Loading page"><Spinner className="size-8" /></div>

/** Guest website routes plus the lazy-loaded, role-protected staff console. */
export const router = createBrowserRouter([
  { path: '/admin/*', element: <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-sand-50" role="status" aria-label="Loading staff console"><Spinner className="size-8" /></div>}><AdminPage /></Suspense> },
  {
    path: '/',
    element: <GuestLayout />,
    children: [
      { index: true, element: <Suspense fallback={loading}><HomePage /></Suspense> },
      { path: 'rooms', element: <Suspense fallback={loading}><RoomsPage /></Suspense> },
      { path: 'booking', element: <Suspense fallback={loading}><BookingPage /></Suspense> },
      { path: 'my-bookings', element: <Suspense fallback={loading}><MyBookingsPage /></Suspense> },
      { path: 'confirmation/:id', element: <Suspense fallback={loading}><ConfirmationPage /></Suspense> },
      { path: 'privacy', element: <Suspense fallback={loading}><PrivacyPage /></Suspense> },
      { path: '*', element: <Suspense fallback={loading}><NotFound /></Suspense> },
    ],
  },
])
