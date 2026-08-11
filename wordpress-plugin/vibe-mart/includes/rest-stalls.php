<?php
/**
 * Stall / marketplace REST CRUD.
 *
 * Endpoints (namespace vibe-mart/v1):
 * - GET    /marketplace          public published stalls
 * - GET    /stalls/mine          owner's stalls
 * - POST   /stalls               create (owner = current user)
 * - GET    /stalls/{id}          public if published; owner for drafts
 * - PUT    /stalls/{id}          update (owner only)
 * - DELETE /stalls/{id}          delete + children (owner only)
 *
 * @package VibeMartPlugin
 */

declare(strict_types=1);

namespace VibeMart\Plugin;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

if (! defined('ABSPATH')) {
	exit;
}

const STALL_MAX_PRODUCTS = 6;
const STALL_STATUSES = array('draft', 'published');
/** Free-tier cap: traders may own at most this many stalls. */
const STALL_MAX_FREE = 5;

add_action(
	'rest_api_init',
	static function (): void {
		register_rest_route(
			REST_NAMESPACE,
			'/marketplace',
			array(
				'methods' => WP_REST_Server::READABLE,
				'callback' => __NAMESPACE__ . '\\marketplace_list',
				'permission_callback' => '__return_true',
				'args' => array(
					'search' => array(
						'type' => 'string',
						'required' => false,
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);

		register_rest_route(
			REST_NAMESPACE,
			'/stalls/mine',
			array(
				'methods' => WP_REST_Server::READABLE,
				'callback' => __NAMESPACE__ . '\\stalls_mine',
				'permission_callback' => __NAMESPACE__ . '\\require_logged_in',
			)
		);

		register_rest_route(
			REST_NAMESPACE,
			'/stalls',
			array(
				'methods' => WP_REST_Server::CREATABLE,
				'callback' => __NAMESPACE__ . '\\stall_create',
				'permission_callback' => __NAMESPACE__ . '\\require_logged_in',
			)
		);

		register_rest_route(
			REST_NAMESPACE,
			'/stalls/(?P<id>\\d+)',
			array(
				array(
					'methods' => WP_REST_Server::READABLE,
					'callback' => __NAMESPACE__ . '\\stall_get',
					'permission_callback' => '__return_true',
					'args' => array(
						'id' => array(
							'type' => 'integer',
							'required' => true,
						),
					),
				),
				array(
					'methods' => WP_REST_Server::EDITABLE,
					'callback' => __NAMESPACE__ . '\\stall_update',
					'permission_callback' => __NAMESPACE__ . '\\require_logged_in',
					'args' => array(
						'id' => array(
							'type' => 'integer',
							'required' => true,
						),
					),
				),
				array(
					'methods' => WP_REST_Server::DELETABLE,
					'callback' => __NAMESPACE__ . '\\stall_delete',
					'permission_callback' => __NAMESPACE__ . '\\require_logged_in',
					'args' => array(
						'id' => array(
							'type' => 'integer',
							'required' => true,
						),
					),
				),
			)
		);
	}
);

/**
 * Serialize a stall row (+ optional nested products / badges / pitch).
 *
 * @return array<string, mixed>
 */
function stall_row_to_array(object $row, bool $with_children = false): array {
	global $wpdb;

	$data = array(
		'id' => (int) $row->id,
		'owner_id' => (int) $row->owner_id,
		'brand_name' => (string) $row->brand_name,
		'seller_photo' => (string) $row->seller_photo,
		'seller_bio' => (string) $row->seller_bio,
		'ambition' => (string) $row->ambition,
		'status' => (string) $row->status,
		'created_at' => (string) $row->created_at,
		'updated_at' => (string) $row->updated_at,
		'pitch_number' => '',
		'pitch_location' => '',
		'member_since' => '',
		'product_count' => 0,
		'products' => array(),
		'badges' => array(),
	);

	$pitch = $wpdb->get_row(
		$wpdb->prepare('SELECT * FROM ' . table('pitches') . ' WHERE stall_id = %d', $row->id)
	);
	if ($pitch) {
		$data['pitch_number'] = (string) $pitch->pitch_number;
		$data['pitch_location'] = (string) $pitch->location;
		$data['member_since'] = (string) $pitch->member_since;
	}

	$data['product_count'] = (int) $wpdb->get_var(
		$wpdb->prepare('SELECT COUNT(*) FROM ' . table('products') . ' WHERE stall_id = %d', $row->id)
	);

	$badge_rows = $wpdb->get_results(
		$wpdb->prepare('SELECT label FROM ' . table('badges') . ' WHERE stall_id = %d', $row->id)
	);
	$data['badges'] = array_map(static fn($b) => (string) $b->label, $badge_rows ?: array());

	if ($with_children) {
		$products = $wpdb->get_results(
			$wpdb->prepare(
				'SELECT * FROM ' . table('products') . ' WHERE stall_id = %d ORDER BY sort_order ASC, id ASC',
				$row->id
			)
		);
		$data['products'] = array_map(
			static function ($p) {
				$image_urls = array();
				if (! empty($p->image_urls)) {
					$decoded = json_decode((string) $p->image_urls, true);
					if (is_array($decoded)) {
						foreach ($decoded as $url) {
							$url = (string) $url;
							if ('' !== $url) {
								$image_urls[] = $url;
							}
						}
					}
				}
				$primary = (string) $p->image_url;
				if (! $image_urls && '' !== $primary) {
					$image_urls[] = $primary;
				}
				if ($image_urls && '' === $primary) {
					$primary = (string) $image_urls[0];
				}
				return array(
					'id' => (int) $p->id,
					'name' => (string) $p->name,
					'condition' => (string) $p->condition_label,
					'price' => (string) $p->price,
					'description' => (string) $p->description,
					'image_url' => $primary,
					'image_urls' => array_values(array_slice($image_urls, 0, 6)),
					'sort_order' => (int) $p->sort_order,
				);
			},
			$products ?: array()
		);
	}

	return $data;
}

/**
 * Normalize request JSON / form params into an array.
 *
 * @return array<string, mixed>
 */
function stall_request_payload(WP_REST_Request $request): array {
	$json = $request->get_json_params();
	if (is_array($json) && $json) {
		return $json;
	}
	$params = $request->get_params();
	unset($params['id']);
	return is_array($params) ? $params : array();
}

function stall_normalize_status(mixed $status, string $fallback = 'draft'): string {
	$key = sanitize_key((string) $status);
	return in_array($key, STALL_STATUSES, true) ? $key : $fallback;
}

/**
 * Sync pitch / products / badges when those keys are present in the payload.
 * Omitting a key leaves existing children untouched (avoids wiping on partial updates).
 *
 * @param array<string, mixed> $payload
 */
function sync_stall_children(int $stall_id, array $payload, bool $force_all = false): void {
	global $wpdb;

	$sync_pitch = $force_all
		|| array_key_exists('pitch_number', $payload)
		|| array_key_exists('pitch_location', $payload)
		|| array_key_exists('member_since', $payload);

	if ($sync_pitch) {
		$wpdb->delete(table('pitches'), array('stall_id' => $stall_id), array('%d'));
		$wpdb->insert(
			table('pitches'),
			array(
				'stall_id' => $stall_id,
				'pitch_number' => sanitize_text_field((string) ($payload['pitch_number'] ?? '')),
				'location' => sanitize_text_field((string) ($payload['pitch_location'] ?? '')),
				'member_since' => sanitize_text_field((string) ($payload['member_since'] ?? '')),
			),
			array('%d', '%s', '%s', '%s')
		);
	}

	if ($force_all || array_key_exists('products', $payload)) {
		$wpdb->delete(table('products'), array('stall_id' => $stall_id), array('%d'));
		$products = is_array($payload['products'] ?? null) ? $payload['products'] : array();
		$products = array_slice($products, 0, STALL_MAX_PRODUCTS);
		foreach ($products as $index => $product) {
			if (! is_array($product)) {
				continue;
			}
			$name = sanitize_text_field((string) ($product['name'] ?? ''));
			$image_urls = array();
			if (! empty($product['image_urls']) && is_array($product['image_urls'])) {
				foreach (array_slice($product['image_urls'], 0, 6) as $url) {
					$raw = (string) $url;
					if ('' === $raw) {
						continue;
					}
					$image_urls[] = str_starts_with($raw, 'data:') ? $raw : esc_url_raw($raw);
				}
			}
			$legacy = (string) ($product['image_url'] ?? $product['image'] ?? '');
			if (! $image_urls && '' !== $legacy) {
				$image_urls[] = str_starts_with($legacy, 'data:') ? $legacy : esc_url_raw($legacy);
			}
			$image_urls = array_values(array_filter($image_urls, static fn($url) => '' !== (string) $url));
			$primary = (string) ($image_urls[0] ?? '');
			if ('' === $name && '' === $primary) {
				continue;
			}
			$wpdb->insert(
				table('products'),
				array(
					'stall_id' => $stall_id,
					'name' => $name,
					'condition_label' => sanitize_text_field((string) ($product['condition'] ?? $product['label'] ?? $product['variation'] ?? '')),
					'price' => sanitize_text_field((string) ($product['price'] ?? '')),
					'description' => sanitize_textarea_field((string) ($product['description'] ?? '')),
					'image_url' => $primary,
					'image_urls' => $image_urls ? wp_json_encode($image_urls) : null,
					'sort_order' => (int) $index,
				),
				array('%d', '%s', '%s', '%s', '%s', '%s', '%s', '%d')
			);
		}
	}

	if ($force_all || array_key_exists('badges', $payload)) {
		$wpdb->delete(table('badges'), array('stall_id' => $stall_id), array('%d'));
		$badges = is_array($payload['badges'] ?? null) ? $payload['badges'] : array();
		foreach ($badges as $badge) {
			$label = sanitize_text_field(is_array($badge) ? (string) ($badge['label'] ?? '') : (string) $badge);
			if ('' === $label) {
				continue;
			}
			$wpdb->insert(
				table('badges'),
				array(
					'stall_id' => $stall_id,
					'label' => $label,
				),
				array('%d', '%s')
			);
		}
	}
}

function marketplace_list(WP_REST_Request $request): WP_REST_Response {
	global $wpdb;
	$search = sanitize_text_field((string) $request->get_param('search'));
	$table = table('stalls');

	if ('' !== $search) {
		$like = '%' . $wpdb->esc_like($search) . '%';
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$table} WHERE status = %s AND (brand_name LIKE %s OR seller_bio LIKE %s) ORDER BY updated_at DESC LIMIT 100",
				'published',
				$like,
				$like
			)
		);
	} else {
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$table} WHERE status = %s ORDER BY updated_at DESC LIMIT 100",
				'published'
			)
		);
	}

	$items = array_map(static fn($row) => stall_row_to_array($row, true), $rows ?: array());
	return new WP_REST_Response(array('items' => $items), 200);
}

function stalls_mine(): WP_REST_Response {
	global $wpdb;
	$rows = $wpdb->get_results(
		$wpdb->prepare(
			'SELECT * FROM ' . table('stalls') . ' WHERE owner_id = %d ORDER BY updated_at DESC',
			get_current_user_id()
		)
	);
	$items = array_map(static fn($row) => stall_row_to_array($row, false), $rows ?: array());
	return new WP_REST_Response(array('items' => $items), 200);
}

function stall_get(WP_REST_Request $request): WP_REST_Response|WP_Error {
	$row = get_stall_row((int) $request['id']);
	if (! $row) {
		return new WP_Error('vibe_mart_not_found', __('Stall not found.', 'vibe-mart'), array('status' => 404));
	}
	if ('published' !== $row->status && ! stall_owned_by_current_user($row)) {
		return new WP_Error('vibe_mart_forbidden', __('This stall is not public.', 'vibe-mart'), array('status' => 403));
	}
	return new WP_REST_Response(stall_row_to_array($row, true), 200);
}

function stall_can_edit(object $row): bool {
	return stall_owned_by_current_user($row);
}

/**
 * How many stalls the current user already owns.
 */
function count_owned_stalls(int $owner_id): int {
	global $wpdb;
	if ($owner_id <= 0) {
		return 0;
	}
	return (int) $wpdb->get_var(
		$wpdb->prepare(
			'SELECT COUNT(*) FROM ' . table('stalls') . ' WHERE owner_id = %d',
			$owner_id
		)
	);
}

/**
 * Extra required fields when publishing to the market.
 *
 * @param array<string, mixed> $payload
 * @param array<string, mixed> $seller
 */
function validate_publish_payload(array $payload, array $seller): ?WP_Error {
	$bio = trim((string) ($payload['seller_bio'] ?? $seller['about'] ?? ''));
	$ambition = trim((string) ($payload['ambition'] ?? $seller['ambition'] ?? ''));
	$photo = trim((string) ($payload['seller_photo'] ?? ''));
	$pitch_number = trim((string) ($payload['pitch_number'] ?? ''));
	$pitch_location = trim((string) ($payload['pitch_location'] ?? ''));
	$products = is_array($payload['products'] ?? null) ? $payload['products'] : array();
	$badges = is_array($payload['badges'] ?? null) ? $payload['badges'] : array();

	$missing = array();
	if ('' === $photo) {
		$missing[] = 'seller photo';
	}
	if ('' === $bio) {
		$missing[] = 'bio';
	}
	if ('' === $ambition) {
		$missing[] = 'ambition';
	}
	if ('' === $pitch_number) {
		$missing[] = 'pitch number';
	}
	if ('' === $pitch_location) {
		$missing[] = 'pitch location';
	}
	if (count($products) < 1) {
		$missing[] = 'at least one product';
	}
	if (count($badges) < 1) {
		$missing[] = 'trust badge';
	}

	if ($missing) {
		return new WP_Error(
			'vibe_mart_invalid',
			sprintf(
				/* translators: %s: comma-separated list of missing fields */
				__('Cannot publish — missing: %s.', 'vibe-mart'),
				implode(', ', $missing)
			),
			array('status' => 400, 'missing' => $missing)
		);
	}

	return null;
}

function stall_create(WP_REST_Request $request): WP_REST_Response|WP_Error {
	global $wpdb;

	$owner_id = (int) get_current_user_id();
	if ($owner_id <= 0) {
		return new WP_Error('vibe_mart_unauthorized', __('Please log in.', 'vibe-mart'), array('status' => 401));
	}

	$owned = count_owned_stalls($owner_id);
	if ($owned >= STALL_MAX_FREE) {
		return new WP_Error(
			'vibe_mart_stall_limit',
			__('Maximum 5 Free Stalls.', 'vibe-mart'),
			array(
				'status' => 403,
				'limit' => STALL_MAX_FREE,
				'count' => $owned,
			)
		);
	}

	$payload = stall_request_payload($request);
	$seller = is_array($payload['seller'] ?? null) ? $payload['seller'] : array();
	$brand = sanitize_text_field((string) ($payload['brand_name'] ?? $payload['business_name'] ?? ''));
	if ('' === $brand) {
		$brand = __('Untitled stall', 'vibe-mart');
	}

	$status = stall_normalize_status($payload['status'] ?? 'draft');
	// Fields are optional for drafts and published stalls alike.

	// Prefer long media / data-URL strings without aggressive URL sanitizing when data: is used.
	$seller_photo_raw = (string) ($payload['seller_photo'] ?? '');
	$seller_photo = str_starts_with($seller_photo_raw, 'data:')
		? $seller_photo_raw
		: esc_url_raw($seller_photo_raw);

	$ok = $wpdb->insert(
		table('stalls'),
		array(
			'owner_id' => $owner_id,
			'brand_name' => $brand,
			'seller_photo' => $seller_photo,
			'seller_bio' => sanitize_textarea_field((string) ($payload['seller_bio'] ?? $seller['about'] ?? '')),
			'ambition' => sanitize_textarea_field((string) ($payload['ambition'] ?? $seller['ambition'] ?? '')),
			'status' => $status,
			'created_at' => current_time('mysql'),
			'updated_at' => current_time('mysql'),
		),
		array('%d', '%s', '%s', '%s', '%s', '%s', '%s', '%s')
	);

	if (! $ok) {
		return new WP_Error('vibe_mart_db', __('Could not create stall.', 'vibe-mart'), array('status' => 500));
	}

	$id = (int) $wpdb->insert_id;
	// On create, always write child tables (empty placeholders for pitch are fine).
	sync_stall_children($id, $payload, true);

	$row = get_stall_row($id);
	if (! $row) {
		return new WP_Error('vibe_mart_db', __('Could not create stall.', 'vibe-mart'), array('status' => 500));
	}

	$response = stall_row_to_array($row, true);
	$response['published'] = 'published' === $row->status;
	$response['message'] = 'published' === $row->status
		? __( 'Stall published to the market.', 'vibe-mart' )
		: __( 'Stall saved as draft.', 'vibe-mart' );

	return new WP_REST_Response($response, 201);
}

function stall_update(WP_REST_Request $request): WP_REST_Response|WP_Error {
	global $wpdb;

	$id = (int) $request['id'];
	$row = get_stall_row($id);
	if (! $row) {
		return new WP_Error('vibe_mart_not_found', __('Stall not found.', 'vibe-mart'), array('status' => 404));
	}
	if (! stall_can_edit($row)) {
		return new WP_Error('vibe_mart_forbidden', __('You cannot edit this stall.', 'vibe-mart'), array('status' => 403));
	}

	$payload = stall_request_payload($request);
	$seller = is_array($payload['seller'] ?? null) ? $payload['seller'] : array();
	$update = array('updated_at' => current_time('mysql'));

  if (isset($payload['brand_name']) || isset($payload['business_name'])) {
		$brand = sanitize_text_field((string) ($payload['brand_name'] ?? $payload['business_name']));
		if ('' === $brand) {
			$brand = __('Untitled stall', 'vibe-mart');
		}
		$update['brand_name'] = $brand;
	}
	if (array_key_exists('seller_photo', $payload)) {
		$seller_photo_raw = (string) $payload['seller_photo'];
		$update['seller_photo'] = str_starts_with($seller_photo_raw, 'data:')
			? $seller_photo_raw
			: esc_url_raw($seller_photo_raw);
	}
	if (isset($payload['seller_bio']) || isset($seller['about'])) {
		$update['seller_bio'] = sanitize_textarea_field((string) ($payload['seller_bio'] ?? $seller['about'] ?? ''));
	}
	if (isset($payload['ambition']) || isset($seller['ambition'])) {
		$update['ambition'] = sanitize_textarea_field((string) ($payload['ambition'] ?? $seller['ambition'] ?? ''));
	}
	if (isset($payload['status'])) {
		$update['status'] = stall_normalize_status($payload['status'], (string) $row->status);
	}

	$result = $wpdb->update(table('stalls'), $update, array('id' => $id));
	if (false === $result) {
		return new WP_Error('vibe_mart_db', __('Could not update stall.', 'vibe-mart'), array('status' => 500));
	}

	sync_stall_children($id, $payload, false);

	$fresh = get_stall_row($id);
	if (! $fresh) {
		return new WP_Error('vibe_mart_not_found', __('Stall not found.', 'vibe-mart'), array('status' => 404));
	}

	return new WP_REST_Response(stall_row_to_array($fresh, true), 200);
}

function stall_delete(WP_REST_Request $request): WP_REST_Response|WP_Error {
	$id = (int) $request['id'];
	$row = get_stall_row($id);
	if (! $row) {
		return new WP_Error('vibe_mart_not_found', __('Stall not found.', 'vibe-mart'), array('status' => 404));
	}
	if (! stall_can_edit($row)) {
		return new WP_Error('vibe_mart_forbidden', __('You cannot delete this stall.', 'vibe-mart'), array('status' => 403));
	}

	if (! delete_stall_cascade($id)) {
		return new WP_Error('vibe_mart_db', __('Could not delete stall.', 'vibe-mart'), array('status' => 500));
	}

	return new WP_REST_Response(array('ok' => true, 'id' => $id), 200);
}
