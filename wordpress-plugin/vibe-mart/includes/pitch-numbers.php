<?php
/**
 * Automatic trader pitch numbers: VM2026A, VM2026B, VM2026C, …
 *
 * @package VibeMartPlugin
 */

declare(strict_types=1);

namespace VibeMart\Plugin;

if (! defined('ABSPATH')) {
	exit;
}

const PITCH_PREFIX = 'VM2026';
const USER_META_PITCH = 'vm_pitch_number';
const OPTION_PITCH_SEQ = 'vibe_mart_pitch_seq';

/**
 * Convert a suffix like A, B, Z, AA into a 1-based index.
 */
function parse_pitch_index(string $pitch): int {
	if (! preg_match('/^' . preg_quote(PITCH_PREFIX, '/') . '([A-Z]+)$/i', trim($pitch), $match)) {
		return 0;
	}
	$letters = strtoupper($match[1]);
	$n = 0;
	$len = strlen($letters);
	for ($i = 0; $i < $len; $i++) {
		$n = $n * 26 + (ord($letters[$i]) - 64);
	}
	return $n;
}

/**
 * 1 → VM2026A, 2 → VM2026B, 27 → VM2026AA.
 */
function format_pitch_number(int $n): string {
	if ($n < 1) {
		$n = 1;
	}
	$suffix = '';
	while ($n > 0) {
		$n--;
		$suffix = chr(65 + ($n % 26)) . $suffix;
		$n = intdiv($n, 26);
	}
	return PITCH_PREFIX . $suffix;
}

/**
 * Highest pitch index already in use (user meta + pitch table).
 */
function max_used_pitch_index(): int {
	global $wpdb;
	$max = (int) get_option(OPTION_PITCH_SEQ, 0);

	$meta = $wpdb->get_col(
		$wpdb->prepare(
			"SELECT meta_value FROM {$wpdb->usermeta} WHERE meta_key = %s",
			USER_META_PITCH
		)
	);
	foreach ($meta as $value) {
		$max = max($max, parse_pitch_index((string) $value));
	}

	$pitches = $wpdb->get_col('SELECT pitch_number FROM ' . table('pitches') . " WHERE pitch_number <> ''");
	foreach ($pitches as $value) {
		$max = max($max, parse_pitch_index((string) $value));
	}

	return $max;
}

function next_pitch_number(): string {
	$n = max_used_pitch_index() + 1;
	update_option(OPTION_PITCH_SEQ, $n, false);
	return format_pitch_number($n);
}

/**
 * One pitch code per trader. Reuses an existing stall code if they already have one.
 */
function assign_trader_pitch_number(int $user_id): string {
	if ($user_id <= 0) {
		return '';
	}

	$existing = strtoupper(trim((string) get_user_meta($user_id, USER_META_PITCH, true)));
	if (parse_pitch_index($existing) > 0) {
		return $existing;
	}

	global $wpdb;
	$from_stall = (string) $wpdb->get_var(
		$wpdb->prepare(
			'SELECT p.pitch_number FROM ' . table('pitches') . ' p
			INNER JOIN ' . table('stalls') . ' s ON s.id = p.stall_id
			WHERE s.owner_id = %d AND p.pitch_number <> \'\'
			ORDER BY s.id ASC LIMIT 1',
			$user_id
		)
	);
	$from_stall = trim($from_stall);
	if ('' !== $from_stall && parse_pitch_index($from_stall) > 0) {
		update_user_meta($user_id, USER_META_PITCH, $from_stall);
		return $from_stall;
	}

	$next = next_pitch_number();
	update_user_meta($user_id, USER_META_PITCH, $next);
	return $next;
}
