import { ImageResponse } from "next/og"

export function GET() {
  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", padding: 80, background: "#f5f6f7", borderBottom: "18px solid #004fc7", color: "#232323" }}>
      <div style={{ display: "flex", color: "#004fc7", fontSize: 88, fontWeight: 700 }}>ControlKart</div>
      <div style={{ display: "flex", fontSize: 44, marginTop: 32 }}>Industrial automation, made accessible.</div>
      <div style={{ display: "flex", fontSize: 28, marginTop: 30, color: "#555" }}>Selec PLCs · HMIs · VFDs · Meters · Protection devices</div>
      <div style={{ display: "flex", fontSize: 26, marginTop: 48 }}>Pan-India delivery · GST invoicing · controlkart.com</div>
    </div>, { width: 1200, height: 630 }
  )
}
