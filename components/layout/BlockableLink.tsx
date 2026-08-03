"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useNavigationBlocker } from "@/lib/hooks/useNavigationBlocker";

const CONFIRM_MESSAGE = "Je hebt niet-opgeslagen wijzigingen. Weet je zeker dat je wilt vertrekken zonder op te slaan?";

/**
 * Drop-in vervanger voor next/link — blokkeert navigatie met een
 * bevestigingsvraag zolang useBlocksNavigation() ergens op de pagina actief
 * is (zie lib/hooks/useNavigationBlocker.tsx). Gebruikt in de hoofdnavigatie
 * (Sidebar/MobileNav) zodat je niet per ongeluk wegklikt tijdens bijvoorbeeld
 * het loggen van een trainingssessie.
 */
export function BlockableLink({ onNavigate, ...props }: ComponentProps<typeof Link>) {
  const { isBlocked } = useNavigationBlocker();
  return (
    <Link
      {...props}
      onNavigate={(e) => {
        if (isBlocked && !window.confirm(CONFIRM_MESSAGE)) {
          e.preventDefault();
          return;
        }
        onNavigate?.(e);
      }}
    />
  );
}
