import { AlertTriangle, RotateCcw } from "lucide-react";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  title?: string;
}

export function ErrorMessage({ message, onRetry, title = "Error loading data" }: ErrorMessageProps) {
  return (
    <div className="w-full p-4 bg-accent-red/5 border border-accent-red/30 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-accent-red shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-accent-red text-sm mb-1">{title}</h4>
          <p className="text-xs text-text-secondary mb-3 break-words">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-2 py-1 bg-accent-red/10 text-accent-red rounded-md hover:bg-accent-red/20 transition-colors text-xs font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
