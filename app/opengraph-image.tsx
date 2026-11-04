import { ImageResponse } from "next/og";
import { REVA_GLYPH, REVA_ORANGE } from "@/lib/brand";

export const alt = "REVA App: Grip op je herstel";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8f7f4",
        }}
      >
        <div
          style={{
            width: 160,
            height: 160,
            background: REVA_ORANGE,
            borderRadius: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 40,
          }}
        >
          <svg
            width={Math.round((84 * REVA_GLYPH.width) / REVA_GLYPH.height)}
            height={84}
            viewBox={`0 0 ${REVA_GLYPH.width} ${REVA_GLYPH.height}`}
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d={REVA_GLYPH.path} fill="#ffffff" />
          </svg>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 76,
            fontWeight: 700,
            color: "#1a1a1a",
            letterSpacing: "-2px",
          }}
        >
          REVA App
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 32,
            color: "#6b7280",
            marginTop: 16,
          }}
        >
          Grip op je herstel
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
