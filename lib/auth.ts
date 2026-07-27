import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import clientPromise from "@/lib/mongodb";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

if (!googleClientId || !googleClientSecret || !nextAuthSecret) {
  throw new Error(
    "Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or NEXTAUTH_SECRET environment variable",
  );
}

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  secret: nextAuthSecret,
  session: {
    strategy: "database",
  },
  providers: [
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  ],
};

export function auth() {
  return getServerSession(authOptions);
}
