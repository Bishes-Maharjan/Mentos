import type { PANValidation } from '../types';

interface PANBadgeProps {
  validation: PANValidation | null | undefined;
}

export default function PANBadge({ validation }: PANBadgeProps) {
  if (!validation) return null;

  if (validation.valid && !validation.suspended) {
    return (
      <span className="badge badge--success">
        ✓ PAN Valid (format check only)
      </span>
    );
  }

  if (validation.valid && validation.suspended) {
    return (
      <span className="badge badge--warning">
        ⚠ PAN Suspended (demo data)
      </span>
    );
  }

  return (
    <span className="badge badge--danger">
      ✗ {validation.message}
    </span>
  );
}
