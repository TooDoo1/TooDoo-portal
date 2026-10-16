import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CategoryRowPicker } from "@/components/CategoryRowPicker";

const options = [
  { id: "shopping", name: "Shopping" },
  { id: "mat", name: "Mat" },
];

function PickerHarness() {
  const [value, setValue] = useState<{ categoryId: string; subcategoryIds: string[] }[]>([]);
  return (
    <CategoryRowPicker
      options={options}
      value={value}
      onChange={setValue}
      loadSubcategories={vi.fn(async (categoryId: string) => {
        if (categoryId === "shopping") {
          return [
            { id: "clothes", name: "Kläder & mode" },
            { id: "shoes", name: "Skor" },
          ];
        }
        return [];
      })}
    />
  );
}

describe("CategoryRowPicker", () => {
  it("adds a blank row and slides into the subcategories after a category is chosen", async () => {
    render(<PickerHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Välj kategori" }));
    fireEvent.click(await screen.findByRole("button", { name: "Shopping" }));

    expect(await screen.findByRole("button", { name: "Kläder & mode" })).toBeInTheDocument();
    expect(screen.getByTestId("category-slide-track")).toHaveClass("-translate-x-1/2");
    expect(screen.getAllByRole("button", { name: "Välj kategori" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Kläder & mode" }));

    const shoppingRow = screen.getAllByRole("button", { name: /Shopping/ }).find((button) =>
      button.textContent?.includes("Kläder & mode"),
    );
    expect(shoppingRow).toBeDefined();
  });
});
