// Static info pages rendered at `/pages/[slug]` (T59), keyed by slug.
// Modeled on the clone's `src/data/info-pages.ts` structure
// (`Record<slug, { title, html }>`), rewritten for ControlKart: an
// India-based B2B distributor of industrial controls (PLCs, contactors,
// VFDs, switchgear, automation parts) shipping via Shiprocket, invoicing
// under GST, and supporting quotes/bulk ordering.
//
// `<!-- TODO(content) -->` marks copy the business must confirm/fill in
// (registered address, phone, GSTIN, return window, etc.) before launch.
import type { InfoPage } from "./types";

export const infoPages: Record<string, InfoPage> = {
  "about-us": {
    title: "About Us",
    html: `
<p>ControlKart supplies industrial automation and control components — PLCs, contactors, relays, VFDs, switchgear, and panel-building hardware — to OEMs, panel builders, system integrators, and MSMEs across India.</p>
<p>We stock genuine parts from leading manufacturers including Siemens, Schneider Electric, ABB, and Mitsubishi Electric, backed by manufacturer warranties, GST-compliant invoicing, and support for bulk and institutional orders.</p>
<p>Whether you need a single contactor for a repair or a bill of materials for a new control panel, our team can help you find the right part and, for larger orders, put together a formal quote.</p>
<!-- TODO(content): confirm company history / founding year / registered entity details -->
`.trim(),
  },
  "contact-us": {
    title: "Contact Us",
    html: `
<p><strong>Our product and applications team</strong> is happy to help with part selection, stock availability, bulk pricing, and order status.</p>
<h2>Sales &amp; Support</h2>
<p>
  Phone: <!-- TODO(content): support phone number --><br />
  Email: <a href="mailto:support@controlkart.com">support@controlkart.com</a><br />
  Hours: Mon-Sat 9:30am-6:30pm IST <!-- TODO(content): confirm hours -->
</p>
<h2>Registered Office</h2>
<p>
  Kleanair Equipments<br />
  House No. E40-37, Ground Floor, BPTP Elite Floor,<br />
  Block-E, Sector-85,<br />
  Faridabad, Haryana - 121002<br />
  GSTIN: 06AIYPM2986R1ZW
</p>
<h2>Bulk orders &amp; quotes</h2>
<p>For multi-line or project orders, use <a href="/quick-order">Quick Order</a> to add several SKUs at once, or submit a <a href="/request-quote">Request a Quote</a> and our team will get back to you with pricing and lead times.</p>
`.trim(),
  },
  "customer-faq": {
    title: "Customer FAQ",
    html: `
<p>Orders are typically dispatched within 1-2 business days of payment confirmation. Orders placed before 2:00pm IST on a business day are prioritized for same-day dispatch where stock allows. <!-- TODO(content): confirm dispatch SLA --></p>
<h2>Will I get a GST invoice?</h2>
<p>Yes. Every order is issued a GST-compliant tax invoice automatically. Add your company GSTIN at checkout to have it reflected on the invoice, and download it any time from your <a href="/account">account</a> order history.</p>
<h2>Do you offer bulk or institutional pricing?</h2>
<p>Yes. Use <a href="/quick-order">Quick Order</a> to add multiple SKUs by part number, or submit a <a href="/request-quote">Request a Quote</a> for project-level pricing and lead times.</p>
<h2>How do I track my order?</h2>
<p>Once your order ships, you'll receive a tracking link by email. You can also view fulfillment status any time from your <a href="/account">account</a>.</p>
<h2>What payment methods do you accept?</h2>
<p>UPI, credit/debit cards, and net banking via Razorpay. For approved quotes, we also support NEFT/RTGS bank transfer. <!-- TODO(content): confirm additional payment terms --></p>
<h2>Do parts carry a warranty?</h2>
<p>Yes, all parts carry the original manufacturer's warranty. Keep your GST invoice as proof of purchase for any warranty claim.</p>
<h2>What is your return policy?</h2>
<p>See our <a href="/pages/refunds-returns">Refunds &amp; Returns</a> page for the full policy.</p>
<h2>I have a complaint — what do I do?</h2>
<p>Please <a href="/pages/contact-us">contact us</a> and our support team will help resolve it.</p>
`.trim(),
  },
  "delivery-options": {
    title: "Delivery Options",
    html: `
<p>We ship orders across India through our logistics partner network (via Shiprocket), covering most serviceable pincodes nationwide. A small number of remote pincodes may have limited or extended-lead-time coverage. <!-- TODO(content): confirm serviceability exceptions --></p>
<div class="table-wrapper">
<table width="100%">
  <tbody>
    <tr><td>Delivery type</td><td>Estimated time</td></tr>
    <tr><td>Standard delivery</td><td><!-- TODO(content): standard delivery window (e.g. 3-5 business days) --></td></tr>
    <tr><td>Metro / major city</td><td><!-- TODO(content): metro delivery window --></td></tr>
    <tr><td>Bulk / palletized orders</td><td>Arranged separately by our logistics team — <a href="/pages/contact-us">contact us</a> for a freight quote</td></tr>
  </tbody>
</table>
</div>
<p>Shipping charges: <!-- TODO(content): confirm shipping fee / free-shipping threshold --></p>
<h2>Tracking</h2>
<p>Once dispatched, you'll receive an email/SMS with a tracking link. You can also check shipment status from your <a href="/account">account</a> order history.</p>
<p>Please inspect packages on delivery. Damaged-in-transit items should be reported per our <a href="/pages/refunds-returns">Refunds &amp; Returns</a> policy.</p>
`.trim(),
  },
  "privacy-policy": {
    title: "Privacy Policy",
    html: `
<p>This privacy policy explains how ControlKart ("we", "us") collects, uses, and protects your personal data when you use this website and place orders with us.</p>
<h2>What data do we collect?</h2>
<ul>
  <li>Identity and contact information (name, phone number, email address)</li>
  <li>Billing and shipping addresses, and GSTIN where provided for invoicing</li>
  <li>Order history and payment status (payment card/UPI details are processed directly by our payment gateway, Razorpay, and are not stored on our servers)</li>
  <li>Basic usage data collected via cookies (see below)</li>
</ul>
<h2>How do we use your data?</h2>
<ul>
  <li>To process and fulfil your orders and issue GST-compliant invoices</li>
  <li>To provide order status, shipping updates, and customer support</li>
  <li>To respond to quote requests and bulk order enquiries</li>
  <li>To prevent fraud and comply with applicable law</li>
</ul>
<h2>Sharing with third parties</h2>
<p>We share the minimum data necessary with service providers who help us operate: our payment gateway (Razorpay) for payment processing, our logistics partner (Shiprocket) for delivery and tracking, and our hosting/infrastructure providers. We do not sell your personal data.</p>
<h2>Cookies</h2>
<p>We use cookies to keep you signed in, remember your cart, and understand basic site usage. You can control cookies through your browser settings; disabling them may affect site functionality.</p>
<h2>Data retention &amp; security</h2>
<p>We retain order and invoice records as required under Indian tax law and take reasonable technical measures to protect your data. <!-- TODO(content): confirm retention period and security certifications, if any --></p>
<h2>Your rights</h2>
<p>You may request access to, correction of, or deletion of your personal data (subject to statutory record-keeping requirements) by contacting us — see <a href="/pages/contact-us">Contact Us</a>.</p>
<h2>Grievance Officer</h2>
<p>In accordance with the Information Technology Act, 2000 and rules made thereunder, the contact details of our Grievance Officer are:</p>
<p>
  Kleanair Equipments<br />
  House No. E40-37, Ground Floor, BPTP Elite Floor, Block-E, Sector-85, Faridabad, Haryana - 121002<br />
  Email: <a href="mailto:support@controlkart.com">support@controlkart.com</a>
  <!-- TODO(content): Grievance Officer name, designation, phone -->
</p>
<h2>Changes to this policy</h2>
<p>We may update this policy from time to time; the latest version will always be available on this page.</p>
`.trim(),
  },
  "refunds-returns": {
    title: "Refunds & Returns",
    html: `
<p>Please <a href="/pages/contact-us">contact our support team</a> before returning any item to obtain a return authorization — this helps us process your refund or replacement faster.</p>
<h2>Return window</h2>
<p>Eligible items may be returned within <!-- TODO(content): return window, e.g. 7/10 days --> of delivery, in their original condition and packaging, with the GST invoice as proof of purchase.</p>
<h2>Non-returnable items</h2>
<ul>
  <li>Items marked as custom-configured, cut-to-length, or made-to-order</li>
  <li>Opened electrical/electronic components where safety or resale cannot be assured</li>
  <li><!-- TODO(content): additional non-returnable categories --></li>
</ul>
<h2>Damaged or incorrect items</h2>
<p>If an item arrives damaged or doesn't match your order, report it within 48 hours of delivery with photos via <a href="/pages/contact-us">Contact Us</a> or your <a href="/account">account</a>, and we will arrange a replacement or refund at no cost to you.</p>
<h2>How refunds are issued</h2>
<p>Approved refunds are issued to the original payment method (or by bank transfer for NEFT/RTGS orders), along with a GST credit note. Refund processing typically takes <!-- TODO(content): refund processing time --> after the returned item is received and inspected.</p>
<h2>Restocking</h2>
<p><!-- TODO(content): confirm whether a restocking fee applies to non-defective returns --></p>
`.trim(),
  },
  "terms-conditions": {
    title: "Terms & Conditions",
    html: `
<p>These Terms and Conditions govern your use of the ControlKart website and any orders placed through it. By using this website or placing an order, you agree to be bound by these Terms.</p>
<h2>Company information</h2>
<p>
  Kleanair Equipments<br />
  House No. E40-37, Ground Floor, BPTP Elite Floor, Block-E, Sector-85, Faridabad, Haryana - 121002<br />
  GSTIN: 06AIYPM2986R1ZW<br />
  CIN: <!-- TODO(content), if applicable -->
</p>
<h2>Products &amp; pricing</h2>
<p>We make reasonable efforts to ensure product descriptions, specifications, and images are accurate, but manufacturers may change specifications without notice. Listed prices are in INR; GST is shown separately at checkout unless stated as inclusive. We reserve the right to correct pricing or listing errors and to cancel affected orders, with a full refund.</p>
<h2>Quotes</h2>
<p>Quotes generated via <a href="/request-quote">Request a Quote</a> are valid for the period stated on the quote document (or, if unstated, <!-- TODO(content): default quote validity period -->) and are subject to stock availability at the time of order confirmation.</p>
<h2>Orders &amp; payment</h2>
<p>An order is confirmed once payment is received (or, for approved credit/quote customers, per agreed payment terms). We accept UPI, cards, and net banking via Razorpay, and NEFT/RTGS for approved quotes.</p>
<h2>Intellectual property</h2>
<p>All content on this website, other than manufacturer trademarks and product imagery, is the property of ControlKart and may not be reproduced without permission.</p>
<h2>Limitation of liability</h2>
<p>To the extent permitted by law, ControlKart is not liable for indirect or consequential loss arising from use of this website or products purchased through it, beyond the value of the relevant order.</p>
<h2>Governing law &amp; jurisdiction</h2>
<p>These Terms are governed by the laws of India, and disputes are subject to the exclusive jurisdiction of the courts of <!-- TODO(content): city -->.</p>
<h2>Changes to these Terms</h2>
<p>We may revise these Terms at any time; continued use of the website after changes are posted constitutes acceptance of the revised Terms.</p>
`.trim(),
  },
};
