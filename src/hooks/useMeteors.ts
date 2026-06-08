import { useEffect, useState } from "react";
import { areMeteorsEnabled, onMeteorsChange } from "@/lib/meteors";

export function useMeteors() {
  const [enabled, setEnabled] = useState<boolean>(() => areMeteorsEnabled());

  useEffect(() => {
    setEnabled(areMeteorsEnabled());
    return onMeteorsChange(setEnabled);
  }, []);

  return enabled;
}

