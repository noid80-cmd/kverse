'use client'

import BottomNav from './BottomNav'

const agencyNav = [
  { href: '/agency/discover', label: '탐색', icon: '🔍' },
  { href: '/agency/talents', label: '관심', icon: '⭐' },
  { href: '/agency/contacts', label: '연락', icon: '💌' },
]

export default function AgencyNav() {
  return <BottomNav items={agencyNav} />
}
