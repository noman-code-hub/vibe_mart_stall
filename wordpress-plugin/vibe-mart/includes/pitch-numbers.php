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
 * Highest pitch index already assigned (user meta + pitch rows only).
 *
 * The stored sequence option is not used here — a stale high counter was
 * skipping ahead to codes like VM2026AG while real traders still needed A/B/C.
 */
function max_assigned_pitch_index(): int {
	global $wpdb;
	$max = 0;

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

/**
 * @deprecated Use max_assigned_pitch_index(); kept for older call sites.
 */
function max_used_pitch_index(): int {
	return max_assigned_pitch_index();
}

function next_pitch_number(): string {
	$assigned = max_assigned_pitch_index();
	$opt = (int) get_option(OPTION_PITCH_SEQ, 0);

	// Snap a stale counter back so new traders get the next real letter.
	if ($opt > $assigned) {
		$opt = $assigned;
	}

	$n = max($assigned, $opt) + 1;
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
	$from_stall = strtoupper(trim($from_stall));
	if ('' !== $from_stall && parse_pitch_index($from_stall) > 0) {
		update_user_meta($user_id, USER_META_PITCH, $from_stall);
		return $from_stall;
	}

	$next = next_pitch_number();
	update_user_meta($user_id, USER_META_PITCH, $next);
	return $next;
}

/**
 * Re-assign every trader VM2026A, VM2026B, VM2026C… in user-id order,
 * and rewrite all of their stall pitch rows to match.
 *
 * @return array{traders:int,next:string}
 */
function resequence_all_pitch_numbers(): array {
	global $wpdb;

	$ids = function_exists(__NAMESPACE__ . '\\get_trader_user_ids')
		? get_trader_user_ids()
		: array();

	if (array() === $ids) {
		$users = get_users(
			array(
				'role' => 'vibe_trader',
				'fields' => array('ID'),
				'orderby' => 'ID',
				'order' => 'ASC',
				'number' => 5000,
			)
		);
		foreach ($users as $user) {
			$ids[] = (int) ( is_object($user) ? $user->ID : $user );
		}
		$ids = array_values(array_unique(array_filter($ids)));
		sort($ids);
	}

	$index = 0;
	foreach ($ids as $user_id) {
		$user_id = (int) $user_id;
		if ($user_id <= 0) {
			continue;
		}
		$index++;
		$code = format_pitch_number($index);
		update_user_meta($user_id, USER_META_PITCH, $code);

		$stall_ids = $wpdb->get_col(
			$wpdb->prepare(
				'SELECT id FROM ' . table('stalls') . ' WHERE owner_id = %d',
				$user_id
			)
		);
		foreach ((array) $stall_ids as $stall_id) {
			$stall_id = (int) $stall_id;
			if ($stall_id <= 0) {
				continue;
			}
			$existing_id = (int) $wpdb->get_var(
				$wpdb->prepare(
					'SELECT id FROM ' . table('pitches') . ' WHERE stall_id = %d LIMIT 1',
					$stall_id
				)
			);
			if ($existing_id > 0) {
				$wpdb->update(
					table('pitches'),
					array('pitch_number' => $code),
					array('id' => $existing_id),
					array('%s'),
					array('%d')
				);
			} else {
				$wpdb->insert(
					table('pitches'),
					array(
						'stall_id' => $stall_id,
						'pitch_number' => $code,
						'location' => '',
						'member_since' => '',
					),
					array('%d', '%s', '%s', '%s')
				);
			}
		}
	}

	update_option(OPTION_PITCH_SEQ, $index, false);

	return array(
		'traders' => $index,
		'next' => format_pitch_number($index + 1),
	);
}
