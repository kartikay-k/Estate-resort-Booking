import { ArrowUpRight, Clock } from 'lucide-react'
import { useNavigate } from 'react-router'
import { FadeIn } from '../motion/FadeIn'
import { Button, Container, SectionHeading } from '../ui'
import { EXPERIENCES } from '../../data/content'

/** Resort experiences — staggered editorial gallery on a dark evergreen band. */
export function Experiences() {
  const navigate = useNavigate()
  return (
    <section
      id="experiences"
      className="scroll-mt-24 overflow-hidden bg-brand-950 py-24 text-sand-50 lg:py-32"
    >
      <Container>
        <FadeIn>
          <SectionHeading
            tone="light"
            eyebrow="The estate, experienced"
            title="Days shaped by coffee, mist and the garden"
            description="Nothing is compulsory; everything is possible. Our concierge arranges each day around your pace — a cupping at dawn, a treatment before lunch, a table under the pepper vines at dusk."
            actions={
              <Button variant="outlineLight" trailing={<ArrowUpRight className="size-4" />} onClick={() => navigate('/booking')}>
                Plan your days
              </Button>
            }
          />
        </FadeIn>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {EXPERIENCES.map((experience, index) => (
            <FadeIn
              key={experience.id}
              delay={index * 0.08}
              className={index % 2 === 1 ? 'lg:mt-12' : ''}
            >
              <article className="group relative overflow-hidden rounded-[24px]">
                <div className="relative aspect-[3/4]">
                  <img
                    src={experience.image}
                    alt={`${experience.title} at EstateStay`}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 size-full object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/30 to-brand-950/10"
                    aria-hidden="true"
                  />

                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <p className="text-[0.6rem] tracking-[0.22em] text-gold-300 uppercase">
                      0{index + 1} · {experience.tagline}
                    </p>
                    <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-sand-50">
                      {experience.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-sand-300/85">
                      {experience.description}
                    </p>

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/15 pt-3 text-[0.62rem] tracking-[0.1em] text-sand-400 uppercase">
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-3 text-gold-400" aria-hidden="true" />
                        {experience.duration}
                      </span>
                      <ArrowUpRight
                        className="size-4 shrink-0 text-gold-300 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </div>
              </article>
            </FadeIn>
          ))}
        </div>
      </Container>
    </section>
  )
}
