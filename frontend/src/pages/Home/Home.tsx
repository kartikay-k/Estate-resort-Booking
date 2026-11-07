import { Hero } from '../../components/site/Hero'
import { FeaturedVillas } from '../../components/site/FeaturedVillas'
import { Experiences } from '../../components/site/Experiences'
import { Events } from '../../components/site/Events'
import { Testimonials } from '../../components/site/Testimonials'
import { EnquirySection } from '../../components/site/EnquirySection'

/**
 * Guest-facing EstateStay home page.
 * Section order: cinematic hero + booking → villas → experiences →
 * weddings & events → guest stories. The footer lives in AppLayout.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <FeaturedVillas />
      <Experiences />
      <Events />
      <Testimonials />
      <EnquirySection />
    </>
  )
}
