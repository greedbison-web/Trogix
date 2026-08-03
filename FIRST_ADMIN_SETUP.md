# First admin setup

`/admin` is the Trogix platform console — every restaurant, every payment,
every audit record. There is deliberately **no self-service path into it**. The
only way in is a row in `platform_admins`, written by someone with database
access. That is the design: an open registration route into the platform
console would be the single most valuable target in the product.

Do this once, after the first Vercel deploy.

---

## 1. Create your own account through the app

Use the real signup flow. Do not create the auth user by hand — the app writes
the profile mirror, the verification challenge and the phone number, and a
hand-made row will be missing them.

1. Open `https://trogix.co.in/signup`.
2. Fill in your name, your email, your mobile number and a password.
3. You land on `/verify`. Check your inbox for **Restaurant Verification Code**
   and enter the 6-digit code.

If no email arrives, stop and fix Resend first — see
[RESEND_SETUP.md](./RESEND_SETUP.md). Nothing below works until you have a
verified account.

---

## 2. Find your user id

Supabase → **SQL Editor**:

```sql
select id, email, full_name, phone, email_verified_at, phone_verified_at
from public.users
where email = 'you@yourdomain.com';
```

Both `email_verified_at` and `phone_verified_at` must be non-null. If they are
null, verification did not complete — go back to `/verify`.

---

## 3. Grant the admin role

```sql
insert into public.platform_admins (user_id, role, status)
select id, 'owner', 'active'
from public.users
where email = 'you@yourdomain.com'
on conflict (user_id) do update
  set role = 'owner', status = 'active';
```

`on conflict` makes this safe to run twice.

Confirm:

```sql
select u.email, a.role, a.status, a.created_at
from public.platform_admins a
join public.users u on u.id = a.user_id;
```

---

## 4. Sign in

1. Go to `https://trogix.co.in/login` and sign in.
2. Open `https://trogix.co.in/admin`.

You should see the platform overview. If you get redirected to `/dashboard`,
the `platform_admins` row is missing, its `status` is not `active`, or you are
signed in as a different account.

---

## Roles

Trogix checks **capabilities**, not roles, so a role can be re-cut without
hunting for scattered role checks.

| Capability | owner | admin | support | readonly |
| --- | :-: | :-: | :-: | :-: |
| `restaurants.read` | ✓ | ✓ | ✓ | ✓ |
| `restaurants.suspend` (also approve/reject) | ✓ | ✓ | | |
| `restaurants.delete` | ✓ | | | |
| `subscriptions.manage` | ✓ | ✓ | | |
| `coupons.manage` | ✓ | ✓ | | |
| `payments.read` | ✓ | ✓ | ✓ | ✓ |
| `webhooks.retry` | ✓ | ✓ | | |
| `impersonate` | ✓ | ✓ | ✓ | |
| `notifications.send` | ✓ | ✓ | | |
| `settings.write` | ✓ | | | |
| `admins.manage` | ✓ | | | |
| `audit.read` | ✓ | ✓ | | |

Give yourself `owner`. Grant colleagues the narrowest role that lets them do
their job — support staff answering tickets need `support`, not `owner`.

---

## 5. Add further admins

Once you hold `owner`, add the rest from the UI: **/admin/security → Admins**.
No SQL needed again.

To remove someone, set their status to `disabled` rather than deleting the row
— the audit log references it, and you want the history to stay readable.

---

## Creating the first restaurant

The platform console does not create restaurants; owners do, through the
normal flow. To make your own:

1. Sign up with a **different** email (one account owns one business).
2. Verify the code.
3. Complete `/onboarding`: business name, type, address, menu link, logo.
4. The restaurant is filed as **pending review** — the guest menu link returns
   nothing yet.
5. From your admin account: **/admin/restaurants → Pending review →** open it
   **→ Approve restaurant**.
6. The status becomes `active` and `https://trogix.co.in/m/<slug>` goes live.

Approval is refused if the owner's email and phone are not both verified.

---

## Impersonation

`/admin/restaurants/<id> → Log in as restaurant` gives you the owner's view for
30 minutes. It requires a written reason, is recorded in the audit log, and the
restaurant sees a banner the whole time. The cookie alone grants nothing — the
session row is re-checked on every request, so revoking it from
**/admin/security** takes effect immediately.

Use it for support, and expect the reason you type to be read later.
