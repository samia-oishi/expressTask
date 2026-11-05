DROP TABLE "email_verification_tokens" CASCADE;--> statement-breakpoint
DROP TABLE "password_reset_tokens" CASCADE;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "email_verified_at";--> statement-breakpoint
DROP TYPE "public"."email_verification_purpose";