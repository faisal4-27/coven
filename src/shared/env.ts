export const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined
/** Without a Clerk key the app runs in a local demo mode, see src/shared/auth.tsx. */
export const clerkEnabled = Boolean(clerkKey)
