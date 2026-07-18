import * as React from "react"
import { Button, Heading, Link, Section, Text } from "@react-email/components"
import { BrandLayout, brand } from "./brand-layout"

export type PasswordResetProps = { url: string }

const buttonStyle: React.CSSProperties = {
  backgroundColor: brand.blue,
  color: brand.white,
  padding: "12px 32px",
  borderRadius: "8px",
  fontSize: "15px",
  fontWeight: 600,
  textDecoration: "none",
  display: "inline-block",
}

export function PasswordReset({ url }: PasswordResetProps) {
  return (
    <BrandLayout preview="Reset your ControlKart password">
      <Heading
        as="h1"
        style={{
          margin: "0 0 12px",
          fontSize: "22px",
          fontWeight: 600,
          color: brand.dark,
        }}
      >
        Reset your password
      </Heading>
      <Text style={{ margin: "0 0 8px", fontSize: "15px", lineHeight: "24px", color: brand.body }}>
        We received a request to reset the password for your ControlKart
        account. Click the button below to choose a new one.
      </Text>

      <Section style={{ textAlign: "center", margin: "28px 0" }}>
        <Button href={url} style={buttonStyle}>
          Reset password
        </Button>
      </Section>

      <Text style={{ margin: "0 0 4px", fontSize: "13px", lineHeight: "20px", color: brand.body }}>
        This link expires in 15 minutes. If the button doesn&apos;t work, paste
        this URL into your browser:
      </Text>
      <Text style={{ margin: "0 0 20px", fontSize: "13px", lineHeight: "20px", wordBreak: "break-all" }}>
        <Link href={url} style={{ color: brand.blue }}>
          {url}
        </Link>
      </Text>

      <Text style={{ margin: 0, fontSize: "13px", lineHeight: "20px", color: brand.muted }}>
        If you didn&apos;t request a reset, you can safely ignore this email —
        your password stays unchanged.
      </Text>
    </BrandLayout>
  )
}

PasswordReset.PreviewProps = {
  url: "https://controlkart.com/reset-password?token=preview-token-123",
} satisfies PasswordResetProps

export default PasswordReset
