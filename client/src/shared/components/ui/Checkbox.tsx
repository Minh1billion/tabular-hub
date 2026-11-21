import { InputHTMLAttributes } from 'react'
import { CheckIcon } from './icons'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
}

export function Checkbox({ label, ...props }: CheckboxProps) {
  return (
    <label className="check">
      <input type="checkbox" {...props} />
      <span className="check-box">
        <CheckIcon />
      </span>
      {label}
    </label>
  )
}
