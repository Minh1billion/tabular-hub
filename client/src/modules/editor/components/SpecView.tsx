import { ReactNode, memo, useMemo, useState } from 'react'
import { Button } from '@/shared/components/ui/Button'
import { CheckIcon, CopyIcon } from '@/shared/components/ui/icons'
import { GraphSpec } from '../types'

const TOKEN = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g

function highlight(line: string) {
  const out: ReactNode[] = []
  let last = 0
  let index = 0
  for (const match of line.matchAll(TOKEN)) {
    const start = match.index ?? 0
    if (start > last) out.push(<span key={index++} className="tk-p">{line.slice(last, start)}</span>)
    const [text, str, colon, word] = match
    if (str) {
      out.push(<span key={index++} className={colon ? 'tk-k' : 'tk-s'}>{str}</span>)
      if (colon) out.push(<span key={index++} className="tk-p">{colon}</span>)
    } else {
      out.push(<span key={index++} className={word ? 'tk-b' : 'tk-n'}>{text}</span>)
    }
    last = start + text.length
  }
  if (last < line.length) out.push(<span key={index} className="tk-p">{line.slice(last)}</span>)
  return out
}

export const SpecView = memo(function SpecView({ spec }: { spec: GraphSpec }) {
  const [copied, setCopied] = useState(false)
  const json = useMemo(() => JSON.stringify(spec, null, 2), [spec])
  const lines = useMemo(() => json.split('\n'), [json])

  async function copy() {
    try {
      await navigator.clipboard.writeText(json)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      return
    }
  }

  return (
    <div>
      <div className="spec-head">
        <span>
          {spec.nodes.length} nodes · {spec.connections.length} connections · {lines.length} lines
        </span>
        <span className="grow" />
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <pre className="spec-code">
        {lines.map((line, i) => (
          <div key={i} className="spec-line">
            <span className="spec-ln">{i + 1}</span>
            <span className="spec-tx">{highlight(line)}</span>
          </div>
        ))}
      </pre>
    </div>
  )
})
