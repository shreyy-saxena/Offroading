# Creating an admin account

There is no self-serve signup (PRD Section 6, 12.3 — explicit non-goal). To
grant someone admin access to `/admin`, the app operator creates their
account by hand in Supabase, using the SQL Editor for the project (the
same tool ticket 02's migrations were applied through):

1. **Create the auth user**, if they don't already have one: Supabase
   dashboard → Authentication → Users → Add user. Set their email and a
   temporary password, and enable "Auto Confirm User" (skips the
   email-confirmation step, since there's no invite flow to send one).
2. **Grant the admin role**: Supabase dashboard → SQL Editor, run:

   ```sql
   update auth.users
   set raw_app_meta_data = raw_app_meta_data || jsonb_build_object('role', 'admin')
   where email = 'their-email@example.com';
   ```

   This sets `app_metadata.role = 'admin'`, which is what every admin
   route checks on every request (`src/lib/auth/admin.ts`) — never a
   separate `admins` table.
3. Tell them their email + temporary password out of band; they can sign
   in at `/admin/login`. There's no in-app "change password" flow yet —
   use Supabase dashboard → Authentication → Users → (user) → "Send
   password recovery" if they need to set their own.

**To revoke access** without deleting the account, run the same query
with `'role', 'none'` (or any value other than `'admin'`) — or clear it
entirely:

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data - 'role'
where email = 'their-email@example.com';
```

This takes effect on that person's *very next request* — the admin check
re-verifies against the Auth server every time, it doesn't cache the role
from login, so there's no need to ask them to log out.
