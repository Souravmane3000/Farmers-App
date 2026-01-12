import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  href?: string;
  onClick?: () => void;
}

export default function BackButton({ href, onClick }: BackButtonProps) {
  const content = (
    <div className="flex items-center gap-2 text-primary-600 font-semibold">
      <ArrowLeft className="w-5 h-5" />
      <span>Back</span>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return (
    <button onClick={onClick} className="active:scale-95 transition-transform">
      {content}
    </button>
  );
}
