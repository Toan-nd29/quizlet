CREATE TABLE `study_items` (
	`id` text PRIMARY KEY NOT NULL,
	`study_set_id` text NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`explanation` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`item_order` integer NOT NULL,
	FOREIGN KEY (`study_set_id`) REFERENCES `study_sets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_study_items_set_order` ON `study_items` (`study_set_id`,`item_order`);--> statement-breakpoint
CREATE INDEX `idx_study_items_set_question` ON `study_items` (`study_set_id`,`question`);--> statement-breakpoint
CREATE TABLE `study_options` (
	`id` text PRIMARY KEY NOT NULL,
	`study_item_id` text NOT NULL,
	`content` text NOT NULL,
	`is_correct` integer DEFAULT false NOT NULL,
	`option_order` integer NOT NULL,
	FOREIGN KEY (`study_item_id`) REFERENCES `study_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_study_options_item_order` ON `study_options` (`study_item_id`,`option_order`);--> statement-breakpoint
CREATE TABLE `study_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`study_set_id` text NOT NULL,
	`study_item_id` text NOT NULL,
	`status` text DEFAULT 'NEW' NOT NULL,
	`correct_count` integer DEFAULT 0 NOT NULL,
	`incorrect_count` integer DEFAULT 0 NOT NULL,
	`learning_score` integer DEFAULT 0 NOT NULL,
	`last_studied_at` text,
	FOREIGN KEY (`study_set_id`) REFERENCES `study_sets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`study_item_id`) REFERENCES `study_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_study_progress_item_unique` ON `study_progress` (`study_item_id`);--> statement-breakpoint
CREATE INDEX `idx_study_progress_set_status` ON `study_progress` (`study_set_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_study_progress_incorrect` ON `study_progress` (`study_set_id`,`incorrect_count`);--> statement-breakpoint
CREATE TABLE `study_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`study_set_id` text NOT NULL,
	`mode` text NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`correct_answers` integer DEFAULT 0 NOT NULL,
	`incorrect_answers` integer DEFAULT 0 NOT NULL,
	`total_answers` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`study_set_id`) REFERENCES `study_sets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_study_sessions_set_started` ON `study_sessions` (`study_set_id`,`started_at`);--> statement-breakpoint
CREATE TABLE `study_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`owner_id` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_study_sets_owner_updated` ON `study_sets` (`owner_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_email` ON `users` (`email`);
--> statement-breakpoint
PRAGMA optimize;
