import { useEffect, useRef } from "react";

/**
 * Makes a transient overlay (bottom sheet) participate in the browser/
 * Android back button instead of letting it exit the app. While `isOpen`
 * is true, a history entry is held open; the hardware back button (or
 * gesture) pops it and calls `onClose`. Use the returned function in place
 * of calling onClose directly (Cancel/Save/backdrop) so an explicit close
 * also consumes that same entry via history.back() — keeping "closed by
 * the user" and "closed by pressing back" as one path, with no dangling
 * history entries either way.
 */
export function useBackableClose(isOpen: boolean, onClose: () => void): () => void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    history.pushState({ sheet: true }, "");
    pushedRef.current = true;

    function onPopState() {
      pushedRef.current = false;
      onCloseRef.current();
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [isOpen]);

  return () => {
    if (pushedRef.current) {
      pushedRef.current = false;
      history.back();
    } else {
      onCloseRef.current();
    }
  };
}
