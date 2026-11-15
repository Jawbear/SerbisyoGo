/* ────────────────────────────────────────────────────────────────────────────
 * SerbisyoGo — Structured policy content
 *
 * Each policy is an object with an effectiveDate and an array of sections.
 * The PolicyPage renderer in src/features/policies/ turns these into a
 * formatted, navigable page.
 * ──────────────────────────────────────────────────────────────────────────── */

import { policyApproval, peso, percent } from './policy-approval';

export interface PolicySection {
  title: string;
  content: string;
}

export interface Policy {
  effectiveDate: string;
  title: string;
  sections: PolicySection[];
}

const supportContact = policyApproval.supportEmail || 'the Support page in your account';
const supportEmailLine = policyApproval.supportEmail || '[support email pending operator approval]';
const dpoContact = policyApproval.dpoEmail || 'the Support page (Data Protection Officer details pending operator approval)';
const dpoEmailLine = policyApproval.dpoEmail || '[Data Protection Officer email pending operator approval]';
const fee = peso(policyApproval.bookingFeeCentavos);
const commission = percent(policyApproval.commissionBps);
const exampleLabor = 50_000;
const exampleFee = policyApproval.bookingFeeCentavos;
const exampleTotal = exampleLabor + exampleFee;
const exampleCommission = Math.round((exampleLabor * policyApproval.commissionBps) / 10_000);
const examplePayout = exampleLabor - exampleCommission;

/* ═══════════════════════════════════════════════════════════════════════════
 * 1. TERMS OF SERVICE
 * ═══════════════════════════════════════════════════════════════════════════ */

export const termsOfService: Policy = {
  effectiveDate: policyApproval.effectiveDate,
  title: 'Terms of Service',
  sections: [
    {
      title: '1. Introduction & Acceptance',
      content: `Welcome to SerbisyoGo (the "Platform"). By accessing or using our website, mobile application, or any related services, you agree to be bound by these Terms of Service ("Terms"). If you do not agree, please do not use the Platform.

SerbisyoGo is operated as an online home-services marketplace based in Bunawan, Agusan del Sur, Philippines. These Terms are governed by the laws of the Republic of the Philippines.

(Tagalog: Sa paggamit mo ng SerbisyoGo, sumasang-ayon ka sa mga patakaran na ito. Kung hindi ka sumasang-ayon, huwag gamitin ang platform.)`
    },
    {
      title: '2. Service Description & Scope',
      content: `SerbisyoGo is an online marketplace that connects customers ("Customers") with independent local service professionals ("Providers") offering home services, including but not limited to: electrical work, plumbing, carpentry, painting, cleaning, appliance repair, and other home maintenance services.

Important: SerbisyoGo is a MARKETPLACE PLATFORM only. We do not provide, perform, or guarantee any home services ourselves. We are not a service provider, employer, or contractor. We facilitate connections between Customers and Providers.

(Tagalog: Ang SerbisyoGo ay isang marketplace lamang. Hindi kami ang nagbibigay o gumagawa ng mga serbisyo — nagkokonekta lang kami ng mga customer at service provider.)`
    },
    {
      title: '3. Platform vs. Provider Relationship',
      content: `Providers listed on SerbisyoGo are independent professionals. They are NOT employees, agents, or representatives of SerbisyoGo. The Platform:

• Does not control the methods, timing, or manner in which Providers perform their services.
• Does not guarantee the quality, safety, or legality of any service listed.
• Does not set the labor rates charged by Providers (Providers set their own rates).
• Facilitates the booking process and payment collection, but is not a party to the service contract between Customer and Provider.

Any agreement for services is solely between the Customer and the Provider.`
    },
    {
      title: '4. User Eligibility',
      content: `To use SerbisyoGo, you must:

• Be at least 18 years old.
• Have the legal capacity to enter into binding agreements.

To register as a Provider, you must additionally:
• Possess a valid Philippine government-issued ID (for identity verification).
• Submit verification documents through the Platform for admin review and approval.
• Comply with all local regulations applicable to the services you provide.
• Be authorized to work in the Philippines.

(Tagalog: Dapat ikaw ay 18 taong gulang pataas upang gumamit ng SerbisyoGo. Ang mga Provider ay kailangang magpasa ng valid na government ID para sa verification.)`
    },
    {
      title: '5. Account Registration & Responsibilities',
      content: `When you create an account, you agree to:

• Provide accurate, complete, and current information (name, email, phone number in +639XXXXXXXXX format, and address).
• Maintain the security of your account credentials. You are responsible for all activity under your account.
• Not share your account with others or transfer it to another person.
• Notify us immediately of any unauthorized use of your account.
• Keep your profile information up to date.

We use Supabase Auth for account management, which includes email verification and password recovery. You must verify your email address to fully activate your account.

SerbisyoGo reserves the right to suspend or terminate accounts that violate these Terms, provide fraudulent information, or engage in prohibited conduct.`
    },
    {
      title: '6. Booking Process',
      content: `The booking process on SerbisyoGo follows these steps:

1. Draft — The Customer creates a booking request specifying the service needed, preferred schedule, and location.
2. Request — The Customer submits the booking request to the selected Provider.
3. Confirm — The Provider reviews and accepts the booking, confirming the schedule and pricing.
4. In Progress — The Provider performs the service at the agreed time and location.
5. Complete — The service is completed, and the booking is marked as finished.

Important scheduling notes:
• All schedules are in Philippine Standard Time (Asia/Manila, UTC+8).
• The system prevents double-booking — a Provider cannot be booked for overlapping time slots.
• Both Customers and Providers will receive real-time notifications for booking status changes.

(Tagalog: Ang booking ay dumadaan sa mga hakbang: Draft → Request → Confirm → In Progress → Complete.)`
    },
    {
      title: '7. Pricing & Fees',
      content: `SerbisyoGo uses transparent pricing:

• Labor Rate — Set by the Provider for each service offered. The Provider has full control over their rates.
• Booking Fee — ${fee} per booking, charged to the Customer. The operator publishes the active fee in Admin → Settings and may change it with prior notice.
• Platform Commission — ${commission} of the labor amount, which is the Platform's service fee. The operator publishes the active rate in Admin → Settings and may adjust it with prior notice.
• Total Amount — Calculated as: Labor + Booking Fee. The commission is recorded against the Provider's payout.

Price Snapshot: All rates are locked in at the time the booking is confirmed. Any subsequent changes to Provider rates or Platform fees will NOT affect existing confirmed bookings.

There are no hidden fees. The total amount shown at booking time is the total amount you will pay.

For a complete breakdown, please see our Pricing Policy page.

(Tagalog: Walang nakatagong bayad. Ang presyo na makikita mo sa booking ay siya ring babayaran mo.)`
    },
    {
      title: '8. Payment Terms',
      content: `SerbisyoGo supports the following payment methods:

GCash (manual transfer with receipt review):
• After service completion, the Customer may send the agreed amount to the GCash recipient shown in the booking details.
• The Customer submits the GCash reference and a private receipt. The payment remains pending until an administrator independently checks the wallet transaction and records the result.
• SerbisyoGo does not operate an online payment gateway, does not charge a card, and does not move funds automatically. Uploading a receipt does not confirm payment.
• GCash transactions are subject to GCash's own terms of service and transaction limits.

Cash Settlement:
• For services where cash payment is arranged, settlement occurs directly between the Customer and Provider upon completion of the service.
• SerbisyoGo is not responsible for disputes arising from cash transactions.

Invoice Generation:
• An invoice is automatically generated upon job completion.
• Invoices include a breakdown of labor cost, booking fee, and commission.
• Invoices are available in your booking history.

All monetary amounts on the Platform are in Philippine Pesos (₱/PHP).`
    },
    {
      title: '9. Cancellation Policy',
      content: `Cancellations are handled as follows:

Customer Cancellation:
• Customers may cancel a booking while it is in "Requested" or "Confirmed" status.
• A cancellation reason is required.
• Refund eligibility depends on the timing and circumstances of the cancellation (see Refund Policy below).

Provider Decline:
• Providers may decline a booking request before accepting it.
• If a Provider needs to cancel after confirming, they must provide a reason.

Admin Cancellation:
• Platform administrators may cancel bookings in cases of policy violation, reported fraud, or dispute resolution.
• All admin cancellations are audited and logged.

Note: Once a service is "In Progress," it cannot be cancelled through the Platform. Please contact support for assistance.

(Tagalog: Maaaring i-cancel ng Customer ang booking habang nasa "Requested" o "Confirmed" status. Kailangan magbigay ng dahilan ng cancellation.)`
    },
    {
      title: '10. Refund Policy',
      content: `Refund requests are handled with the following process:

• There are NO automatic refunds. All refund requests require admin review.
• To request a refund, contact support through ${supportContact}.
• Refund eligibility is evaluated on a case-by-case basis, considering:
  — Whether the service was performed
  — The reason for cancellation
  — How much time passed between booking and cancellation
  — Whether the Provider had already incurred costs
• An approved refund decision is recorded on the Platform. Approval does not move money automatically; any actual GCash or cash refund requires a separate recorded transfer and verification step.
• The operator must publish an approved refund turnaround time before launch.

(Tagalog: Walang awtomatikong refund. Lahat ng refund request ay susuriin ng admin bago aprubahan.)`
    },
    {
      title: '11. Provider Verification & Approval',
      content: `To maintain trust and safety on the Platform:

• Providers must submit government-issued identification documents during registration.
• Submitted documents are stored securely in private storage and are accessible ONLY to Platform administrators for verification purposes.
• Admin reviews and approves or rejects Provider applications.
• The verification process does not constitute an endorsement of the Provider's skills or guarantee of service quality.
• SerbisyoGo reserves the right to revoke Provider status at any time for violations of these Terms.
• Providers must update their documents if they expire or change.`
    },
    {
      title: '12. Prohibited Conduct',
      content: `You agree NOT to:

• Use the Platform for any unlawful purpose or in violation of any applicable law.
• Provide false or misleading information in your account or listings.
• Impersonate another person or entity.
• Harass, threaten, or abuse other users (Customers, Providers, or staff).
• Attempt to circumvent the Platform's booking or payment system.
• Use the Platform to spam, advertise unrelated products, or distribute harmful content.
• Interfere with the proper functioning of the Platform (hacking, injecting malicious code, etc.).
• Collect personal information of other users without their consent.
• Discriminate against any user based on race, religion, gender, age, disability, or any protected characteristic.
• Post fraudulent reviews or ratings.
• Use location data for any purpose other than the active booking.

Violations may result in account suspension or permanent termination.`
    },
    {
      title: '13. Location Sharing',
      content: `SerbisyoGo offers optional GPS location sharing for Providers during active jobs:

• Location sharing is opt-in — Providers choose whether to share their location.
• Location data is shared ONLY during an active/in-progress booking.
• Location data is visible ONLY to the Customer associated with that booking and Platform administrators.
• Location data is automatically removed from the system when the booking is marked as complete.
• Location data is never sold or shared with third parties.

(Tagalog: Ang location sharing ay opsyonal at para lang sa aktibong booking. Awtomatikong tinatanggal kapag tapos na ang serbisyo.)`
    },
    {
      title: '14. Messaging & Communication',
      content: `The Platform provides a real-time messaging system for Customers and Providers:

• Messages are used to coordinate booking details, scheduling, and service requirements.
• Message content is stored on the Platform and is accessible to the booking participants and Platform administrators.
• Do not share sensitive personal information (e.g., bank details, passwords) through messages.
• All Platform communications are subject to these Terms and our Privacy Policy.
• The messaging system must not be used for harassment, spam, or any prohibited conduct.`
    },
    {
      title: '15. Intellectual Property',
      content: `• The SerbisyoGo name, logo, design, and all related content on the Platform are owned by SerbisyoGo and protected by applicable intellectual property laws.
• Users retain ownership of content they create (such as profile descriptions, photos, and reviews), but grant SerbisyoGo a non-exclusive, royalty-free license to use, display, and distribute such content on the Platform.
• You may not copy, modify, distribute, or create derivative works from any SerbisyoGo content without prior written permission.
• The Platform's source code, design, and architecture are proprietary.`
    },
    {
      title: '16. Limitation of Liability',
      content: `To the maximum extent permitted by Philippine law:

• SerbisyoGo acts solely as a marketplace facilitator. We are NOT a party to any service agreement between Customers and Providers.
• We do not guarantee the quality, safety, legality, or timeliness of any service provided through the Platform.
• SerbisyoGo shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising from:
  — The use or inability to use the Platform
  — Any service performed or not performed by a Provider
  — Any dispute between a Customer and Provider
  — Loss of data, revenue, or profits
  — Unauthorized access to your account
• Our total liability to you for any claim shall not exceed the amount of fees you have paid to SerbisyoGo in the 12 months preceding the claim.
• SerbisyoGo is not responsible for any property damage, personal injury, or other harm resulting from services arranged through the Platform.

(Tagalog: Ang SerbisyoGo ay marketplace lamang. Hindi kami responsable sa kalidad o resulta ng serbisyo ng mga Provider.)`
    },
    {
      title: '17. Dispute Resolution',
      content: `If a dispute arises between a Customer and a Provider:

1. We encourage both parties to communicate directly and attempt to resolve the issue.
2. Either party may file a complaint through the Platform's support system.
3. Platform administrators will review complaints and may mediate, but SerbisyoGo is not obligated to resolve disputes.
4. If a resolution cannot be reached through the Platform, parties may pursue remedies available under Philippine law.

For disputes between a user and SerbisyoGo:
• Disputes shall first be resolved through good-faith negotiation.
• If negotiation fails, disputes shall be submitted to mediation or arbitration in accordance with Philippine law.
• The venue for any legal proceedings shall be the appropriate courts of Agusan del Sur, Philippines.`
    },
    {
      title: '18. Governing Law',
      content: `These Terms are governed by and construed in accordance with the laws of the Republic of the Philippines, including but not limited to:

• Republic Act No. 7394 — Consumer Act of the Philippines
• Republic Act No. 10173 — Data Privacy Act of 2012
• Republic Act No. 8792 — Electronic Commerce Act
• Civil Code of the Philippines

Any disputes shall be subject to the exclusive jurisdiction of the courts of Agusan del Sur, Philippines.`
    },
    {
      title: '19. Modification of Terms',
      content: `SerbisyoGo reserves the right to update or modify these Terms at any time. When we make changes:

• The updated Terms will be posted on this page with a new "Effective Date."
• Registered users will be notified of material changes through email or in-app notification.
• Your continued use of the Platform after the updated Terms are posted constitutes your acceptance of the changes.
• If you do not agree with the updated Terms, you must stop using the Platform and deactivate your account.

We recommend reviewing these Terms periodically to stay informed.

(Tagalog: Maaaring baguhin ang mga patakaran na ito. Aabisuhin namin kayo sa email o sa app kung may mahahalagang pagbabago.)`
    },
    {
      title: '20. Contact Information',
      content: `If you have questions, concerns, or feedback about these Terms, please contact us:

Email: ${supportEmailLine}
Platform: Use the Support page in your account dashboard
Location: ${policyApproval.businessAddress}

The operator must publish an approved response-time commitment before launch.

(Tagalog: Para sa mga katanungan, gamitin ang Support page sa iyong account o ang published na support email.)`
    }
  ]
};

/* ═══════════════════════════════════════════════════════════════════════════
 * 2. PRIVACY POLICY
 * ═══════════════════════════════════════════════════════════════════════════ */

export const privacyPolicy: Policy = {
  effectiveDate: policyApproval.effectiveDate,
  title: 'Privacy Policy',
  sections: [
    {
      title: '1. Introduction',
      content: `This Privacy Policy explains how SerbisyoGo ("we," "us," "our") collects, uses, stores, and protects your personal information when you use our marketplace platform. This policy is in compliance with Republic Act No. 10173, also known as the Data Privacy Act of 2012 (DPA), and its Implementing Rules and Regulations (IRR).

By using SerbisyoGo, you consent to the collection and processing of your personal information as described in this policy.

(Tagalog: Ipinapaliwanag ng Privacy Policy na ito kung paano namin kinokolekta, ginagamit, at pinoprotektahan ang iyong personal na impormasyon alinsunod sa Data Privacy Act of 2012.)`
    },
    {
      title: '2. Data Controller',
      content: `SerbisyoGo is the personal information controller (PIC) responsible for the processing of your personal data.

Data Protection Officer (DPO):
Email: ${dpoEmailLine}
Address: ${policyApproval.businessAddress}

If you have any concerns about how your data is handled, you may contact our DPO at any time.`
    },
    {
      title: '3. Personal Information We Collect',
      content: `We collect the following categories of personal information:

Account Information:
• Full name
• Email address
• Phone number (in +639XXXXXXXXX format)
• Password (stored as a secure hash — we never store plain-text passwords)

Profile Information:
• Profile photo (optional)
• Address/es (for service location)
• Account preferences

Booking & Transaction Information:
• Booking history (services requested, dates, status)
• Payment records
• Invoices
• Messages exchanged between Customers and Providers
• Reviews and ratings

Device & Usage Information:
• Browser type and version
• Device type
• IP address (for security purposes)
• Pages visited and features used (anonymized analytics)

(Tagalog: Kinokolekta namin ang iyong pangalan, email, phone number, address, at booking history upang maibigay ang serbisyo.)`
    },
    {
      title: '4. Sensitive Personal Information',
      content: `For Provider verification, we collect the following sensitive personal information as defined by the DPA:

• Government-issued identification documents (such as Philippine national ID, driver's license, passport, or other valid IDs).

Important protections for sensitive data:
• These documents are stored in private, encrypted storage (Supabase Storage private buckets).
• Access is restricted ONLY to authorized Platform administrators for verification purposes.
• Documents are accessed through signed URLs that expire after 60 seconds.
• We do NOT share verification documents with Customers or any third party.
• Providers may request deletion of their verification documents, subject to legal retention requirements.

(Tagalog: Ang mga government ID na isinusumite ng mga Provider ay naka-store nang pribado at encrypted. Tanging mga admin lamang ang makakakita nito para sa verification.)`
    },
    {
      title: '5. Purpose & Legal Basis for Processing',
      content: `We process your personal information for the following purposes and legal bases under the DPA:

Consent (Section 12(a) DPA):
• Account creation and management
• Profile photo upload
• Optional location sharing during active jobs
• Marketing communications (opt-in only)

Contractual Necessity (Section 12(b) DPA):
• Processing bookings between Customers and Providers
• Payment processing and invoicing
• Messaging between booking participants
• Sending booking confirmations and status updates

Legitimate Interest (Section 12(f) DPA):
• Platform improvement and analytics
• Fraud detection and prevention
• Account security

Legal Obligation (Section 12(c) DPA):
• Compliance with tax and regulatory requirements
• Responding to lawful requests from authorities
• Record-keeping as required by Philippine law`
    },
    {
      title: '6. How We Collect Data',
      content: `We collect personal information through:

Direct Collection:
• When you register for an account
• When you fill in or update your profile
• When you create a booking
• When you send messages through the Platform
• When you submit verification documents (Providers)
• When you upload a profile photo
• When you contact support

Automated Collection:
• Authentication tokens stored in your browser's local storage (via Supabase Auth)
• Device and usage information when you interact with the Platform

We do NOT collect data from social media profiles, third-party data brokers, or public sources.`
    },
    {
      title: '7. Data Storage & Security',
      content: `We take your data security seriously and implement the following measures:

Infrastructure:
• All data is stored on Supabase, a secure cloud platform with encryption at rest and in transit.
• Database access is controlled through Row-Level Security (RLS) policies — users can only access data they are authorized to view.
• Three private storage buckets are used for sensitive files (profile photos, verification documents, and booking-related uploads).
• Signed URLs with 60-second expiry are used for file access — no permanent public links.

Security Measures:
• Passwords are hashed using industry-standard algorithms (never stored in plain text).
• HTTPS/SSL encryption for all data transmitted between your device and our servers.
• Regular security monitoring and updates.
• Access to production systems is restricted to authorized personnel.

(Tagalog: Ang iyong data ay naka-encrypt at protektado sa pamamagitan ng Supabase. Ang mga password ay hindi namin nakikita — naka-hash ang mga ito.)`
    },
    {
      title: '8. Location Data',
      content: `SerbisyoGo offers optional GPS location sharing with the following strict rules:

• Opt-In Only — Location sharing is entirely voluntary. Providers choose whether to share their location.
• Active Jobs Only — Location is shared ONLY during an "In Progress" booking.
• Limited Visibility — Location data is visible only to the Customer in the active booking and Platform administrators.
• Auto-Removal — Location data is automatically deleted from our system when the booking is completed or cancelled.
• No Tracking — We do NOT track user locations outside of active bookings.
• No Sale — Location data is never sold or shared with advertisers or third parties.

(Tagalog: Ang location sharing ay opsyonal at aktibo lang habang may ginagawang serbisyo. Awtomatikong tinatanggal pagkatapos ng booking.)`
    },
    {
      title: '9. Profile Photos & Uploaded Files',
      content: `Users may upload profile photos and other files to the Platform:

• Files are stored in private Supabase Storage buckets.
• Access to files is controlled through Row-Level Security — only authorized users can view them.
• File URLs are signed and expire after 60 seconds for security.
• Users may delete their profile photos at any time through their account settings.
• Provider verification documents are accessible only to administrators.
• We do not use uploaded photos for facial recognition, machine learning training, or any purpose beyond displaying them on the Platform.`
    },
    {
      title: '10. Data Sharing',
      content: `We share your personal information ONLY in the following limited circumstances:

Between Booking Participants:
• When a booking is created, relevant Customer information (name, address, phone) is shared with the Provider, and Provider information (name, phone, profile) is shared with the Customer — only to the extent necessary for the service.

With Platform Administrators:
• Administrators can access user data for verification, support, dispute resolution, and Platform management.

We do NOT:
• Sell your personal information to any third party.
• Share your data with advertisers.
• Share your verification documents with anyone except authorized administrators.
• Transfer your data outside the Philippines without adequate safeguards.`
    },
    {
      title: '11. Third-Party Services',
      content: `SerbisyoGo uses the following third-party services:

• Supabase — Cloud database, authentication, file storage, and real-time features. (Privacy: supabase.com/privacy)
• Cloudflare — Content delivery and web security. (Privacy: cloudflare.com/privacypolicy)
• OpenStreetMap — Map tiles for location display. (Privacy: wiki.osmfoundation.org/Privacy_Policy)
• GCash — Mobile payment processing. (Privacy: gcash.com/privacy)

Each third-party service has its own privacy policy. We encourage you to review them. We only share the minimum data necessary with each service for the Platform to function.`
    },
    {
      title: '12. Data Retention',
      content: `We retain your personal information for as follows:

• Active Account Data — Retained for as long as your account is active.
• Booking History — Retained for a minimum of 3 years after booking completion for record-keeping and dispute resolution purposes, as required by applicable Philippine law.
• Verification Documents — Retained for as long as the Provider account is active, plus 1 year after account deactivation, unless a longer retention is required by law.
• Location Data — Automatically deleted upon booking completion.
• Messages — Retained for as long as your account is active.
• Inactive Accounts — Accounts inactive for more than 2 years may be flagged for deactivation. Users will be notified before any action is taken.

Upon account deletion, your personal data will be anonymized or deleted within 30 days, except where retention is required by law.`
    },
    {
      title: '13. Your Rights Under the DPA',
      content: `Under the Data Privacy Act of 2012, you have the following rights:

Right to Be Informed — You have the right to know how your data is collected and processed (this Privacy Policy).

Right to Access — You may request a copy of the personal information we hold about you.

Right to Correction — You may request correction of any inaccurate or incomplete personal information.

Right to Erasure or Blocking — You may request deletion or blocking of your personal information, subject to legal retention requirements.

Right to Object — You may object to the processing of your personal information in certain circumstances.

Right to Data Portability — You may request a copy of your data in a structured, machine-readable format.

Right to Damages — You may claim compensation for damages sustained due to inaccurate, incomplete, or unauthorized processing of your personal data.

Right to File a Complaint — You may file a complaint with the National Privacy Commission (see Section 17 below).

To exercise any of these rights, contact our DPO at ${dpoContact} or use the Support page in your account.

(Tagalog: May karapatan kang malaman, i-access, itama, i-delete, o ilipat ang iyong personal na data. Gamitin ang Support page sa iyong account.)`
    },
    {
      title: '14. Cookies & Local Storage',
      content: `SerbisyoGo uses minimal browser storage:

• Supabase Auth Tokens — Stored in your browser's local storage to keep you signed in. These tokens are essential for the Platform to function and are automatically refreshed.
• No Third-Party Cookies — We do not use advertising cookies, social media tracking pixels, or third-party analytics cookies.
• No Fingerprinting — We do not use browser fingerprinting techniques.

If you clear your browser's local storage, you will be signed out and will need to log in again.`
    },
    {
      title: '15. Children\'s Privacy',
      content: `SerbisyoGo is NOT intended for use by individuals under 18 years of age. We do not knowingly collect personal information from children under 18.

If we discover that we have collected personal information from a minor, we will promptly delete that information and any associated account.

If you are a parent or guardian and believe your child has provided personal information to SerbisyoGo, please contact us at ${dpoContact}.

(Tagalog: Ang SerbisyoGo ay para sa 18 taong gulang pataas lamang. Hindi kami kumukuha ng impormasyon mula sa mga menor de edad.)`
    },
    {
      title: '16. Data Breach Notification',
      content: `In the event of a personal data breach, SerbisyoGo will:

• Notify the National Privacy Commission (NPC) within 72 hours of becoming aware of the breach, as required by the DPA and NPC Circular 16-03.
• Notify affected users within 72 hours if the breach is likely to result in a risk to their rights and freedoms.
• Provide details about:
  — The nature of the breach
  — The personal information that may have been compromised
  — Steps we are taking to address the breach
  — Recommended actions for affected users

We maintain a data breach response plan and conduct regular security reviews to minimize the risk of breaches.`
    },
    {
      title: '17. National Privacy Commission',
      content: `If you believe that your data privacy rights have been violated, you may file a complaint with the National Privacy Commission:

National Privacy Commission (NPC)
Address: 5th Floor, Delegation Building, PICC Complex, Roxas Boulevard, Pasay City 1307, Philippines
Phone: (02) 8234-2228
Email: complaints@privacy.gov.ph
Website: https://www.privacy.gov.ph

(Tagalog: Kung sa tingin mo ay nilabag ang iyong karapatan sa data privacy, maaari kang magsampa ng reklamo sa National Privacy Commission.)`
    },
    {
      title: '18. Changes to This Privacy Policy',
      content: `We may update this Privacy Policy from time to time. When we make changes:

• The updated policy will be posted on this page with a new "Effective Date."
• For material changes, we will notify registered users via email or in-app notification.
• Your continued use of the Platform after changes are posted constitutes acceptance of the updated policy.

We recommend checking this page periodically for updates.`
    },
    {
      title: '19. Contact Us',
      content: `For questions or concerns about this Privacy Policy or your personal data:

Data Protection Officer (DPO):
Email: ${dpoEmailLine}

General Support:
Email: ${supportEmailLine}
Platform: Use the Support page in your account dashboard

Address: ${policyApproval.businessAddress}

The operator must publish an approved privacy response-time commitment consistent with the Data Privacy Act before launch.

(Tagalog: Para sa mga tanong tungkol sa iyong data privacy, gamitin ang Support page sa iyong account.)`
    }
  ]
};

/* ═══════════════════════════════════════════════════════════════════════════
 * 3. PRICING POLICY
 * ═══════════════════════════════════════════════════════════════════════════ */

export const pricingPolicy: Policy = {
  effectiveDate: policyApproval.effectiveDate,
  title: 'Pricing Policy',
  sections: [
    {
      title: '1. Overview',
      content: `SerbisyoGo is committed to transparent and fair pricing. This Pricing Policy explains how costs are calculated, what fees apply, and how payments are processed on the Platform.

All prices on SerbisyoGo are in Philippine Pesos (₱ / PHP).

(Tagalog: Ang SerbisyoGo ay nakatuon sa malinaw at patas na pagpepresyo. Lahat ng presyo ay nasa Philippine Pesos (₱).)`
    },
    {
      title: '2. How Pricing Works',
      content: `SerbisyoGo uses a simple, transparent pricing structure:

• Labor Rate — Each Provider sets their own rates for the services they offer. SerbisyoGo does not control or dictate Provider pricing.
• Booking Fee — ${fee} per booking, paid by the Customer. The operator publishes the active fee in Admin → Settings.
• Platform Commission — ${commission} of the labor amount, recorded against the Provider's payout. The operator publishes the active rate in Admin → Settings.

(Tagalog: Ang Provider ang nagtatakda ng kanilang sariling presyo. Ang SerbisyoGo ay nagdadagdag ng ${fee} booking fee at kumukuha ng ${commission} commission mula sa labor.)`
    },
    {
      title: '3. Total Cost Calculation',
      content: `Here is how the total amount is calculated for Customers:

Total = Labor Rate + Booking Fee (${fee})

Example:
• Provider's labor rate for plumbing repair: ${peso(exampleLabor)}
• Booking fee: ${fee}
• Total charged to Customer: ${peso(exampleTotal)}

Provider payout (after commission):
• Labor: ${peso(exampleLabor)}
• Commission (${commission} of labor): ${peso(exampleCommission)}
• Provider receives: ${peso(examplePayout)}

Note: The booking fee and commission rate are configurable by the Platform administration and may change with prior notice.`
    },
    {
      title: '4. Quotation-Based Services',
      content: `Some services may be quotation-based rather than having fixed rates:

• Providers may offer an estimated price range for services that require on-site assessment (e.g., large renovation projects, complex repairs).
• Estimates are provided in good faith but may change after the Provider inspects the actual work needed.
• For quotation-based bookings, the Customer and Provider should agree on the final price before the service begins.
• Any price adjustments after a booking is confirmed must be agreed upon by both parties.
• Fixed-rate services have exact pricing shown upfront at booking time.

(Tagalog: Ang ilang serbisyo ay may estimated presyo na maaaring magbago pagkatapos suriin ng Provider ang aktwal na trabaho. Dapat magkasundo ang Customer at Provider sa final na presyo bago magsimula.)`
    },
    {
      title: '5. Price Snapshot',
      content: `To protect both Customers and Providers, SerbisyoGo freezes all pricing at the time of booking confirmation:

• The labor rate at the time the booking is confirmed is the rate that applies to that booking.
• The booking fee at the time of confirmation is the fee that applies.
• The commission rate at the time of confirmation is the rate used for Provider payout calculation.
• If a Provider updates their rates after a booking is confirmed, the update will NOT affect the existing booking.
• If the Platform adjusts the booking fee or commission rate, existing confirmed bookings are NOT affected.

This ensures that you always know exactly what you will pay or receive before the service begins.`
    },
    {
      title: '6. GCash Payment',
      content: `SerbisyoGo supports GCash as a digital payment method:

• After service completion, the Customer sends the agreed amount to the GCash recipient shown in the booking details.
• The Customer submits the GCash reference and a private receipt. An administrator independently checks the wallet transaction before recording the payment as paid.
• SerbisyoGo does not process GCash automatically, does not receive a wallet callback, and does not confirm a payment from a receipt alone.
• GCash transactions are subject to GCash's own terms, conditions, and transaction limits.
• GCash service fees, if any, are determined by GCash and are separate from SerbisyoGo fees.

For GCash support or transaction inquiries, please contact GCash directly through their app or helpline.

(Tagalog: Pagkatapos ng serbisyo, maaaring magpadala ng bayad sa GCash recipient na nasa booking. Susuriin ng admin ang reference at resibo bago itala bilang bayad.)`
    },
    {
      title: '7. Cash Settlement',
      content: `For bookings paid via cash:

• Payment is made directly by the Customer to the Provider upon completion of the service.
• The Customer pays the full amount (labor + booking fee).
• The Provider is responsible for remitting the Platform's commission and booking fee through the agreed process.
• Cash settlements should be made in exact amounts when possible.
• SerbisyoGo is not responsible for disputes arising from cash transactions, lost payments, or incorrect change.
• Customers and Providers are encouraged to confirm the amount before and after payment.

(Tagalog: Sa cash payment, ang Customer ay direktang nagbabayad sa Provider pagkatapos ng serbisyo. Ang Provider ang magre-remit ng commission at booking fee sa Platform.)`
    },
    {
      title: '8. Invoice Generation',
      content: `Invoices are automatically generated by the Platform:

• An invoice is created when a booking is marked as "Complete."
• Each invoice includes:
  — Booking reference number
  — Service description
  — Customer and Provider details
  — Labor amount
  — Booking fee
  — Commission amount
  — Total amount
  — Date of service
  — Payment method used
• Invoices are available in your Booking History and can be printed or saved.
• Invoices serve as official records for both Customers and Providers.`
    },
    {
      title: '9. Provider Payouts',
      content: `After a service is completed, Provider payouts are calculated as follows:

• Payout Amount = Labor Rate − Commission (${commission} of labor)
• The booking fee (${fee}) is retained by the Platform and is NOT deducted from the Provider's labor earnings.
• Payout requests are reviewed against platform-held balances. An approved request records a decision; it does not move money automatically.
• For cash transactions, the Provider collects payment directly from the Customer and the commission is recorded as a receivable.
• Payout schedules and methods may be updated with notice.

(Tagalog: Ang payout ng Provider ay: Labor − ${commission} commission. Ang booking fee ay hindi ibinabawas sa labor ng Provider. Ang approval ay hindi awtomatikong naglilipat ng pera.)`
    },
    {
      title: '10. Refund Eligibility & Process',
      content: `Refunds are handled on a case-by-case basis:

• There are NO automatic refunds on SerbisyoGo.
• To request a refund, the Customer must contact support through ${supportContact}.
• All refund requests are reviewed by Platform administrators.
• Factors considered in refund decisions:
  — Whether the service was started or completed
  — Reason for cancellation or refund request
  — Time elapsed between booking and cancellation
  — Whether the Provider incurred costs in preparation
• An approved refund decision is recorded on the Platform. Approval does not move money automatically; any actual GCash or cash refund requires a separate recorded transfer and verification step.
• The operator must publish an approved refund turnaround time before launch.
• The booking fee may or may not be refundable depending on the circumstances.

(Tagalog: Walang awtomatikong refund. Lahat ng refund request ay sinusuri ng admin.)`
    },
    {
      title: '11. No Hidden Fees',
      content: `SerbisyoGo is committed to full pricing transparency:

• The total amount shown at booking time is the total you will pay (for fixed-rate services).
• There are no hidden charges, service fees, or processing fees beyond the stated booking fee.
• If any fee or rate changes occur, users will be notified in advance.
• Provider rates are fully visible on their profile before you book.

What you see is what you pay.

(Tagalog: Walang nakatagong bayad. Ang presyong nakikita mo sa booking ay siya ring babayaran mo. Walang dagdag na charge.)`
    },
    {
      title: '12. Currency',
      content: `All amounts on SerbisyoGo are in Philippine Pesos (₱ / PHP).

• Internally, all monetary calculations use centavo precision (integer math) to avoid rounding errors.
• Displayed amounts are formatted in pesos (e.g., ${peso(exampleTotal)}).
• SerbisyoGo does not support foreign currencies at this time.`
    },
    {
      title: '13. Changes to Pricing',
      content: `SerbisyoGo reserves the right to adjust the booking fee and commission rate:

• Changes will be announced in advance through the Platform and/or email notification.
• Existing confirmed bookings will NOT be affected by pricing changes (see Price Snapshot, Section 5).
• Provider rates are set by the Providers themselves and may change at their discretion.
• Any changes to this Pricing Policy will be reflected on this page with an updated "Effective Date."

(Tagalog: Maaaring magbago ang booking fee at commission rate, pero ang mga existing booking ay hindi maaapektuhan.)`
    },
    {
      title: '14. Contact Us',
      content: `For questions about pricing, billing, or payments:

Email: ${supportEmailLine}
Platform: Use the Support page in your account dashboard
Location: ${policyApproval.businessAddress}

We are happy to explain any charges or help resolve billing concerns.

(Tagalog: Para sa mga tanong tungkol sa presyo o bayarin, gamitin ang Support page sa iyong account.)`
    }
  ]
};
