export default function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-[13px] tracking-[-0.13px] text-muted">{eyebrow}</div>}
        <h1 className="truncate text-2xl leading-[29px] font-medium tracking-[-0.72px] text-graphite">{title}</h1>
        {description && <div className="mt-1 text-[13px] text-muted">{description}</div>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
