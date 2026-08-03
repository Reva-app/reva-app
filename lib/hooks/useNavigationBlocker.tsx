"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

interface NavigationBlockerContextValue {
  isBlocked: boolean;
  setBlocked: (id: string, blocked: boolean) => void;
}

const NavigationBlockerContext = createContext<NavigationBlockerContextValue>({
  isBlocked: false,
  setBlocked: () => {},
});

/**
 * Deelt "er is ergens een formulier met niet-opgeslagen wijzigingen"-status
 * door de hele patiëntenapp — zodat de sidebar/mobiele navigatie kan
 * waarschuwen voordat je per ongeluk wegnavigeert (bv. midden in het loggen
 * van een trainingssessie). Werkt met een set van blocker-id's i.p.v. één
 * simpele boolean, zodat meerdere onafhankelijke formulieren op dezelfde
 * pagina (bv. meerdere trainingsschema's) elkaar niet overschrijven.
 */
export function NavigationBlockerProvider({ children }: { children: ReactNode }) {
  const blockersRef = useRef(new Set<string>());
  const [isBlocked, setIsBlocked] = useState(false);

  const setBlocked = useCallback((id: string, blocked: boolean) => {
    if (blocked) blockersRef.current.add(id);
    else blockersRef.current.delete(id);
    setIsBlocked(blockersRef.current.size > 0);
  }, []);

  return (
    <NavigationBlockerContext.Provider value={{ isBlocked, setBlocked }}>
      {children}
    </NavigationBlockerContext.Provider>
  );
}

export function useNavigationBlocker() {
  return useContext(NavigationBlockerContext);
}

/** Meldt een formulier aan/af bij de gedeelde navigatie-blokkade zolang `blocked` true is. */
export function useBlocksNavigation(id: string, blocked: boolean) {
  const { setBlocked } = useNavigationBlocker();
  useEffect(() => {
    setBlocked(id, blocked);
    return () => setBlocked(id, false);
  }, [id, blocked, setBlocked]);

  // Browser-navigatie (herladen, tab sluiten, handmatig een andere URL intypen)
  // loopt niet via Next.js se client-router en dus niet via onNavigate — dat
  // vangen we los af met de standaard beforeunload-waarschuwing.
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!blocked) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [blocked]);
}
