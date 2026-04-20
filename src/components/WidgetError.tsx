interface WidgetErrorProps {
  message?: string
}

export default function WidgetError({ message = 'Something went wrong in this widget.' }: WidgetErrorProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 h-full p-4 text-center"
      style={{ color: 'var(--red)' }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 6v5M10 13.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span style={{ fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>
        {message}
      </span>
    </div>
  )
}
