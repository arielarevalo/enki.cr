CREATE TABLE `demo_agents` (
	`agent_name` text PRIMARY KEY NOT NULL,
	`demo_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `demos` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`active_agent` text,
	`created_at` text NOT NULL
);
