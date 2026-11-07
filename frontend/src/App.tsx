import { RouterProvider } from 'react-router'
import { router } from './router'
import { BookingSearchProvider } from './context/BookingSearchContext'

function App() {
  return <BookingSearchProvider><RouterProvider router={router} /></BookingSearchProvider>
}

export default App
