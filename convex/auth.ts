import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { DataModel } from "./_generated/dataModel";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Password<DataModel>({
      profile(params) {
        // Email is required by the Password provider
        // If user signs up with username only, frontend generates placeholder email
        return {
          email: params.email as string,
          name: (params.name as string) || undefined,
          username: (params.username as string) || undefined,
        };
      },
    }),
  ],
});
