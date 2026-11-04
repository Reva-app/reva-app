import { ImageResponse } from "next/og";

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
            background: "#e8632a",
            borderRadius: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 40,
          }}
        >
          <svg width={94} height={94} viewBox="0 0 1500 1500" xmlns="http://www.w3.org/2000/svg">
            <g fill="#ffffff">
              <g transform="translate(361.05762, 1150.124881)">
                <path d="M 90.3125 0 L 90.3125 -801.59375 L 425.640625 -801.59375 C 483.585938 -801.59375 533.632812 -791.804688 575.78125 -772.234375 C 617.9375 -752.660156 650.679688 -724.8125 674.015625 -688.6875 C 697.347656 -652.5625 709.015625 -610.035156 709.015625 -561.109375 C 709.015625 -524.234375 701.109375 -491.492188 685.296875 -462.890625 C 669.492188 -434.285156 648.234375 -411.328125 621.515625 -394.015625 C 594.796875 -376.703125 565.253906 -366.164062 532.890625 -362.40625 L 527.25 -373.703125 C 579.175781 -373.703125 619.25 -362.035156 647.46875 -338.703125 C 675.695312 -315.367188 691.695312 -279.613281 695.46875 -231.4375 L 715.78125 0 L 566.765625 0 L 549.828125 -210 C 547.566406 -241.601562 537.40625 -264.929688 519.34375 -279.984375 C 501.28125 -295.046875 471.171875 -302.578125 429.015625 -302.578125 L 237.09375 -302.578125 L 237.09375 0 Z M 237.09375 -431.28125 L 416.59375 -431.28125 C 461.007812 -431.28125 495.632812 -441.816406 520.46875 -462.890625 C 545.300781 -483.960938 557.71875 -513.691406 557.71875 -552.078125 C 557.71875 -591.210938 545.109375 -621.316406 519.890625 -642.390625 C 494.679688 -663.472656 457.992188 -674.015625 409.828125 -674.015625 L 237.09375 -674.015625 Z M 237.09375 -431.28125 " />
              </g>
            </g>
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
