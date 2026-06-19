interface ConfidenceBadgeProps {
  confidence: 'high' | 'medium' | 'low';
}

const labels: Record<string, string> = {
  high: 'High Confidence',
  medium: 'Medium Confidence',
  low: 'Low Confidence',
};

export default function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  return (
    <span className={`badge badge--${confidence}`}>
      {labels[confidence]}
    </span>
  );
}
