export function NeedHelpCard() {
  return (
    <div className="bg-white border border-line rounded-card p-5 flex flex-col gap-4">
      <h3 className="font-headline font-semibold text-[15px]">Need help?</h3>
      <div className="flex flex-col gap-4 text-[13.5px]">
        <div>
          <p className="font-medium text-ink mb-1">Can I switch plans anytime?</p>
          <p className="text-slate">Yes, upgrades apply immediately. Downgrades take effect at the end of your billing period.</p>
        </div>
        <div>
          <p className="font-medium text-ink mb-1">What happens if I exceed storage?</p>
          <p className="text-slate">New uploads are blocked until you free up space or upgrade to a larger plan.</p>
        </div>
        <div>
          <p className="font-medium text-ink mb-1">How do I update my payment method?</p>
          <p className="text-slate">Use the "Manage billing" button above to open your Stripe billing portal.</p>
        </div>
      </div>
    </div>
  )
}