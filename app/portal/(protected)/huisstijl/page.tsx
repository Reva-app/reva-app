"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Check } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { usePortalBranding } from "@/lib/hooks/usePortalBranding";
import { updatePortalBranding, uploadPortalLogo, MANAGE_BRANDING_ROLES } from "@/lib/services/portalService";

const inputStyle = {
  borderColor: "#e8e5df",
  background: "#ffffff",
  color: "#1a1a1a",
};

const DEFAULT_ACCENT = "#e8632a";
const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1.5">{children}</label>;
}

export default function PortalHuisstijlPage() {
  const { checked, membership } = usePortalMembership();
  const { branding, refresh } = usePortalBranding();
  // null = nog geen lokale wijziging; val dan terug op de geladen huisstijl.
  const [nameEdit, setNameEdit] = useState<string | null>(null);
  const [colorEdit, setColorEdit] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const name = nameEdit ?? branding?.name ?? "";
  const color = colorEdit ?? branding?.primaryColor ?? DEFAULT_ACCENT;

  const canManage = !!membership && MANAGE_BRANDING_ROLES.includes(membership.roleKey);

  async function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !membership) return;
    setUploadingLogo(true);
    setError("");
    const { error: uploadError } = await uploadPortalLogo(membership.organizationId, file);
    setUploadingLogo(false);
    if (uploadError) { setError(uploadError); return; }
    refresh();
    // De zijbalk/mobiele balk laden hun eigen huisstijl onafhankelijk in — een
    // volledige herlaad is de eenvoudigste manier om het nieuwe logo daar ook
    // meteen te tonen, zonder een globale branding-context op te tuigen voor
    // één zeldzaam veranderende instelling.
    setTimeout(() => window.location.reload(), 400);
  }

  async function handleSave() {
    if (!membership) return;
    if (!name.trim()) { setError("Vul een praktijknaam in."); return; }
    if (!HEX_PATTERN.test(color)) { setError("Kies een geldige kleur (bijv. #E8632A)."); return; }

    setSaving(true);
    setError("");
    setSaved(false);
    const { error: saveError } = await updatePortalBranding(membership.organizationId, {
      name: name.trim(),
      primaryColor: color,
    });
    setSaving(false);
    if (saveError) { setError(saveError); return; }
    setSaved(true);
    setTimeout(() => window.location.reload(), 600);
  }

  if (checked && membership && !canManage) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <SectionHeader title="Huisstijl" subtitle="Logo, kleur en praktijknaam" />
        <p className="text-sm text-gray-400 mt-4">
          Alleen een eigenaar of beheerder van de organisatie kan de huisstijl aanpassen.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <SectionHeader
          title="Huisstijl"
          subtitle="Zo voelt het platform als jullie eigen omgeving — logo, kleur en naam"
        />
        <Button size="sm" onClick={handleSave} disabled={saving || !branding}>
          {saving ? (
            <><Loader2 size={14} className="animate-spin" /> Opslaan…</>
          ) : saved ? (
            <><Check size={14} /> Opgeslagen</>
          ) : (
            "Wijzigingen opslaan"
          )}
        </Button>
      </div>

      <Card>
        <CardHeader title="Logo en kleur" subtitle="Verschijnt in de zijbalk en op knoppen door de hele Practice Portal" />
        <div className="flex items-start gap-6 flex-wrap">
          <div>
            <FieldLabel>Logo</FieldLabel>
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleLogoSelect} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden border transition-colors hover:bg-gray-50"
              style={{ borderColor: "#e8e5df", background: "#f8f7f4" }}
              title="Logo uploaden"
            >
              {uploadingLogo ? (
                <Loader2 size={20} className="animate-spin text-gray-400" />
              ) : branding?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Camera size={20} className="text-gray-300" />
              )}
            </button>
            <p className="text-xs text-gray-400 mt-1.5">Klik om te wijzigen</p>
          </div>
          <div>
            <FieldLabel>Primaire kleur</FieldLabel>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={HEX_PATTERN.test(color) ? color : DEFAULT_ACCENT}
                onChange={(e) => setColorEdit(e.target.value)}
                className="w-11 h-11 rounded-xl border cursor-pointer"
                style={{ borderColor: "#e8e5df", padding: 0 }}
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColorEdit(e.target.value)}
                placeholder="#E8632A"
                className="w-28 text-sm rounded-xl border px-3 py-2 focus:outline-none"
                style={inputStyle}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Gebruikt voor knoppen en accenten</p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Praktijknaam" subtitle="Zichtbaar in de zijbalk en overal waar de organisatie wordt getoond" />
        <input
          type="text"
          value={name}
          onChange={(e) => setNameEdit(e.target.value)}
          className="w-full text-sm rounded-xl border px-4 py-2.5 focus:outline-none"
          style={inputStyle}
        />
      </Card>

      {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}
    </div>
  );
}
