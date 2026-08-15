<?php
/**
 * Custom marketplace tables: stalls, products, badges, pitches.
 * Every stall is owned by a WordPress user (owner_id → wp_users.ID).
 *
 * @package VibeMartPlugin
 */

declare(strict_types=1);

namespace VibeMart\Plugin;

if (! defined('ABSPATH')) {
	exit;
}

/** Schema version — bump when CREATE TABLE definitions change. */
const DB_VERSION = '1.4.0';

/**
 * Prefixed table name helper.
 *
 * Tables:
 * - {prefix}vm_stalls
 * - {prefix}vm_products
 * - {prefix}vm_badges
 * - {prefix}vm_pitches
 */
function table(string $suffix): string {
	global $wpdb;
	return $wpdb->prefix . 'vm_' . $suffix;
}

/**
 * Create / upgrade custom tables via dbDelta.
 */
function create_tables(): void {
	global $wpdb;
	require_once ABSPATH . 'wp-admin/includes/upgrade.php';

	$charset = $wpdb->get_charset_collate();
	$stalls = table('stalls');
	$products = table('products');
	$badges = table('badges');
	$pitches = table('pitches');

	/*
	 * Stalls — one row per market stall, linked to owner (wp_users.ID).
	 * seller_photo is TEXT so data-URLs / long media URLs fit.
	 */
	$sql_stalls = "CREATE TABLE {$stalls} (
		id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
		owner_id bigint(20) unsigned NOT NULL,
		brand_name varchar(191) NOT NULL DEFAULT '',
		seller_photo text NULL,
		seller_bio text NULL,
		ambition text NULL,
		status varchar(32) NOT NULL DEFAULT 'draft',
		created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY  (id),
		KEY owner_id (owner_id),
		KEY status (status),
		KEY owner_status (owner_id, status)
	) {$charset};";

	/*
	 * Products — up to 6 per stall (enforced in REST layer).
	 */
	$sql_products = "CREATE TABLE {$products} (
		id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
		stall_id bigint(20) unsigned NOT NULL,
		name varchar(191) NOT NULL DEFAULT '',
		variation varchar(191) NOT NULL DEFAULT '',
		condition_label varchar(191) NOT NULL DEFAULT '',
		price varchar(64) NOT NULL DEFAULT '',
		description text NULL,
		image_url text NULL,
		image_urls longtext NULL,
		sort_order tinyint(3) unsigned NOT NULL DEFAULT 0,
		PRIMARY KEY  (id),
		KEY stall_id (stall_id),
		KEY stall_sort (stall_id, sort_order)
	) {$charset};";

	/*
	 * Badges — short labels attached to a stall (trust badges).
	 */
	$sql_badges = "CREATE TABLE {$badges} (
		id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
		stall_id bigint(20) unsigned NOT NULL,
		label varchar(191) NOT NULL DEFAULT '',
		PRIMARY KEY  (id),
		KEY stall_id (stall_id)
	) {$charset};";

	/*
	 * Pitch information — one pitch row per stall (stall_id UNIQUE).
	 */
	$sql_pitches = "CREATE TABLE {$pitches} (
		id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
		stall_id bigint(20) unsigned NOT NULL,
		pitch_number varchar(64) NOT NULL DEFAULT '',
		location varchar(191) NOT NULL DEFAULT '',
		member_since varchar(64) NOT NULL DEFAULT '',
		PRIMARY KEY  (id),
		UNIQUE KEY stall_id (stall_id)
	) {$charset};";

	dbDelta($sql_stalls);
	dbDelta($sql_products);
	dbDelta($sql_badges);
	dbDelta($sql_pitches);

	update_option('vibe_mart_db_version', DB_VERSION);
}

/**
 * Run migrations when the installed schema version lags behind DB_VERSION.
 */
function maybe_upgrade_database(): void {
	$installed = (string) get_option('vibe_mart_db_version', '');
	if ($installed === DB_VERSION) {
		return;
	}
	create_tables();
}

add_action('plugins_loaded', __NAMESPACE__ . '\\maybe_upgrade_database', 5);

/**
 * Fetch a stall row by id, or null.
 */
function get_stall_row(int $stall_id): ?object {
	global $wpdb;
	if ($stall_id <= 0) {
		return null;
	}
	$row = $wpdb->get_row(
		$wpdb->prepare('SELECT * FROM ' . table('stalls') . ' WHERE id = %d', $stall_id)
	);
	return $row ?: null;
}

/**
 * Whether the current user owns the stall (or is an admin).
 */
function stall_owned_by_current_user(object $row): bool {
	return (int) $row->owner_id === (int) get_current_user_id() || current_user_can('manage_options');
}

/**
 * Cascade-delete a stall and all related child rows.
 */
function delete_stall_cascade(int $stall_id): bool {
	global $wpdb;
	$wpdb->delete(table('products'), array('stall_id' => $stall_id), array('%d'));
	$wpdb->delete(table('badges'), array('stall_id' => $stall_id), array('%d'));
	$wpdb->delete(table('pitches'), array('stall_id' => $stall_id), array('%d'));
	$deleted = $wpdb->delete(table('stalls'), array('id' => $stall_id), array('%d'));
	return false !== $deleted;
}
