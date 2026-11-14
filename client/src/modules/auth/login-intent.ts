const KEY = 'tabular-hub:login-intent'

export function markLoginIntent(): void {
  try {
    sessionStorage.setItem(KEY, '1')
  } catch {
  }
}

export function consumeLoginIntent(): boolean {
  try {
    const had = sessionStorage.getItem(KEY) === '1'
    if (had) sessionStorage.removeItem(KEY)
    return had
  } catch {
    return false
  }
}
