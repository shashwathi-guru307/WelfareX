interface EmptyStateProps {
  title?: string;
  message: string;
  icon?: React.ReactNode;
}

export default function EmptyState({
  title = 'No data found',
  message,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {icon || (
        <svg
          className="h-12 w-12 text-gray-300 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      )}
      <h3 className="text-lg font-medium text-gray-700">{title}</h3>
      <p className="mt-1 text-sm text-gray-500 text-center max-w-sm">{message}</p>
    </div>
  );
}
