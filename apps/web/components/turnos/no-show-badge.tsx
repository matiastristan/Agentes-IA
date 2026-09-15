interface NoShowBadgeProps {
  onConfirm: () => void;
}

export function NoShowBadge({ onConfirm }: NoShowBadgeProps) {
  return (
    <button
      type="button"
      onClick={onConfirm}
      className="inline-flex items-center gap-1 rounded-full bg-warning-bg text-warning px-2 py-1 text-xs font-semibold"
    >
      ¿Faltó?
    </button>
  );
}
