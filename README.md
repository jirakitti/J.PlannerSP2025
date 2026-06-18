# Personal Operating System

A lightweight, static life-management dashboard built with HTML, CSS, vanilla JavaScript, Supabase, and PWA support.

## Modules

- Command Center with live Energy/Productivity Battery
- Critical Path Countdown to 22 Dec 2026
- AI-like coach advice based on completion rate
- Daily planner with fixed routines and custom tasks
- End-of-day reflection journal
- Habit tracker with streak visualization
- Calendar ledger linked to habit completions, daily notes, and date-specific tasks
- Vision board for macro-goals, target dates, and milestones

## Run Locally

Open `index.html` in a browser, or serve the folder with any static server.

```bash
python3 -m http.server 5174
```

Then visit `http://localhost:5174`.

Service workers only run on `https://` or `localhost`, so PWA install/offline mode will not activate from a `file://` URL.

## Supabase Setup

1. Create a Supabase project.
2. Open the Supabase SQL editor.
3. Run the SQL in `supabase/schema.sql`.
4. In Supabase, open `Authentication > URL Configuration`.
5. Set your Site URL to your GitHub Pages URL, for example `https://YOUR_USERNAME.github.io/YOUR_REPO/`.
6. Add the same URL to Redirect URLs.
7. Open `supabase-config.js`.
8. Paste your project URL and anon public key:

```js
window.PERSONAL_OS_SUPABASE = {
  url: "https://YOUR_PROJECT_ID.supabase.co",
  anonKey: "YOUR_ANON_PUBLIC_KEY"
};
```

The app stores one JSON document per signed-in user in `public.user_app_state`. Row Level Security is enabled so each user can only read and write their own state.

## Publish Free With GitHub Pages

1. Create a new GitHub repository.
2. Upload the full folder contents, including `.nojekyll`, `manifest.webmanifest`, `sw.js`, `icons/`, `supabase/`, and `supabase-config.js`.
3. In GitHub, open `Settings > Pages`.
4. Set the source to your main branch and root folder.
5. Your app will be live at the GitHub Pages URL.

## Data Storage

Without Supabase keys, all data is stored in the browser with `localStorage`.

With Supabase configured, the app still saves instantly to `localStorage`, then syncs the authenticated user's state to Supabase in the background.

## PWA

The app includes:

- `manifest.webmanifest`
- `sw.js`
- installable app icon
- static asset caching for offline repeat visits
