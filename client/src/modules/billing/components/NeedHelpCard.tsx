import { ChevronIcon } from '@/shared/components/ui/icons'

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
    <div className="panel faq">
      <div className="faq-head">
        <h3>Need help?</h3>
      </div>
      {FAQ_ITEMS.map((item, index) => (
        <details key={item.question} open={index === 0}>
          <summary>
            {item.question}
            <ChevronIcon />
          </summary>
          <p>{item.answer}</p>
        </details>
      ))}
    </div>
  )
}
