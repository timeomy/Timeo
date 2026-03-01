CREATE TYPE "public"."booking_event_type" AS ENUM('created', 'confirmed', 'cancelled', 'completed', 'no_show', 'rescheduled', 'note_added');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."check_in_method" AS ENUM('qr', 'nfc', 'manual');--> statement-breakpoint
CREATE TYPE "public"."e_invoice_id_type" AS ENUM('nric', 'passport', 'brn', 'army');--> statement-breakpoint
CREATE TYPE "public"."e_invoice_status" AS ENUM('pending', 'submitted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."file_type" AS ENUM('product_image', 'service_image', 'avatar', 'logo', 'document');--> statement-breakpoint
CREATE TYPE "public"."gift_card_status" AS ENUM('active', 'depleted', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."gift_card_transaction_type" AS ENUM('purchase', 'redemption', 'refund', 'topup');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('customer', 'staff', 'admin', 'platform_admin');--> statement-breakpoint
CREATE TYPE "public"."membership_interval" AS ENUM('monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('active', 'invited', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('booking_confirmed', 'booking_cancelled', 'booking_reminder', 'order_update', 'staff_invitation', 'payment_received', 'check_in', 'session_logged', 'credits_low', 'voucher_received', 'receipt', 'system');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'awaiting_payment', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_gateway" AS ENUM('stripe', 'revenue_monster', 'both');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'processing', 'succeeded', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."pos_payment_method" AS ENUM('cash', 'card', 'qr_pay', 'bank_transfer', 'revenue_monster');--> statement-breakpoint
CREATE TYPE "public"."pos_transaction_status" AS ENUM('completed', 'voided', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."push_token_platform" AS ENUM('ios', 'android', 'web');--> statement-breakpoint
CREATE TYPE "public"."session_type" AS ENUM('personal_training', 'group_class', 'assessment', 'consultation');--> statement-breakpoint
CREATE TYPE "public"."stripe_account_status" AS ENUM('pending', 'active', 'restricted');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'past_due', 'canceled', 'incomplete');--> statement-breakpoint
CREATE TYPE "public"."tenant_id_type" AS ENUM('brn', 'nric', 'passport', 'army');--> statement-breakpoint
CREATE TYPE "public"."tenant_plan" AS ENUM('free', 'starter', 'pro', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('active', 'suspended', 'trial');--> statement-breakpoint
CREATE TYPE "public"."voucher_source" AS ENUM('internal', 'partner', 'public');--> statement-breakpoint
CREATE TYPE "public"."voucher_type" AS ENUM('percentage', 'fixed', 'free_session');--> statement-breakpoint
CREATE TABLE "tenant_memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"role" "member_role" NOT NULL,
	"status" "membership_status" DEFAULT 'active' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"owner_id" text NOT NULL,
	"plan" "tenant_plan" DEFAULT 'free' NOT NULL,
	"status" "tenant_status" DEFAULT 'trial' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"branding" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"e_invoice_profile" jsonb,
	"payment_gateway" "payment_gateway" DEFAULT 'stripe',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"auth_id" text,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_auth_id_unique" UNIQUE("auth_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "blocked_slots" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"staff_id" text,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"reason" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_events" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"booking_id" text NOT NULL,
	"type" "booking_event_type" NOT NULL,
	"actor_id" text NOT NULL,
	"metadata" jsonb,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"service_id" text NOT NULL,
	"staff_id" text,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_hours" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"open_time" text NOT NULL,
	"close_time" text NOT NULL,
	"is_open" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"price" integer NOT NULL,
	"currency" text DEFAULT 'MYR' NOT NULL,
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_availability" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"price" integer NOT NULL,
	"currency" text DEFAULT 'MYR' NOT NULL,
	"interval" "membership_interval" NOT NULL,
	"features" text[] NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"product_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"snapshot_price" integer NOT NULL,
	"snapshot_name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"total_amount" integer NOT NULL,
	"currency" text DEFAULT 'MYR' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"price" integer NOT NULL,
	"currency" text DEFAULT 'MYR' NOT NULL,
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "check_ins" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"method" "check_in_method" NOT NULL,
	"checked_in_by" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_qr_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"code" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_credits" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"package_id" text NOT NULL,
	"total_sessions" integer NOT NULL,
	"used_sessions" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"purchased_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"client_id" text NOT NULL,
	"coach_id" text NOT NULL,
	"booking_id" text,
	"credit_id" text,
	"session_type" "session_type" NOT NULL,
	"notes" text,
	"exercises" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metrics" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_packages" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"session_count" integer NOT NULL,
	"price" integer NOT NULL,
	"currency" text DEFAULT 'MYR' NOT NULL,
	"service_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"order_id" text,
	"booking_id" text,
	"stripe_payment_intent_id" text,
	"rm_order_id" text,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'MYR' NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pos_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"staff_id" text NOT NULL,
	"items" jsonb NOT NULL,
	"subtotal" integer NOT NULL,
	"discount" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"currency" text DEFAULT 'MYR' NOT NULL,
	"payment_method" "pos_payment_method" NOT NULL,
	"voucher_id" text,
	"status" "pos_transaction_status" DEFAULT 'completed' NOT NULL,
	"receipt_number" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"stripe_account_id" text NOT NULL,
	"status" "stripe_account_status" DEFAULT 'pending' NOT NULL,
	"charges_enabled" boolean DEFAULT false NOT NULL,
	"payouts_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"membership_id" text NOT NULL,
	"stripe_subscription_id" text,
	"stripe_customer_id" text,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"current_period_start" timestamp with time zone NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gift_card_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"gift_card_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"type" "gift_card_transaction_type" NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"pos_transaction_id" text,
	"note" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gift_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"code" text NOT NULL,
	"initial_balance" integer NOT NULL,
	"current_balance" integer NOT NULL,
	"currency" text DEFAULT 'MYR' NOT NULL,
	"purchaser_name" text,
	"purchaser_email" text,
	"recipient_name" text,
	"recipient_email" text,
	"message" text,
	"status" "gift_card_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voucher_redemptions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"voucher_id" text NOT NULL,
	"user_id" text NOT NULL,
	"discount_amount" integer NOT NULL,
	"booking_id" text,
	"order_id" text,
	"redeemed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vouchers" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"code" text NOT NULL,
	"type" "voucher_type" NOT NULL,
	"value" integer NOT NULL,
	"max_uses" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"source" "voucher_source",
	"partner_name" text,
	"partner_logo" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"email_booking_confirm" boolean DEFAULT true NOT NULL,
	"email_booking_reminder" boolean DEFAULT true NOT NULL,
	"email_order_update" boolean DEFAULT true NOT NULL,
	"push_enabled" boolean DEFAULT true NOT NULL,
	"in_app_enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"data" jsonb,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"platform" "push_token_platform" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"resource" text NOT NULL,
	"resource_id" text NOT NULL,
	"metadata" jsonb,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"tenant_id" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "platform_config" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_config_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text,
	"uploaded_by" text NOT NULL,
	"storage_id" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"type" "file_type" NOT NULL,
	"entity_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "e_invoice_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"transaction_id" text NOT NULL,
	"receipt_number" text NOT NULL,
	"buyer_tin" text NOT NULL,
	"buyer_id_type" "e_invoice_id_type" NOT NULL,
	"buyer_id_value" text NOT NULL,
	"buyer_name" text NOT NULL,
	"buyer_email" text NOT NULL,
	"buyer_phone" text,
	"buyer_address" jsonb NOT NULL,
	"buyer_sst_reg_no" text,
	"status" "e_invoice_status" DEFAULT 'pending' NOT NULL,
	"submitted_at" timestamp with time zone,
	"lhdn_submission_id" text,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocked_slots" ADD CONSTRAINT "blocked_slots_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocked_slots" ADD CONSTRAINT "blocked_slots_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocked_slots" ADD CONSTRAINT "blocked_slots_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_hours" ADD CONSTRAINT "business_hours_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_availability" ADD CONSTRAINT "staff_availability_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_availability" ADD CONSTRAINT "staff_availability_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_checked_in_by_users_id_fk" FOREIGN KEY ("checked_in_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_qr_codes" ADD CONSTRAINT "member_qr_codes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_qr_codes" ADD CONSTRAINT "member_qr_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_credits" ADD CONSTRAINT "session_credits_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_credits" ADD CONSTRAINT "session_credits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_credits" ADD CONSTRAINT "session_credits_package_id_session_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."session_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_logs" ADD CONSTRAINT "session_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_logs" ADD CONSTRAINT "session_logs_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_logs" ADD CONSTRAINT "session_logs_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_logs" ADD CONSTRAINT "session_logs_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_logs" ADD CONSTRAINT "session_logs_credit_id_session_credits_id_fk" FOREIGN KEY ("credit_id") REFERENCES "public"."session_credits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_packages" ADD CONSTRAINT "session_packages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_packages" ADD CONSTRAINT "session_packages_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_transactions" ADD CONSTRAINT "pos_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_transactions" ADD CONSTRAINT "pos_transactions_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_transactions" ADD CONSTRAINT "pos_transactions_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_transactions" ADD CONSTRAINT "pos_transactions_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_accounts" ADD CONSTRAINT "stripe_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_card_transactions" ADD CONSTRAINT "gift_card_transactions_gift_card_id_gift_cards_id_fk" FOREIGN KEY ("gift_card_id") REFERENCES "public"."gift_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_card_transactions" ADD CONSTRAINT "gift_card_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_card_transactions" ADD CONSTRAINT "gift_card_transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "e_invoice_requests" ADD CONSTRAINT "e_invoice_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "e_invoice_requests" ADD CONSTRAINT "e_invoice_requests_transaction_id_pos_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."pos_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tenant_memberships_tenant_id_idx" ON "tenant_memberships" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tenant_memberships_user_id_idx" ON "tenant_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tenant_memberships_tenant_role_idx" ON "tenant_memberships" USING btree ("tenant_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_memberships_tenant_user_idx" ON "tenant_memberships" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "tenants_slug_idx" ON "tenants" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "tenants_owner_id_idx" ON "tenants" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "tenants_status_idx" ON "tenants" USING btree ("status");--> statement-breakpoint
CREATE INDEX "users_auth_id_idx" ON "users" USING btree ("auth_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "blocked_slots_tenant_id_idx" ON "blocked_slots" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "blocked_slots_staff_id_idx" ON "blocked_slots" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "blocked_slots_tenant_daterange_idx" ON "blocked_slots" USING btree ("tenant_id","start_time");--> statement-breakpoint
CREATE INDEX "booking_events_booking_id_idx" ON "booking_events" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "bookings_tenant_id_idx" ON "bookings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "bookings_customer_id_idx" ON "bookings" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "bookings_staff_id_idx" ON "bookings" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "bookings_tenant_status_idx" ON "bookings" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "bookings_tenant_date_idx" ON "bookings" USING btree ("tenant_id","start_time");--> statement-breakpoint
CREATE INDEX "business_hours_tenant_id_idx" ON "business_hours" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "business_hours_tenant_day_idx" ON "business_hours" USING btree ("tenant_id","day_of_week");--> statement-breakpoint
CREATE INDEX "services_tenant_id_idx" ON "services" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "services_tenant_active_idx" ON "services" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE INDEX "staff_availability_staff_id_idx" ON "staff_availability" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "staff_availability_tenant_id_idx" ON "staff_availability" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "staff_availability_tenant_day_idx" ON "staff_availability" USING btree ("tenant_id","day_of_week");--> statement-breakpoint
CREATE INDEX "memberships_tenant_id_idx" ON "memberships" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_tenant_id_idx" ON "orders" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "orders_customer_id_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "orders_tenant_status_idx" ON "orders" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "products_tenant_id_idx" ON "products" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "products_tenant_active_idx" ON "products" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE INDEX "check_ins_tenant_id_idx" ON "check_ins" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "check_ins_user_id_idx" ON "check_ins" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "check_ins_tenant_date_idx" ON "check_ins" USING btree ("tenant_id","timestamp");--> statement-breakpoint
CREATE INDEX "member_qr_codes_tenant_id_idx" ON "member_qr_codes" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "member_qr_codes_user_id_idx" ON "member_qr_codes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "member_qr_codes_code_idx" ON "member_qr_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "session_credits_tenant_id_idx" ON "session_credits" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "session_credits_user_id_idx" ON "session_credits" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_credits_tenant_user_idx" ON "session_credits" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "session_logs_tenant_id_idx" ON "session_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "session_logs_client_id_idx" ON "session_logs" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "session_logs_coach_id_idx" ON "session_logs" USING btree ("coach_id");--> statement-breakpoint
CREATE INDEX "session_logs_tenant_client_idx" ON "session_logs" USING btree ("tenant_id","client_id");--> statement-breakpoint
CREATE INDEX "session_packages_tenant_id_idx" ON "session_packages" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "session_packages_tenant_active_idx" ON "session_packages" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE INDEX "payments_tenant_id_idx" ON "payments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "payments_customer_id_idx" ON "payments" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "payments_order_id_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payments_booking_id_idx" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "payments_stripe_pi_idx" ON "payments" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX "payments_rm_order_id_idx" ON "payments" USING btree ("rm_order_id");--> statement-breakpoint
CREATE INDEX "pos_transactions_tenant_id_idx" ON "pos_transactions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "pos_transactions_customer_id_idx" ON "pos_transactions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "pos_transactions_tenant_date_idx" ON "pos_transactions" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "pos_transactions_receipt_idx" ON "pos_transactions" USING btree ("receipt_number");--> statement-breakpoint
CREATE INDEX "stripe_accounts_tenant_id_idx" ON "stripe_accounts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "subscriptions_tenant_id_idx" ON "subscriptions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "subscriptions_customer_id_idx" ON "subscriptions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "subscriptions_membership_id_idx" ON "subscriptions" USING btree ("membership_id");--> statement-breakpoint
CREATE INDEX "subscriptions_stripe_sub_idx" ON "subscriptions" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "gift_card_transactions_gift_card_id_idx" ON "gift_card_transactions" USING btree ("gift_card_id");--> statement-breakpoint
CREATE INDEX "gift_card_transactions_tenant_id_idx" ON "gift_card_transactions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "gift_cards_tenant_id_idx" ON "gift_cards" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "gift_cards_code_idx" ON "gift_cards" USING btree ("code");--> statement-breakpoint
CREATE INDEX "gift_cards_tenant_status_idx" ON "gift_cards" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "voucher_redemptions_tenant_id_idx" ON "voucher_redemptions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "voucher_redemptions_voucher_id_idx" ON "voucher_redemptions" USING btree ("voucher_id");--> statement-breakpoint
CREATE INDEX "voucher_redemptions_user_id_idx" ON "voucher_redemptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "vouchers_tenant_id_idx" ON "vouchers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "vouchers_code_idx" ON "vouchers" USING btree ("code");--> statement-breakpoint
CREATE INDEX "vouchers_tenant_active_idx" ON "vouchers" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_preferences_user_tenant_idx" ON "notification_preferences" USING btree ("user_id","tenant_id");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","read");--> statement-breakpoint
CREATE INDEX "notifications_tenant_id_idx" ON "notifications" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "push_tokens_user_id_idx" ON "push_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "push_tokens_token_idx" ON "push_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "feature_flags_key_idx" ON "feature_flags" USING btree ("key");--> statement-breakpoint
CREATE INDEX "feature_flags_tenant_id_idx" ON "feature_flags" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "platform_config_key_idx" ON "platform_config" USING btree ("key");--> statement-breakpoint
CREATE INDEX "files_tenant_id_idx" ON "files" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "files_entity_idx" ON "files" USING btree ("type","entity_id");--> statement-breakpoint
CREATE INDEX "files_uploader_idx" ON "files" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "e_invoice_requests_tenant_id_idx" ON "e_invoice_requests" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "e_invoice_requests_transaction_id_idx" ON "e_invoice_requests" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "e_invoice_requests_receipt_idx" ON "e_invoice_requests" USING btree ("receipt_number");--> statement-breakpoint
CREATE INDEX "e_invoice_requests_tenant_status_idx" ON "e_invoice_requests" USING btree ("tenant_id","status");