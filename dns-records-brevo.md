# Brevo DNS Records for timeo.my

Add these 4 DNS records in **Spaceship** → Domains → timeo.my → DNS Records.

---

## 1. Brevo Code (TXT)

| Field | Value |
|-------|-------|
| Type  | TXT   |
| Name  | `@`   |
| Value | `brevo-code:f6f6dbcddc54e206af22a6cced76654c` |

---

## 2. DKIM 1 (CNAME)

| Field | Value |
|-------|-------|
| Type  | CNAME |
| Name  | `brevo1._domainkey` |
| Value | `b1.timeo-my.dkim.brevo.com` |

---

## 3. DKIM 2 (CNAME)

| Field | Value |
|-------|-------|
| Type  | CNAME |
| Name  | `brevo2._domainkey` |
| Value | `b2.timeo-my.dkim.brevo.com` |

---

## 4. DMARC (TXT)

| Field | Value |
|-------|-------|
| Type  | TXT   |
| Name  | `_dmarc` |
| Value | `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com` |

---

## After Adding Records

1. Go back to Brevo → Settings → Senders, domains, IPs → Domains → timeo.my
2. Click **"Authenticate this email domain"**
3. DNS propagation can take up to 48 hours (usually much faster)
4. Once verified, update `.env`: `EMAIL_FROM=noreply@timeo.my`
