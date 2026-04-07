import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: "#e8632a",
          borderRadius: 118,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            color: "#ffffff",
            fontSize: 280,
            fontWeight: 700,
            fontFamily: "sans-serif",
            lineHeight: 1,
            letterSpacing: "-8px",
            marginTop: 8,
          }}
        >
          R
        </span>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
