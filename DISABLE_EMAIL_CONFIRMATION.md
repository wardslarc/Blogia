# Disable Email Confirmation in Supabase

Follow these steps to remove the email confirmation requirement:

## Steps:

1. **Go to Supabase Dashboard**
   - Visit https://app.supabase.com
   - Select your project

2. **Navigate to Authentication Settings**
   - Click on "Authentication" in the left sidebar
   - Click on "Providers"
   - Click on "Email"

3. **Disable Email Confirmation**
   - Look for the toggle: **"Confirm email"`**
   - Toggle it **OFF** (disabled)
   - Click "Save"

4. **Alternative: Enable Auto-confirm**
   - If you want to keep email verification but auto-confirm all signups:
   - Scroll down to find **"Auto Confirm Users"`**
   - Toggle it **ON** (enabled)
   - Click "Save"

5. **Update Other Settings (Optional)**
   - **Enable Automatic User Creation on Signup**: Toggle ON
   - This ensures the user is created immediately without waiting for email confirmation

## After Making Changes:

The app will now:
- ✅ Allow users to sign up and log in immediately
- ✅ No email confirmation required
- ✅ Session persists on page refresh
- ✅ Users can access the app right away

## Testing:

1. Clear your browser cache/cookies
2. Restart the dev server: `npm run dev`
3. Try signing up with a new email
4. You should be logged in immediately
5. Refresh the page - you should stay logged in

If you still have issues, check:
- Email confirmation is OFF in Settings
- Auth tables are properly created in your database
- `VITE_SUPABASE_ANON_KEY` is correct in `.env.local`
