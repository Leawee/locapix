import { ImageResponse } from "next/og";

export const alt = "locapix — Your photos stay yours";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#FFF8F1",
          color: "#4A2511",
          padding: "80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, color: "#E0692E", fontSize: 28, fontWeight: 700 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "#FF8C42" }} />
          locapix
        </div>
        <div style={{ marginTop: 36, fontSize: 76, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>
          Your photos stay yours.
        </div>
        <div style={{ marginTop: 28, fontSize: 32, color: "#8A6B54", maxWidth: 860 }}>
          Compress, resize, and convert in the browser. Photos never leave your device.
        </div>
      </div>
    ),
    { ...size },
  );
}
