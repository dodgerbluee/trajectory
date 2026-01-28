interface FaceMaskSimpleProps {
  className?: string;
  size?: string | number;
}

export default function FaceMaskSimple({ className, size = '1em' }: FaceMaskSimpleProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      preserveAspectRatio="xMidYMid meet"
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
