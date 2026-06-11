import { useEffect, useRef } from "react";

import { getApiBaseUrl, getAuthToken } from "@/lib/api";

export type RealtimeEvent =
  | {
      type: "order.updated";
      orderId: string;
      businessId: string;
    }
  | {
      type: "business-event.updated";
      eventId: string;
      businessId: string;
    };

const EVENT_TYPES: RealtimeEvent["type"][] = ["order.updated", "business-event.updated"];

export function useRealtime(onEvent: (event: RealtimeEvent) => void, enabled = true) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled) return;

    const token = getAuthToken();
    if (!token) return;

    const source = new EventSource(
      `${getApiBaseUrl()}/realtime/stream?token=${encodeURIComponent(token)}`,
    );

    const handleRealtimeEvent = (message: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(message.data) as RealtimeEvent;
        if (EVENT_TYPES.includes(payload.type)) {
          onEventRef.current(payload);
        }
      } catch {
        // Ignore malformed SSE payloads.
      }
    };

    for (const eventType of EVENT_TYPES) {
      source.addEventListener(eventType, handleRealtimeEvent);
    }

    return () => {
      for (const eventType of EVENT_TYPES) {
        source.removeEventListener(eventType, handleRealtimeEvent);
      }
      source.close();
    };
  }, [enabled]);
}
