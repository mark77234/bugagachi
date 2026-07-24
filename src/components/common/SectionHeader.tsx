export function SectionHeader({
  eyebrow,
  title,
  description,
  as = "h2",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  as?: "h1" | "h2";
}) {
  const Title = as;
  return (
    <div className="mb-6">
      {eyebrow && <p className="mb-2 text-sm font-semibold text-primary">{eyebrow}</p>}
      <Title className={as === "h1" ? "text-2xl font-bold sm:text-3xl" : "text-xl font-bold sm:text-2xl"}>
        {title}
      </Title>
      {description && <p className="mt-2 max-w-2xl text-muted">{description}</p>}
    </div>
  );
}
