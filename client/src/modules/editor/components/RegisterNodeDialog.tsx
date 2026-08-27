import { FormEvent, useState } from 'react'
import { Modal } from '@/shared/components/ui/Modal'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'
import { useRegisterNode } from '@/modules/nodes/hooks'

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
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono text-muted uppercase">Name</label>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. clip_positive" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono text-muted uppercase">Expression</label>
          <div className="rounded-lg border border-line bg-[#f4f6f2] overflow-hidden">
            <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-line bg-cream-soft">
              <span className="w-2 h-2 rounded-full bg-[#e5b8b8]" />
              <span className="w-2 h-2 rounded-full bg-[#e8d8a8]" />
              <span className="w-2 h-2 rounded-full bg-[#b8dcc0]" />
              <span className="ml-2 font-mono text-[10px] text-muted">polars expression</span>
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
          <p className="text-[11px] text-muted">Available names: value, pl.</p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono text-muted uppercase">Description</label>
          <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional" />
        </div>

        {registerNode.isError && <p className="text-[12px] text-warn">{registerNode.error.message}</p>}

        <div className="flex items-center gap-2 justify-end pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={registerNode.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={registerNode.isPending || !name.trim() || !expression.trim()}
          >
            {registerNode.isPending ? 'Saving…' : 'Register'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}