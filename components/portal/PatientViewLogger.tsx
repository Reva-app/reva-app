"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { logPatientView } from "@/lib/services/auditService";

/** NEN 7513: legt vast dat dit patiëntdossier is geopend (zie migratie 127). */
export function PatientViewLogger() {
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    if (id) logPatientView(id);
  }, [id]);

  return null;
}
