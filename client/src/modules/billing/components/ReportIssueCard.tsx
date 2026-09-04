const TABULAR_MANNER_ISSUES_URL = 'https://github.com/Minh1billion/tabular-manner/issues'

export function ReportIssueCard() {
  return (
    <div className="bg-white border border-line rounded-card p-5 flex flex-col gap-2">
      <h3 className="font-headline font-semibold text-[15px]">Still have a question or complaint?</h3>
      <p className="text-[13.5px] text-slate">
        Open an issue on the Tabular Manner repo and we'll get back to you.
      </p>
      <a
        href={TABULAR_MANNER_ISSUES_URL}
        target="_blank"
        rel="noreferrer"
        className="text-[13.5px] text-brand hover:underline mt-1"
      >
        Open an issue
      </a>
    </div>
  )
}