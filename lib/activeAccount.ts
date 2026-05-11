export function getActiveAccountId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('activeAccountId')
}

export function setActiveAccountId(id: string): void {
  localStorage.setItem('activeAccountId', id)
}

export function clearActiveAccountId(): void {
  localStorage.removeItem('activeAccountId')
}
