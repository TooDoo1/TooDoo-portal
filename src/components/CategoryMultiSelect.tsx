import { useState } from "react";
import { Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

type CategoryOption = { id: string; name: string };

type CategoryMultiSelectProps = {
  id?: string;
  label?: string;
  options: CategoryOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function CategoryMultiSelect({
  id = "categories",
  label = "Kategorier",
  options,
  selectedIds,
  onChange,
  disabled = false,
  placeholder = "Välj kategorier",
}: CategoryMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedLabel = options
    .filter((option) => selectedIds.includes(option.id))
    .map((option) => option.name)
    .join(", ");

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-semibold text-muted-foreground">
        {label}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="h-11 w-full rounded-md border border-border bg-background px-3 text-left text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {selectedIds.length > 0 ? selectedLabel : placeholder}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] border-border bg-popover p-0" align="start">
          <Command>
            <CommandInput placeholder="Sök kategori..." />
            <CommandList>
              <CommandEmpty>Inga kategorier hittades.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.name}
                    onSelect={() => {
                      onChange(
                        selectedIds.includes(option.id)
                          ? selectedIds.filter((entry) => entry !== option.id)
                          : [...selectedIds, option.id],
                      );
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedIds.includes(option.id) ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {option.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <p className="text-xs text-muted-foreground">Första valda kategorin blir primär i appen.</p>
    </div>
  );
}
