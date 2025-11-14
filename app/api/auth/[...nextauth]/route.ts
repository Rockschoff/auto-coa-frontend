/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { createClient } from "@supabase/supabase-js";

console.log("SERVICE KEY LOADED:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
    }),
  ],

  callbacks: {
    // Fires whenever user logs in
    async signIn({ user, account, profile }) {
      try {
        const email = user.email!;
        const username = user.name ?? null;

        // Azure OID from EntraID
        const azure_oid = account?.providerAccountId || null;

        // Tenant ID is present in profile under `tid`
        // true for Microsoft Entra ID OAuth2 response
        const tenant_id = (profile as any)?.tid;

        if (!tenant_id) {
          console.error("Tenant ID missing in Azure profile");
          return false;
        }

        // ----------------------------------------------------------
        // 1️⃣  Ensure Organization exists
        // ----------------------------------------------------------
        const { data: org, error: orgErr } = await supabase
          .from("organizations")
          .select("*")
          .eq("tenant_id", tenant_id)
          .single();

        let organization_id = org?.id;

        if (orgErr || !org) {
          const { data: newOrg, error: newOrgErr } = await supabase
            .from("organizations")
            .insert({
              tenant_id,
              organization_name: email.split("@")[1], // domain name as org name
              permissions_granted: false,
            })
            .select()
            .single();

          if (newOrgErr) {
            console.error("Error creating organization:", newOrgErr);
            return false;
          }

          organization_id = newOrg.id;
        }

        // ----------------------------------------------------------
        // 2️⃣  Ensure User exists
        // ----------------------------------------------------------
        const { data: existingUser } = await supabase
          .from("users")
          .select("*")
          .eq("user_email", email)
          .eq("organization_id", organization_id)
          .single();

        let user_id = existingUser?.id;

        if (!existingUser) {
          const { data: newUser, error: newUserErr } = await supabase
            .from("users")
            .insert({
              user_email: email,
              user_name: username,
              azure_oid,
              organization_id,
            })
            .select()
            .single();

          if (newUserErr) {
            console.error("Error creating user:", newUserErr);
            return false;
          }

          user_id = newUser.id;
        }

        // ----------------------------------------------------------
        // 3️⃣  Attach values to token for session callback
        // ----------------------------------------------------------
        user.tenant_id = tenant_id;
        user.organization_id = organization_id;
        user.user_id = user_id;

        return true;
      } catch (err) {
        console.error("SignIn callback error:", err);
        return false;
      }
    },

    // Attach session values here
    async session({ session, token }) {
      session.user.tenant_id = token.tenant_id;
      session.user.organization_id = token.organization_id;
      session.user.user_id = token.user_id;
      return session;
    },

    async jwt({ token, user }) {
      if (user) {
        token.tenant_id = user.tenant_id;
        token.organization_id =user.organization_id;
        token.user_id = user.user_id;
      }
      return token;
    },
  },
});

// Export App Router GET/POST handlers
export const { GET, POST } = handlers;
