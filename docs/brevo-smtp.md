# Brevo Production SMTP Configuration Guide

This document records the production transactional email setup for SerbisyoGo via Brevo (formerly Sendinblue).

---

## 1. Overview
* **Provider:** Brevo (Sendinblue)
* **Free Allowance:** 300 emails/day (9,000/month) to any recipient
* **Status:** Verified & Active in Supabase

---

## 2. Supabase Configuration
Located at: `Authentication` → `Emails` → `SMTP Settings`

| Setting | Value |
| :--- | :--- |
| **Enable custom SMTP** | `ON` (enabled) |
| **Sender email address** | `joverarocha@gmail.com` |
| **Sender name** | `SerbisyoGo` |
| **Host** | `smtp-relay.brevo.com` |
| **Port number** | `587` |
| **Username** | `ab6976001@smtp-brevo.com` |
| **Password** | Brevo SMTP Key (`xsmtpsib-...`) |

---

## 3. Brevo Account Settings
* **Sender Verification:** Under `Senders, domains, IPs`, `joverarocha@gmail.com` is registered and verified.
* **IP Restrictions:** Under `Security` → `Authorized IPs`, **Blocking unauthorized IP addresses for SMTP keys** is **Deactivated** so Supabase's dynamic cloud infrastructure can relay messages without restriction.

---

## 4. Verification Evidence
Live delivery tests executed and confirmed:
* Password recovery request to `joverledesma4@gmail.com`: `{ data: {}, error: null }`
* Password recovery request to `customer1@gmail.com`: `{ data: {}, error: null }`
