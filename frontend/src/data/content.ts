export interface Villa {
  id: string
  name: string
  category: 'Villa' | 'Suite'
  location: string
  description: string
  image: string
  pricePerNight: number
  rating: number
  reviews: number
  guests: number
  bedrooms: number
  areaSqm: number
  amenities: string[]
}

export interface Experience {
  id: string
  title: string
  tagline: string
  description: string
  image: string
  duration: string
}

export interface EventPackage {
  id: 'weddings' | 'corporate'
  label: string
  title: string
  description: string
  image: string
  imageAlt: string
  stat: { value: string; label: string }
  features: { title: string; detail: string }[]
}

export interface Testimonial {
  id: string
  quote: string
  name: string
  location: string
  avatar: string
  rating: number
  stay: string
}

export const SITE = {
  name: 'EstateStay',
  tagline: 'A coffee-estate resort in Chikkamagaluru, Karnataka',
  phone: '+91 8277 000 000',
  email: 'stay@estatestay.com',
  address: 'Chikkamagaluru, Karnataka, India',
  checkIn: '2:00 PM',
  checkOut: '11:00 AM',
} as const

export const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Villas & Suites', href: '/rooms' },
  { label: 'My Bookings', href: '/my-bookings' },
  { label: 'Experiences', href: '/#experiences' },
  { label: 'Weddings & Events', href: '/#events' },
  { label: 'Stories', href: '/#testimonials' },
  { label: 'Contact', href: '/#contact' },
] as const

export const VILLAS: Villa[] = [
  {
    id: 'planters-suite',
    name: "The Planter's Suite",
    category: 'Suite',
    location: 'EstateStay · Chikkamagaluru',
    description:
      'A cedar-lined suite opening onto the coffee terraces, with a clawfoot tub and a veranda made for slow mornings.',
    image: '/images/villa-planters.webp',
    pricePerNight: 38000,
    rating: 4.9,
    reviews: 86,
    guests: 2,
    bedrooms: 1,
    areaSqm: 65,
    amenities: ['Private veranda', 'Clawfoot tub', 'Estate coffee bar'],
  },
  {
    id: 'cedar-ridge-villa',
    name: 'Cedar Ridge Villa',
    category: 'Villa',
    location: 'EstateStay · Chikkamagaluru',
    description:
      'Our highest villa, wrapped in silver oaks and mist. An infinity pool spills toward the valley and the sunset.',
    image: '/images/villa-cedar-ridge.webp',
    pricePerNight: 72000,
    rating: 4.9,
    reviews: 142,
    guests: 4,
    bedrooms: 2,
    areaSqm: 180,
    amenities: ['Infinity pool', 'Outdoor rain shower', 'Fireplace'],
  },
  {
    id: 'glasshouse-villa',
    name: 'The Glasshouse',
    category: 'Villa',
    location: 'EstateStay · Chikkamagaluru',
    description:
      'A glass-walled retreat for two, suspended over the spice garden. At night, the estate disappears and the stars arrive.',
    image: '/images/villa-glasshouse.webp',
    pricePerNight: 58000,
    rating: 5.0,
    reviews: 54,
    guests: 2,
    bedrooms: 1,
    areaSqm: 120,
    amenities: ['Plunge pool', 'Star deck', 'Butler service'],
  },
]

export const EXPERIENCES: Experience[] = [
  {
    id: 'coffee-rituals',
    title: 'Coffee Rituals',
    tagline: 'From cherry to cup',
    description:
      'A private cupping in the roasting room with our master roaster — the estate, tasted across six harvests.',
    image: '/images/exp-coffee.webp',
    duration: '90 minutes · Daily, 7 AM',
  },
  {
    id: 'wellness-pavilion',
    title: 'The Wellness Pavilion',
    tagline: 'Ayurveda & stillness',
    description:
      'Warm oil, mountain herbs and unhurried hands. Treatments shaped by the plantation’s own gardens.',
    image: '/images/exp-wellness.webp',
    duration: '60–120 minutes · By appointment',
  },
  {
    id: 'trail-of-the-mist',
    title: 'Trail of the Mist',
    tagline: 'Guided estate walks',
    description:
      'Walk the boundary of the estate with our naturalist — cardamom, pepper vines and birdsong at first light.',
    image: '/images/exp-trails.webp',
    duration: '2 hours · Sunrise & dusk',
  },
  {
    id: 'spice-garden-table',
    title: 'Spice Garden Table',
    tagline: 'Farm-to-table dining',
    description:
      'A five-course tasting beneath the pepper vines, built each morning around what the garden gives.',
    image: '/images/exp-dining.webp',
    duration: 'Evenings · Seasonal menu',
  },
]

export const EVENT_PACKAGES: EventPackage[] = [
  {
    id: 'weddings',
    label: 'Weddings',
    title: 'Say yes beneath the silver oaks',
    description:
      'An entire coffee estate, yours for the weekend. Ceremonies on the lawns, receptions beneath the trees, and twelve villas for the people you love.',
    image: '/images/event-wedding.webp',
    imageAlt: 'Elegant wedding tablescape under the trees at EstateStay',
    stat: { value: '250', label: 'guests on the Silver Oak Lawn' },
    features: [
      { title: 'Estate buyout', detail: 'All 12 villas, exclusively yours' },
      { title: 'Bespoke menus', detail: 'Designed with our estate chef' },
      { title: 'Planning team', detail: 'A dedicated coordinator, start to finish' },
      { title: 'Ceremony settings', detail: 'Lawn, roastery and forest clearings' },
    ],
  },
  {
    id: 'corporate',
    label: 'Corporate',
    title: 'Think clearly, four thousand feet up',
    description:
      'Boardrooms with mountain views, fibre-fast connectivity, and afternoons built for walking. Offsites that people remember for years.',
    image: '/images/event-corporate.webp',
    imageAlt: 'Conference and banquet space prepared for a corporate gathering',
    stat: { value: '24', label: 'seats in the Roastery Boardroom' },
    features: [
      { title: 'The Roastery Boardroom', detail: 'Presentation-ready, 24 seats' },
      { title: 'Connectivity', detail: 'High-speed fibre across the estate' },
      { title: 'Team offsites', detail: 'Curated walks, cupping and bonfires' },
      { title: 'Private dining', detail: 'Long-table lunches in the garden' },
    ],
  },
]

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 'ananya-rohan',
    quote:
      'We married under the silver oaks and the estate did the rest — the light, the coffee, the quiet. Our guests still talk about the breakfasts.',
    name: 'Ananya & Rohan',
    location: 'Bengaluru, India',
    avatar: '/images/guest-1.webp',
    rating: 5,
    stay: 'Wedding · Estate buyout',
  },
  {
    id: 'meera',
    quote:
      'The rare place that is even better than the photographs. Our villa smelled of coffee and rain, and the staff remembered how we take our tea by day two.',
    name: 'Meera Krishnan',
    location: 'Chennai, India',
    avatar: '/images/guest-2.webp',
    rating: 5,
    stay: "Cedar Ridge Villa · 4 nights",
  },
  {
    id: 'daniel-elise',
    quote:
      'We came for an anniversary and left with a ritual: coffee on the veranda before the mist lifts. Nothing was rushed. Everything was considered.',
    name: 'Daniel & Elise',
    location: 'London, United Kingdom',
    avatar: '/images/guest-3.webp',
    rating: 5,
    stay: "The Planter's Suite · 5 nights",
  },
  {
    id: 'arjun',
    quote:
      'Our leadership offsite finally felt like one. Mornings in the boardroom, afternoons on the trails, and the best filter coffee any of us have had.',
    name: 'Arjun Mehta',
    location: 'Mumbai, India',
    avatar: '/images/guest-4.webp',
    rating: 5,
    stay: 'Corporate offsite · 30 guests',
  },
]

export const RATING_SUMMARY = {
  score: '4.9',
  label: 'from 1,200+ verified stays',
} as const
