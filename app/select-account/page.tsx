'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SelectAccountPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/feed') }, [])
  return null
}
