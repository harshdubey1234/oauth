CREATE TABLE `guides` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`visibility` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `research_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`input_hash` text NOT NULL,
	`status` text NOT NULL,
	`events` text NOT NULL,
	`guide_id` text,
	`error` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `request_quotas` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
