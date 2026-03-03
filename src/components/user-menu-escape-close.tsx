"use client";

import { useEffect } from "react";

export function UserMenuEscapeClose({ detailsId }: { detailsId: string }) {
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      const details = document.getElementById(detailsId);
      if (details instanceof HTMLDetailsElement && details.open) {
        details.open = false;
        if (document.activeElement instanceof HTMLElement && details.contains(document.activeElement)) {
          document.activeElement.blur();
        }
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [detailsId]);

  return null;
}
