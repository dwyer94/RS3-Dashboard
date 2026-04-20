interface WidgetSkeletonProps {
  rows?: number
}

export default function WidgetSkeleton({ rows = 4 }: WidgetSkeletonProps) {
  return (
    <div className="flex flex-col gap-2 p-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="skeleton rounded-sm"
          style={{ height: 14, width: `${60 + (i % 3) * 15}%`, opacity: 1 - i * 0.1 }}
        />
      ))}
    </div>
  )
}
