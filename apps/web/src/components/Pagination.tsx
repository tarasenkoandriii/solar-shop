import Link from 'next/link';

export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav className="mt-8 flex justify-center gap-2">
      {pages.map((p) => (
        <Link
          key={p}
          href={buildHref(p)}
          className={`h-9 w-9 rounded-full text-center text-sm leading-9 ${
            p === page ? 'bg-sun-500 text-leaf-900' : 'bg-leaf-800/5 text-leaf-900 hover:bg-leaf-800/10'
          }`}
        >
          {p}
        </Link>
      ))}
    </nav>
  );
}
