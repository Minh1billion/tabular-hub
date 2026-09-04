import { cn } from '@/shared/lib/cn'

const FAQ_ITEMS = [
  {
    question: 'Can I switch plans anytime?',
    answer: 'Yes, upgrades apply immediately. Downgrades take effect at the end of your billing period.',
  },
  {
    question: 'What happens if I exceed storage?',
    answer: 'New uploads are blocked until you free up space or upgrade to a larger plan.',
  },
  {
    question: 'How do I update my payment method?',
    answer: 'Use the "Manage billing" button above to open your Stripe billing portal.',
  },
]

export function NeedHelpCard() {
  return (
    <div className="bg-white border-2 border-black rounded-card p-5 flex flex-col gap-4">
      <h3 className="font-headline font-semibold text-[15px]">Need help?</h3>
      <div className="flex flex-col">
        {FAQ_ITEMS.map((item, index) => (
          <div key={item.question} className={cn('flex gap-3 py-3', index > 0 && 'border-t border-line')}>
            <span
              className="w-5 h-5 shrink-0 rounded-full flex items-center justify-center font-mono text-[11px] text-brand-deep"
              style={{ background: 'color-mix(in srgb, var(--brand) 16%, white)' }}
            >
              ?
            </span>
            <div className="text-[13.5px]">
              <p className="font-medium text-ink mb-1">{item.question}</p>
              <p className="text-slate">{item.answer}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}