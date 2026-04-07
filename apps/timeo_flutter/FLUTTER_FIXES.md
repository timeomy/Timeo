# Flutter Fixes Needed

## Coach Role Issues (CRITICAL)
1. **Home screen**: Shows "Member Portal" → should detect role and show "Coach Portal"
2. **"No Active Membership" banner**: Hide for coach/staff/admin roles — they don't need memberships
3. **Profile badge**: Shows "Standard Member" → should read actual role from API and show "Coach"
4. **Home content for coach**: Should show:
   - My Clients (assigned to me)
   - Today's sessions
   - Quick actions: Log Session, View Schedule
   - NOT: visits this month, coach notes from others
5. **Bottom nav for coach**: Replace "Membership" tab with "Clients" or "Sessions"
6. **Remove hardcoded demo data**: "Coach Mike", "Coach Sarah" notes are fake — read from API

## Role-Based UI
- **Customer**: Home (QR + membership), Bookings, Membership, Profile
- **Coach**: Home (clients + sessions), Bookings/Schedule, Clients, Profile  
- **Admin**: Home (dashboard), Members, Team, Settings, Profile

## How to detect role
The `/api/tenants/mine` endpoint returns `role: "coach"` for coach accounts.
Use `authState.role` from the auth provider to switch UI.

## Accounts
- coach@wsfitness.my / WSFitness@2026 (role: coach)
- member@wsfitness.my / WSFitness@2026 (role: customer)
- itadmin@wsfitness.my / WSFitness@2026 (role: admin)
