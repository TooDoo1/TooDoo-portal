import { useState } from "react";
import { Check, ChevronDown, Tags } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

export type SubcategoryFilterOption = {
  id: string;
  name: string;
  categoryName: string;
};

type SubcategoryFilterProps = {
  options: SubcategoryFilterOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};

function selectionLabel(options: SubcategoryFilterOption[], selectedIds: string[]) {
  const names = options.filter((option) => selectedIds.includes(option.id)).map((option) => option.name);
  if (names.length === 0) return "Alla underkategorier";
  if (names.length <= 2) return names.join(", ");
  return `${names.length} underkategorier`;
}

export function SubcategoryFilter({
  options,
  selectedIds,
  onChange,
  disabled = false,
}: SubcategoryFilterProps) {
  const [open, setOpen] = useState(false);
  const groups = new Map<string, SubcategoryFilterOption[]>();
  for (const option of options) {
    const list = groups.get(option.categoryName) ?? [];
    list.push(option);
    groups.set(option.categoryName, list);
  }
  const showGroupHeadings = groups.size > 1;
  const empty = options.length === 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label="Underkategorier"
          disabled={disabled || empty}
          className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-border bg-card px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50 sm:w-[240px]"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Tags className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{empty ? "Inga underkategorier" : selectionLabel(options, selectedIds)}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] border-border bg-popover p-0" align="start">
        <Command>
          <CommandInput placeholder="Sök underkategori..." />
          <CommandList>
            <CommandEmpty>Ingen underkategori hittades.</CommandEmpty>
            {[...groups.entries()].map(([categoryName, children]) => (
              <CommandGroup key={categoryName} heading={showGroupHeadings ? categoryName : undefined}>
                {children.map((option) => {
                  const selected = selectedIds.includes(option.id);
                  return (
                    <CommandItem
                      key={option.id}
                      value={`${categoryName} ${option.name}`}
                      onSelect={() => {
                        onChange(
                          selected ? selectedIds.filter((id) => id !== option.id) : [...selectedIds, option.id],
                        );
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", selected ? "opacity-100" : "opacity-0")} />
                      {option.name}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
