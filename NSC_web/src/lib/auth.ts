import { betterAuth } from "better-auth/minimal";
import { username, admin } from "better-auth/plugins"
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
    emailAndPassword: {
        enabled: true
    },
    plugins: [ 
        username({
            displayUsername: false,
            schema: {
                user: {
                    fields: {
                        username: "account",
                    }
                }
            }
        }),
        admin()
    ], 
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
});
