import { Link } from "react-router-dom";

type CategoryBadgesProps = {
  names: string[];
  linkToCategory?: boolean;
  /** Parent category names that have a category page. Subcategory chips stay plain. */
  linkNames?: string[];
  className?: string;
  /** Solid dark chip so the label stays readable over a photo. */
  onPhoto?: boolean;
};

export function CategoryBadges({
  names,
  linkToCategory = false,
  linkNames,
  className,
  onPhoto = false,
}: CategoryBadgesProps) {
  const uniqueNames = [...new Set(names.filter(Boolean))];
  if (uniqueNames.length === 0) {
    return null;
  }

  const linkable = new Set((linkNames ?? uniqueNames).map((name) => name.trim().toLocaleLowerCase("sv-SE")));

  return (
    <div className={`flex flex-wrap gap-1.5 ${className ?? ""}`}>
      {uniqueNames.map((name) =>
        linkToCategory && linkable.has(name.trim().toLocaleLowerCase("sv-SE")) ? (
          <Link
            key={name}
            to={`/category/${encodeURIComponent(name)}`}
            className={
              onPhoto
                ? "text-xs bg-black/60 text-sky-100 hover:bg-black/75 px-2.5 py-0.5 rounded-full font-medium transition-colors"
                : "text-xs bg-accent/15 text-accent hover:bg-accent/25 px-2.5 py-0.5 rounded-full font-medium transition-colors"
            }
            onClick={(event) => event.stopPropagation()}
          >
            {name}
          </Link>
        ) : (
          <span
            key={name}
            className={
              onPhoto
                ? "text-xs bg-black/60 text-sky-100 px-2.5 py-0.5 rounded-full font-medium"
                : "text-xs bg-accent/15 text-accent px-2.5 py-0.5 rounded-full font-medium"
            }
          >
            {name}
          </span>
        ),
      )}
    </div>
  );
}
