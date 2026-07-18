import * as React from "react"
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"

/**
 * ControlKart brand palette — mirrors the storefront "athens" tokens
 * (apps/storefront/src/app/globals.css) so emails match the site.
 */
export const brand = {
  blue: "#004fc7",
  dark: "#232323",
  body: "#676767",
  line: "#dfdfdf",
  band: "#f8f8f8",
  muted: "#9a9a9a",
  white: "#ffffff",
}

const fontStack =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

/**
 * Shared shell for every transactional email: white card on a grey band with a
 * brand-blue header wordmark and a muted footer. Uses inline styles only (no
 * Tailwind/media queries) for maximum email-client compatibility.
 */
export function BrandLayout({
  preview,
  children,
}: {
  preview: string
  children: React.ReactNode
}) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: brand.band,
          margin: 0,
          padding: "24px 12px",
          fontFamily: fontStack,
        }}
      >
        <Container
          style={{
            maxWidth: "480px",
            margin: "0 auto",
            backgroundColor: brand.white,
            borderRadius: "12px",
            overflow: "hidden",
            border: `1px solid ${brand.line}`,
          }}
        >
          <Section style={{ backgroundColor: brand.blue, padding: "20px 32px" }}>
            <Text
              style={{
                margin: 0,
                color: brand.white,
                fontSize: "20px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              ControlKart
            </Text>
          </Section>

          <Section style={{ padding: "32px" }}>{children}</Section>

          <Hr style={{ borderColor: brand.line, margin: 0 }} />

          <Section style={{ padding: "20px 32px" }}>
            <Text
              style={{
                margin: 0,
                fontSize: "12px",
                lineHeight: "18px",
                color: brand.muted,
              }}
            >
              ControlKart — industrial controls &amp; automation parts.
            </Text>
            <Text
              style={{
                margin: "6px 0 0",
                fontSize: "12px",
                lineHeight: "18px",
                color: brand.muted,
              }}
            >
              Need help? Reply to this email or visit{" "}
              <Link href="https://controlkart.com" style={{ color: brand.blue }}>
                controlkart.com
              </Link>
              .
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
