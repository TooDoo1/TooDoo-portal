import { useEffect, useState } from "react";
import { isMonochromeEnabled, onMonochromeChange } from "@/lib/monochrome";

export function useMonochrome() {
  const [enabled, setEnabled] = useState<boolean>(() => isMonochromeEnabled());

  useEffect(() => {
    setEnabled(isMonochromeEnabled());
    return onMonochromeChange(setEnabled);
  }, []);

  return enabled;
}

