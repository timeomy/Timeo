# Lovable Data Export Request — WS Fitness

**To:** Lovable Support
**Subject:** Full Database Export Request — WS Fitness Gym App

---

Hi Lovable team,

I'm migrating my gym management app (**WS Fitness**) off Lovable to a self-hosted platform. I need a full export of the Supabase database backing this project.

Could you please provide a **complete database dump** (preferably as a PostgreSQL SQL dump or CSV files per table) containing at minimum the following data:

**Users & Authentication**
- All user records (email, full name, phone, profile data)
- Authentication credentials (password hashes if possible, so users don't need to reset)
- User roles/permissions

**Membership & Plans**
- Membership plan definitions (plan names, pricing, duration, features)
- Member-plan assignments (which user is on which plan, status, start/end dates)
- Payment/billing history tied to memberships

**Gym Access & QR Codes**
- QR code records per member (code values, active/inactive status)
- Door access logs / check-in history (timestamps, method used)

**Sessions & Bookings**
- Session packages (if any)
- Class/session booking records

**General**
- Any other tables related to the WS Fitness project
- Table schema/DDL so we can understand the structure

The export can be sent as:
- A `.sql` dump file (preferred), or
- A set of `.csv` files (one per table), or
- A Supabase backup archive

Please let me know if you need any additional information to process this request. I have full ownership of this project and all its data.

Thank you!

Best regards,
Jabez Kok
timeo LLC
