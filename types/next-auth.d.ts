// /next-auth.d.ts

import 'next-auth';
import 'next-auth/jwt';

// Define the custom properties you're adding
type CustomTenantID = string | null;
type CustomOrgID = string | null;
type CustomUserID = string | null;

/**
 * Augment the 'next-auth' module.
 */
declare module 'next-auth' {
  /**
   * The `User` object is passed to the `signIn` and `jwt` callbacks.
   * We're adding the properties here that we attach in the `signIn` callback.
   */
  interface User {
    tenant_id: CustomTenantID;
    organization_id: CustomOrgID;
    user_id: CustomUserID;
  }

  /**
   * The `Session` object is returned from `useSession` or `auth()`.
   * We add our custom properties to `session.user` here.
   */
  interface Session {
    user: {
      tenant_id: CustomTenantID;
      organization_id: CustomOrgID;
      user_id: CustomUserID;
    } & DefaultSession['user']; // Combine with default user properties (name, email, image)
  }
}

/**
 * Augment the 'next-auth/jwt' module.
 * This adds your custom properties to the JWT token itself.
 */
declare module 'next-auth/jwt' {
  /** The decoded JWT token. */
  interface JWT {
    tenant_id: CustomTenantID;
    organization_id: CustomOrgID;
    user_id: CustomUserID;
  }
}