import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface CompanyAvatarProps {
  name: string;
  logo?: string;
}

export function CompanyAvatar({ name, logo }: CompanyAvatarProps) {
  const initials = logo || name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <Avatar className="h-10 w-10">
      <AvatarFallback className="bg-accent/15 text-accent font-semibold text-sm">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
