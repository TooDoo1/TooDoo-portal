import { Link } from "react-router-dom";

type CategoryBadgesProps = {
  names: string[];
  linkToCategory?: boolean;
  className?: string;
};

export function CategoryBadges({ names, linkToCategory = false, className }: CategoryBadgesProps) {
  const uniqueNames = [...new Set(names.filter(Boolean))];
  if (uniqueNames.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-1.5 ${className ?? ""}`}>
      {uniqueNames.map((name) =>
        linkToCategory ? (
          <Link
            key={name}
            to={`/category/${encodeURIComponent(name)}`}
            className="text-xs bg-accent/15 text-accent hover:bg-accent/25 px-2.5 py-0.5 rounded-full font-medium transition-colors"
            onClick={(event) => event.stopPropagation()}
          >
            {name}
          </Link>
        ) : (
          <span
            key={name}
            className="text-xs bg-accent/15 text-accent px-2.5 py-0.5 rounded-full font-medium"
          >
            {name}
          </span>
        ),
      )}
    </div>
  );
}
