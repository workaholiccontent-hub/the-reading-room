import styles from './Input.module.css'

export default function Input({
  label,
  error,
  hint,
  id,
  ...props
}) {
  const fieldId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={fieldId} className={styles.label}>
          {label}
        </label>
      )}
      <input
        id={fieldId}
        className={`${styles.input} ${error ? styles.hasError : ''}`}
        {...props}
      />
      {hint && !error && <p className={styles.hint}>{hint}</p>}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}

export function Textarea({ label, error, hint, id, rows = 4, ...props }) {
  const fieldId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className={styles.field}>
      {label && <label htmlFor={fieldId} className={styles.label}>{label}</label>}
      <textarea
        id={fieldId}
        rows={rows}
        className={`${styles.input} ${styles.textarea} ${error ? styles.hasError : ''}`}
        {...props}
      />
      {hint && !error && <p className={styles.hint}>{hint}</p>}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}

export function Select({ label, error, hint, id, children, ...props }) {
  const fieldId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className={styles.field}>
      {label && <label htmlFor={fieldId} className={styles.label}>{label}</label>}
      <select
        id={fieldId}
        className={`${styles.input} ${styles.select} ${error ? styles.hasError : ''}`}
        {...props}
      >
        {children}
      </select>
      {hint && !error && <p className={styles.hint}>{hint}</p>}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
