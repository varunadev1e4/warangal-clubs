// Sample content used ONLY while Supabase keys are missing,
// so the whole site (including /admin) can be tried straight after `npm run dev`.

const at = (days, h, m = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

export const demoClubs = [
  {
    id: 'c1',
    name: 'Warangal Book Club',
    category: 'Books',
    description: 'One book a month, honest opinions, good chai. Newcomers always welcome.',
    instagram_url: 'https://instagram.com/',
    whatsapp_url: 'https://wa.me/',
    facebook_url: null,
    other_links: [{ label: 'Reddit', url: 'https://reddit.com/' }],
  },
  {
    id: 'c2',
    name: 'Warangal Trek Club',
    category: 'Outdoors',
    description: 'Weekend treks around Warangal and across Telangana, for every fitness level.',
    facebook_url: 'https://facebook.com/',
    instagram_url: 'https://instagram.com/',
    whatsapp_url: null,
  },
  {
    id: 'c3',
    name: 'Warangal Run Club',
    category: 'Fitness',
    description: 'Sunday morning group runs. Bring water and a friend.',
    instagram_url: 'https://instagram.com/',
    whatsapp_url: 'https://wa.me/',
    facebook_url: null,
  },
]

export const demoMessages = [
  {
    id: 'm1',
    name: 'Anjali',
    contact: '9876543210',
    message:
      'Hi! We run a weekend pottery group in Hanamkonda. Could you list us under Arts? We meet every Saturday at 4 pm.',
    is_read: false,
    created_at: new Date(Date.now() - 3 * 3600e3).toISOString(),
  },
]

export const demoEvents = [
  {
    id: 'e1',
    title: 'Sunday long run, Kakatiya Musical Garden',
    description: '5 km, 8 km and 10 km groups. Warm-up at 6 sharp.',
    location: 'Kakatiya Musical Garden',
    link: null,
    starts_at: at(1, 6),
    club_id: 'c3',
  },
  {
    id: 'e2',
    title: 'Book swap and discussion',
    description: 'Bring a book you loved, leave with one you will.',
    location: 'Hanamkonda',
    link: null,
    starts_at: at(4, 17, 30),
    club_id: 'c1',
  },
  {
    id: 'e3',
    title: 'Pakhal Lake day trek',
    description: 'Leaving at 5 am by shared vehicles. Limited seats.',
    location: 'Meet at Hanamkonda bus stand',
    link: null,
    starts_at: at(6, 5),
    club_id: 'c2',
  },
  {
    id: 'e4',
    title: 'Kakatiya heritage walk',
    description: 'A guided walk through the fort, open to all.',
    location: 'Warangal Fort',
    link: null,
    starts_at: at(13, 7),
    club_id: null,
  },
]
