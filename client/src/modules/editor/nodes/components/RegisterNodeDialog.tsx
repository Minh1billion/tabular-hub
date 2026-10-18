import { FormEvent, useState } from 'react'
import { Modal } from '@/shared/components/ui/Modal'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'
import { useRegisterNode } from '@/modules/editor/nodes/hooks'

interface RegisterNodeDialogProps {
  workspaceId: string
  onClose: () => void
}

export function RegisterNodeDialog({ workspaceId, onClose }: RegisterNodeDialogProps) {
  const [name, setName] = useState('')
  const [expression, setExpression] = useState('')
  const [description, setDescription] = useState('')
  const registerNode = useRegisterNode(workspaceId)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    registerNode.mutate(
      { name: name.trim(), expression: expression.trim(), description: description.trim() },
      { onSuccess: onClose },
    )
  }

  return (
    <Modal title="New custom node" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="field-label">Name</label>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. clip_positive" />
        </div>

        <div className="field">
          <label className="field-label">Expression</label>
          <div style={{ border: "var(--edge)", borderRadius: "var(--r-s)", overflow: "hidden", background: "var(--cream)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderBottom: "var(--edge)", background: "var(--cream-soft)" }}>
              <span className="w-2 h-2 rounded-full bg-warn" />
              <span className="w-2 h-2 rounded-full bg-accent-gold" />
              <span className="w-2 h-2 rounded-full bg-brand" />
              <span className="ml-2 font-mono text-[10px] text-slate">polars expression</span>
            </div>
            <textarea
              value={expression}
              onChange={(event) => setExpression(event.target.value)}
              placeholder={'value.clip(lower_bound=0)'}
              rows={5}
              spellCheck={false}
              className="w-full px-3 py-2.5 font-mono text-[13px] text-ink bg-transparent outline-none resize-none placeholder:text-muted"
            />
          </div>
          <p className="hint m-0">Available names: value, pl.</p>
        </div>

        <div className="field">
          <label className="field-label">Description</label>
          <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional" />
        </div>

        {registerNode.isError && <p className="err m-0">{registerNode.error.message}</p>}

        <div className="modal-actions">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={registerNode.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={registerNode.isPending}
            disabled={!name.trim() || !expression.trim()}
          >
            Register
          </Button>
        </div>
      </form>
    </Modal>
  )
}