interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingSpinner({ size = 'md' }: LoadingSpinnerProps) {
  return (
    <div className="spinner-container">
      <div className={`spinner spinner--${size}`} />
    </div>
  );
}
