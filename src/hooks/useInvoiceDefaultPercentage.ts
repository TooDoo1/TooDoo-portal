import { useEffect, useState } from "react";
import { getInvoiceDefaultPercentage, onInvoiceDefaultPercentageChange } from "@/lib/invoicePercent";

export function useInvoiceDefaultPercentage() {
  const [value, setValue] = useState<number>(() => getInvoiceDefaultPercentage());

  useEffect(() => {
    setValue(getInvoiceDefaultPercentage());
    return onInvoiceDefaultPercentageChange(setValue);
  }, []);

  return value;
}

