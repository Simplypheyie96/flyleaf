import type { ButtonHTMLAttributes } from 'react'
import styles from './LeafButton.module.css'

interface LeafButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 'primary' is the standard action; 'plus' is the round add action. */
  variant?: 'primary' | 'plus'
}

function LeafButton({ variant = 'primary', className, children, ...rest }: LeafButtonProps) {
  const classes = [styles.button, variant === 'plus' && styles.plus, className]
    .filter(Boolean)
    .join(' ')
  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  )
}

export default LeafButton
