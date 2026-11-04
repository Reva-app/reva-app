"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { UnsavedBadge } from "@/components/ui/UnsavedBadge";
import { useToast } from "@/components/ui/Toast";
import { BrandMark } from "@/components/brand/BrandMark";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { usePortalBranding } from "@/lib/hooks/usePortalBranding";
import { updatePortalBranding, uploadPortalLogo, removePortalLogo, MANAGE_BRANDING_ROLES } from "@/lib/services/portalService";
import { REVA_ORANGE, accessibleAccent, isHexColor } from "@/lib/brand";
import { LOGO_ACCEPT } from "@/lib/logoImage";

const inputStyle = {
  borderColor: "#e8e5df",
  background: "#ffffff",
  color: "#1a1a1a",
};

/**
 * Huisstijl van de praktijk: logo, kleur en naam. Wordt toegepast in de
 * portal, in de app van de patiënten van deze praktijk en in alle e-mails
 * namens de praktijk (uitnodigingen, herinneringen).
 */
export default function PortalHuisstijlPage() {
  const { checked, membership } = usePortalMembership();
  const { branding, refresh } = usePortalBranding();
  // null = nog geen lokale wijziging; val dan terug op de geladen huisstijl.
  const [nameEdit, setNameEdit] = useState<string | null>(null);
  const [colorEdit, setColorEdit] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast, toastNode } = useToast();

  const savedName = branding?.name ?? "";
  const savedColor = branding?.primaryColor ?? REVA_ORANGE;
  const name = nameEdit ?? savedName;
  const color = colorEdit ?? savedColor;
  const colorValid = isHexColor(color);
  const shownAccent = accessibleAccent(colorValid ? color : savedColor);
  const adjusted = colorValid && shownAccent !== color.toLowerCase();
  const dirty = (nameEdit !== null && nameEdit.trim() !== savedName) || (colorEdit !== null && colorEdit.toLowerCase() !== savedColor.toLowerCase());

  const canManage = !!membership && MANAGE_BRANDING_ROLES.includes(membership.roleKey);

  async function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !membership) return;
    setLogoBusy(true);
    const { error } = await uploadPortalLogo(membership.organizationId, file);
    setLogoBusy(false);
    if (error) { showToast(error, "error"); return; }
    refresh();
    showToast("Logo opgeslagen");
  }

  async function handleLogoRemove() {
    if (!membership) return;
    setLogoBusy(true);
    const { error } = await removePortalLogo(membership.organizationId);
    setLogoBusy(false);
    if (error) { showToast(error, "error"); return; }
    refresh();
    showToast("Logo verwijderd");
  }

  async function handleSave() {
    if (!membership) return;
    if (!name.trim()) { showToast("Vul een praktijknaam in.", "error"); return; }
    if (!colorValid) { showToast("Kies een geldige kleur, bijvoorbeeld #E8632A.", "error"); return; }

    setSaving(true);
    const { error } = await updatePortalBranding(membership.organizationId, {
      name: name.trim(),
      primaryColor: color.toLowerCase(),
    });
    setSaving(false);
    if (error) { showToast(error, "error"); return; }
    setNameEdit(null);
    setColorEdit(null);
    refresh();
    showToast("Huisstijl opgeslagen");
  }

  if (checked && membership && !canManage) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <SectionHeader title="Huisstijl" subtitle="Logo, kleur en praktijknaam" />
        <p className="text-sm text-gray-400 mt-4">Alleen de Practice Owner kan de huisstijl aanpassen.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <SectionHeader
          title="Huisstijl"
          subtitle="Logo, kleur en naam van je praktijk: in de portal, in de app van je patiënten en in e-mails"
        />
        <div className="flex items-center gap-3">
          {dirty && <UnsavedBadge />}
          <Button size="sm" onClick={handleSave} disabled={saving || !branding || !dirty}>
            {saving ? <><Loader2 size={14} className="animate-spin" /> Opslaan…</> : "Wijzigingen opslaan"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader title="Logo" subtitle="Wordt direct opgeslagen na het kiezen van een bestand" />
            <div className="flex items-start gap-5 flex-wrap">
              <div
                className="w-28 h-20 rounded-2xl flex items-center justify-center overflow-hidden border p-2"
                style={{ borderColor: "#e8e5df", background: "#ffffff" }}
              >
                {logoBusy ? (
                  <Loader2 size={20} className="animate-spin text-gray-400" />
                ) : branding?.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={branding.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                ) : (
                  <ImagePlus size={22} className="text-gray-300" />
                )}
              </div>
              <div className="flex-1 min-w-[200px] space-y-3">
                <input ref={fileInputRef} type="file" accept={LOGO_ACCEPT} hidden onChange={handleLogoSelect} />
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={logoBusy}>
                    <ImagePlus size={14} /> {branding?.logoUrl ? "Ander logo kiezen" : "Logo uploaden"}
                  </Button>
                  {branding?.logoUrl && (
                    <Button size="sm" variant="ghost" onClick={handleLogoRemove} disabled={logoBusy}>
                      <Trash2 size={14} /> Verwijderen
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  PNG, JPG, WebP of SVG, maximaal 5 MB. Bij voorkeur met een transparante achtergrond.
                  Een vierkant beeldmerk komt het best tot zijn recht in de navigatie; in e-mails tonen we het logo op ware verhouding.
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Kleur" subtitle="Voor knoppen, links en accenten. Kies uit het palet of stel een eigen kleur in." />
            <ColorPicker value={colorValid ? color : savedColor} onChange={(hex) => setColorEdit(hex)} />
            {color.toLowerCase() !== REVA_ORANGE && (
              <button
                type="button"
                onClick={() => setColorEdit(REVA_ORANGE)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800"
              >
                <RotateCcw size={12} /> Terug naar REVA-oranje
              </button>
            )}
            {!colorValid && (
              <p className="text-xs mt-2" style={{ color: "#dc2626" }}>Gebruik een kleurcode met # en zes tekens, bijvoorbeeld #E8632A.</p>
            )}
            {adjusted && (
              <div className="flex items-start gap-2.5 mt-3 rounded-xl px-3 py-2.5" style={{ background: "#f8f7f4" }}>
                <span className="w-5 h-5 rounded-md shrink-0 mt-0.5" style={{ background: shownAccent }} />
                <p className="text-xs text-gray-600 leading-relaxed">
                  Deze kleur is te licht voor witte tekst. Zodat knoppen en links leesbaar blijven, gebruikt REVA automatisch
                  een donkerdere tint ({shownAccent.toUpperCase()}). Je ziet het resultaat rechts in het voorbeeld.
                </p>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Praktijknaam" subtitle="In de navigatie, in de app van je patiënten en als afzender van e-mails" />
            <input
              type="text"
              value={name}
              onChange={(e) => setNameEdit(e.target.value)}
              maxLength={80}
              className="w-full text-sm rounded-xl border px-4 py-2.5 focus:outline-none"
              style={inputStyle}
            />
            <p className="text-xs text-gray-500 mt-1.5">E-mails komen binnen als “{name.trim() || "Praktijknaam"} via REVA”.</p>
          </Card>
        </div>

        <div className="lg:col-span-2 lg:sticky lg:top-6">
          <Card>
            <CardHeader title="Voorbeeld" subtitle="Zo zien je patiënten en collega's het" />
            <div className="space-y-4" style={{ ["--brand-accent" as string]: shownAccent }}>
              <div className="rounded-xl px-4 py-3 flex items-center gap-2.5" style={{ background: "#18181a" }}>
                <BrandMark logoUrl={branding?.logoUrl} initial={(name.trim() || "R")[0]} />
                <span className="text-white font-semibold text-sm truncate">{name.trim() || "Praktijknaam"}</span>
              </div>

              <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "#e8e5df" }}>
                <p className="text-sm font-semibold text-gray-900">Tijd voor je check-in</p>
                <p className="text-xs text-gray-500">
                  Hoe gaat het vandaag? <span style={{ color: "var(--brand-accent)" }} className="font-medium">Bekijk je voortgang</span>
                </p>
                <Button size="sm">Check-in invullen</Button>
              </div>

              <div className="rounded-xl overflow-hidden border" style={{ borderColor: "#e8e5df", background: "#f8f7f4" }}>
                <p className="text-[10px] uppercase tracking-wide text-gray-400 px-4 pt-3">E-mail</p>
                <div className="px-4 pt-2 pb-2">
                  {branding?.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={branding.logoUrl} alt="" className="h-6 w-auto max-w-[140px] object-contain" />
                  ) : (
                    <span className="text-sm font-bold text-gray-900">{name.trim() || "Praktijknaam"}</span>
                  )}
                </div>
                <div className="mx-3 mb-3 rounded-lg bg-white overflow-hidden border" style={{ borderColor: "#ece9e3" }}>
                  <div className="h-1" style={{ background: shownAccent }} />
                  <div className="p-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-900">Welkom bij je hersteldashboard</p>
                    <span className="inline-block text-[11px] font-semibold text-white rounded-md px-2.5 py-1.5" style={{ background: shownAccent }}>
                      Account activeren
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {toastNode}
    </div>
  );
}
