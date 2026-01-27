interface FaceMaskTablerProps {
  className?: string;
  size?: number | string;
}

export default function FaceMaskTabler({ className, size = '1em' }: FaceMaskTablerProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      <path d="M3 10c2-1 4-2 9-2s7 1 9 2v4c-2 1-4 2-9 2s-7-1-9-2v-4z" />
      <path d="M7 9c1.5.5 2.5 1 5 1s3.5-.5 5-1" />
      <path d="M2 9s1.5 1.5 1.5 3" />
      <path d="M22 9s-1.5 1.5-1.5 3" />
    </svg>
  );
}
