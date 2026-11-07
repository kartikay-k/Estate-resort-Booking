import { Container } from '../components/ui'

export default function NotFound() {
  return (
    <Container className="flex flex-col items-center justify-center py-32 text-center">
      <p className="font-display text-[7rem] leading-none font-semibold text-brand-200">
        404
      </p>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-brand-900">
        This residence doesn't exist — yet
      </h1>
      <p className="mt-3 max-w-md text-sand-600">
        The page you're looking for was moved, renamed, or isn't part of the
        estate.
      </p>
      <a
        href="/"
        className="mt-8 inline-flex h-11 items-center rounded-full bg-brand-700 px-6 text-sm font-medium text-sand-50 transition-colors duration-200 hover:bg-brand-800"
      >
        Back to the estate
      </a>
    </Container>
  )
}
