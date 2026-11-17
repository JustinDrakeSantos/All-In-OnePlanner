DROP INDEX "events_user_date_idx";--> statement-breakpoint
DROP INDEX "habit_checkins_user_date_idx";--> statement-breakpoint
DROP INDEX "habits_user_idx";--> statement-breakpoint
DROP INDEX "metrics_user_date_idx";--> statement-breakpoint
DROP INDEX "journal_user_date_idx";--> statement-breakpoint
DROP INDEX "meals_user_date_idx";--> statement-breakpoint
DROP INDEX "mood_user_date_idx";--> statement-breakpoint
DROP INDEX "password_reset_user_idx";--> statement-breakpoint
DROP INDEX "sessions_user_idx";--> statement-breakpoint
DROP INDEX "task_lists_user_name_idx";--> statement-breakpoint
DROP INDEX "tasks_user_due_idx";--> statement-breakpoint
DROP INDEX "tasks_user_status_idx";--> statement-breakpoint
DROP INDEX "users_email_unique";--> statement-breakpoint
DROP INDEX "water_user_date_idx";--> statement-breakpoint
DROP INDEX "workouts_user_date_idx";--> statement-breakpoint
ALTER TABLE `events` ALTER COLUMN "color" TO "color" text NOT NULL DEFAULT 'glacier';--> statement-breakpoint
CREATE INDEX `events_user_date_idx` ON `events` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `habit_checkins_user_date_idx` ON `habit_checkins` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `habits_user_idx` ON `habits` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `metrics_user_date_idx` ON `health_metrics` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `journal_user_date_idx` ON `journal_entries` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `meals_user_date_idx` ON `meals` (`user_id`,`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `mood_user_date_idx` ON `mood_entries` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `password_reset_user_idx` ON `password_reset_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `task_lists_user_name_idx` ON `task_lists` (`user_id`,`name`);--> statement-breakpoint
CREATE INDEX `tasks_user_due_idx` ON `tasks` (`user_id`,`due_date`);--> statement-breakpoint
CREATE INDEX `tasks_user_status_idx` ON `tasks` (`user_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `water_user_date_idx` ON `water_logs` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `workouts_user_date_idx` ON `workouts` (`user_id`,`date`);--> statement-breakpoint
ALTER TABLE `habits` ALTER COLUMN "color" TO "color" text NOT NULL DEFAULT 'glacier';--> statement-breakpoint
ALTER TABLE `task_lists` ALTER COLUMN "color" TO "color" text NOT NULL DEFAULT 'glacier';