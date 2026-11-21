import { ArrowRightIcon } from '@/shared/components/ui/icons'

const TABULAR_MANNER_ISSUES_URL = 'https://github.com/Minh1billion/tabular-manner/issues'

export function ReportIssueCard() {
  return (
    <div className="panel report">
      <h3>Still have a question or complaint?</h3>
      <p>Open an issue on the Tabular Manner repo and we'll get back to you.</p>
      <a href={TABULAR_MANNER_ISSUES_URL} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
        Open an issue
        <ArrowRightIcon className="w-3.5 h-3.5" />
      </a>
    </div>
  )
}
