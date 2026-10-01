"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";

type Navigation = {
  entranceAllowed: boolean;
  entranceVersion: number;
  dismissEntrance: () => void;
  navigate: (destination: URL, replayEntrance?: boolean) => void;
  arrive: () => void;
};

const NavigationContext = createContext<Navigation | null>(null);

export function SiteNavigationProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [entrance, setEntrance] = useState({ allowed: pathname === "/", version: 0 });
  const pending = useRef<{ destination: URL; replayEntrance: boolean } | null>(null);
  const frame = useRef<number | null>(null);

  function arrive() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const request = pending.current;
      if (!request) return;
      const { destination, replayEntrance } = request;
      if (destination.pathname !== location.pathname || destination.search !== location.search || destination.hash !== location.hash) return;
      const target = destination.hash ? document.getElementById(decodeURIComponent(destination.hash.slice(1))) : null;
      if (destination.hash && !target) return;
      pending.current = null;
      if (target) target.scrollIntoView({ behavior: "instant", block: "start" });
      else window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      if (replayEntrance) setEntrance(previous => ({ allowed: true, version: previous.version + 1 }));
    });
  }

  function navigate(destination: URL, replayEntrance = false) {
    setEntrance(previous => ({ ...previous, allowed: false }));
    pending.current = { destination, replayEntrance: replayEntrance && destination.pathname === "/" && !destination.hash };
    arrive();
  }

  useEffect(() => {
    const cancelPending = () => {
      pending.current = null;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
    window.addEventListener("popstate", cancelPending);
    return () => { cancelPending(); window.removeEventListener("popstate", cancelPending); };
  }, []);

  return <NavigationContext.Provider value={{ entranceAllowed: entrance.allowed, entranceVersion: entrance.version, dismissEntrance: () => setEntrance(previous => ({ ...previous, allowed: false })), navigate, arrive }}>{children}</NavigationContext.Provider>;
}

export function useSiteNavigation() {
  const navigation = useContext(NavigationContext);
  if (!navigation) throw new Error("SiteNavigationProvider manquant.");
  return navigation;
}

export function NavigationArrival() {
  const navigation = useSiteNavigation();
  useLayoutEffect(() => { navigation.arrive(); });
  return null;
}

export function SiteLink({ href, onNavigate, replayEntrance = false, ...props }: Omit<React.ComponentProps<typeof NextLink>, "href" | "scroll"> & { href: string; replayEntrance?: boolean }) {
  const navigation = useSiteNavigation();
  return <NextLink {...props} href={href} scroll={false} onNavigate={event => {
    onNavigate?.(event);
    const destination = new URL(href, window.location.href);
    if (destination.origin !== window.location.origin) return;
    navigation.navigate(destination, replayEntrance);
    if (destination.href === window.location.href) event.preventDefault();
  }}/>;
}