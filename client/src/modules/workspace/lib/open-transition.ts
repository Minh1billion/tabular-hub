let running = false

const FLY_MS = 560

export function openWithTransition(card: HTMLElement, go: () => void) {
  if (running) return
  if (!card.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    go()
    return
  }
  running = true

  const rect = card.getBoundingClientRect()
  const fromBg = getComputedStyle(card).backgroundColor
  const toBg = getComputedStyle(document.documentElement).getPropertyValue('--cream').trim() || '#f4f4ee'

  const clone = card.cloneNode(true) as HTMLElement
  clone.classList.remove('flash', 'deleting')
  clone.removeAttribute('role')
  clone.removeAttribute('tabindex')
  Object.assign(clone.style, {
    position: 'fixed',
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: '0',
    zIndex: '200',
    pointerEvents: 'none',
    transition: 'none',
    transformOrigin: 'center',
    willChange: 'transform',
  })
  document.body.appendChild(clone)
  card.style.visibility = 'hidden'

  const dx = window.innerWidth / 2 - (rect.left + rect.width / 2)
  const dy = window.innerHeight / 2 - (rect.top + rect.height / 2)
  const scale = Math.max(window.innerWidth / rect.width, window.innerHeight / rect.height) * 1.08

  Array.from(clone.children).forEach((child) => {
    child.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, delay: 120, fill: 'forwards' })
  })

  const fly = clone.animate(
    [
      { transform: 'translate(0, 0) rotate(0deg) scale(1)', backgroundColor: fromBg, offset: 0 },
      { transform: 'translate(0, 0) rotate(-6deg) scale(1.08)', backgroundColor: fromBg, offset: 0.3 },
      { transform: `translate(${dx}px, ${dy}px) rotate(0deg) scale(${scale})`, backgroundColor: toBg, offset: 1 },
    ],
    { duration: FLY_MS, easing: 'cubic-bezier(0.65, 0, 0.25, 1)', fill: 'forwards' },
  )

  const timer = window.setTimeout(go, FLY_MS * 0.7)

  fly.finished
    .then(() => clone.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' }).finished)
    .catch(() => {
      window.clearTimeout(timer)
      card.style.visibility = ''
    })
    .finally(() => {
      clone.remove()
      running = false
    })
}
