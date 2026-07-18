import * as React from "react"
import { Button, Heading, Link, Section, Text } from "@react-email/components"
import { BrandLayout, brand } from "./brand-layout"

export type VerifyEmailProps = { url: string }

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

export function VerifyEmail({ url }: VerifyEmailProps) {
  return (
    <BrandLayout preview="Verify your email to finish setting up your ControlKart account">
      <Heading
        as="h1"
        style={{
          margin: "0 0 12px",
          fontSize: "22px",
          fontWeight: 600,
          color: brand.dark,
        }}
      >
        Verify your email
      </Heading>
      <Text style={{ margin: "0 0 8px", fontSize: "15px", lineHeight: "24px", color: brand.body }}>
        Thanks for creating a ControlKart account. Confirm your email address to
        activate your account and start placing orders.
      </Text>

      <Section style={{ textAlign: "center", margin: "28px 0" }}>
        <Button href={url} style={buttonStyle}>
          Verify email
        </Button>
      </Section>

      <Text style={{ margin: "0 0 4px", fontSize: "13px", lineHeight: "20px", color: brand.body }}>
        This link expires in 24 hours. If the button doesn&apos;t work, paste
        this URL into your browser:
      </Text>
      <Text style={{ margin: "0 0 20px", fontSize: "13px", lineHeight: "20px", wordBreak: "break-all" }}>
        <Link href={url} style={{ color: brand.blue }}>
          {url}
        </Link>
      </Text>

      <Text style={{ margin: 0, fontSize: "13px", lineHeight: "20px", color: brand.muted }}>
        If you didn&apos;t create this account, you can safely ignore this email.
      </Text>
    </BrandLayout>
  )
}

VerifyEmail.PreviewProps = {
  url: "https://controlkart.com/verify-email?token=preview-token-123",
} satisfies VerifyEmailProps

export default VerifyEmail
