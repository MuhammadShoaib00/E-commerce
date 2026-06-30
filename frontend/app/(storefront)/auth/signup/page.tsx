import { redirect } from 'next/navigation';

// Auth is now a single page with a sign-in / create-account toggle.
// Keep this route working by forwarding to the unified page in signup mode.
export default function SignupRedirect() {
  redirect('/auth/login?mode=signup');
}
