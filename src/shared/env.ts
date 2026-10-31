// Publishable keys are public by design (they ship in the browser bundle), so a default is safe to commit.
// It is Coven's Clerk development instance: teammates and fresh clones get working sign-in with no setup.
// Override with VITE_CLERK_PUBLISHABLE_KEY (or NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, which Vercel's Clerk
// integration sets) in .env.local or Vercel. Never put the secret key (sk_...) anywhere in this repo.
const DEFAULT_KEY = 'pk_test_Y2xpbWJpbmctYWtpdGEtNDcyOC5jbGVyay5hY2NvdW50cy5kZXYk'

export const clerkKey: string | undefined =
  (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY as string | undefined) ||
  DEFAULT_KEY
/** Clerk is on whenever a key resolves. */
export const clerkEnabled = Boolean(clerkKey)
