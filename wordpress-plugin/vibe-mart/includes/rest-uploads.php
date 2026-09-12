<?php
/**
 * Stall image uploads into the WordPress media library.
 *
 * POST /wp-json/vibe-mart/v1/uploads
 *   multipart/form-data, field "file" (or "image"), header "X-WP-Nonce"
 *   201 -> { id, url, mime, width, height }
 *
 * Stall photos used to travel as base64 data-URLs inside the stall JSON, which
 * meant whole images were written into the database. Everything now becomes a
 * real attachment and only the URL is stored. sanitize_image_reference() still
 * accepts a data-URL and converts it, so older clients and rows keep working.
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

/** Subfolder inside the uploads dir, so stall art is easy to spot. */
const UPLOAD_FILENAME_PREFIX = 'vibe-mart-';

add_action(
	'rest_api_init',
	static function (): void {
		register_rest_route(
			REST_NAMESPACE,
			'/uploads',
			array(
				'methods' => WP_REST_Server::CREATABLE,
				'callback' => __NAMESPACE__ . '\\handle_image_upload',
				'permission_callback' => __NAMESPACE__ . '\\require_logged_in',
			)
		);
	}
);

/**
 * Load the WordPress upload / attachment helpers on demand.
 */
function load_media_helpers(): void {
	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/image.php';
	require_once ABSPATH . 'wp-admin/includes/media.php';
}

/**
 * REST handler: store one uploaded image and return its media library URL.
 */
function handle_image_upload(WP_REST_Request $request): WP_REST_Response|WP_Error {
	$files = $request->get_file_params();
	$file = $files['file'] ?? $files['image'] ?? null;

	if (! is_array($file) || empty($file['tmp_name'])) {
		return new WP_Error(
			'vibe_mart_upload_missing',
			__('No image was received.', 'vibe-mart'),
			array('status' => 400)
		);
	}

	$stored = store_uploaded_image($file, (int) get_current_user_id());
	if (is_wp_error($stored)) {
		return $stored;
	}

	return new WP_REST_Response($stored, 201);
}

/**
 * Move an uploaded file into the media library.
 *
 * @param array<string, mixed> $file One entry from $_FILES.
 *
 * @return array<string, mixed>|WP_Error { id, url, mime, width, height }
 */
function store_uploaded_image(array $file, int $owner_id): array|WP_Error {
	$max = get_max_upload_bytes();
	if ((int) ($file['size'] ?? 0) > $max) {
		return new WP_Error(
			'vibe_mart_upload_too_large',
			sprintf(
				/* translators: %s: human readable size, e.g. "10 MB" */
				__('That image is too large. Maximum size is %s.', 'vibe-mart'),
				size_format($max)
			),
			array('status' => 413)
		);
	}

	$checked = wp_check_filetype_and_ext(
		(string) ($file['tmp_name'] ?? ''),
		(string) ($file['name'] ?? ''),
		ALLOWED_TYPES
	);
	$mime = (string) ($checked['type'] ?? '');
	if (! isset(MIME_EXTENSIONS[ $mime ])) {
		return new WP_Error(
			'vibe_mart_upload_type',
			__('Please upload a JPG, PNG or WebP image.', 'vibe-mart'),
			array('status' => 400)
		);
	}

	load_media_helpers();

	$overrides = array(
		'test_form' => false,
		'mimes' => ALLOWED_TYPES,
		'unique_filename_callback' => static function (string $dir, string $name, string $ext): string {
			return UPLOAD_FILENAME_PREFIX . wp_generate_password(12, false) . $ext;
		},
	);

	$handled = wp_handle_upload($file, $overrides);
	if (! is_array($handled) || isset($handled['error'])) {
		return new WP_Error(
			'vibe_mart_upload_failed',
			(string) ($handled['error'] ?? __('Could not save that image.', 'vibe-mart')),
			array('status' => 500)
		);
	}

	return attach_media_file(
		(string) $handled['file'],
		(string) $handled['url'],
		(string) $handled['type'],
		$owner_id
	);
}

/**
 * Decode a base64 data-URL into the media library.
 *
 * @return array<string, mixed>|WP_Error
 */
function store_data_url_image(string $data_url, int $owner_id): array|WP_Error {
	if (! preg_match('#^data:([a-z0-9.+/-]+);base64,(.+)$#is', trim($data_url), $matches)) {
		return new WP_Error(
			'vibe_mart_upload_type',
			__('That image could not be read.', 'vibe-mart'),
			array('status' => 400)
		);
	}

	$mime = strtolower(trim($matches[1]));
	if (! isset(MIME_EXTENSIONS[ $mime ])) {
		return new WP_Error(
			'vibe_mart_upload_type',
			__('Please upload a JPG, PNG or WebP image.', 'vibe-mart'),
			array('status' => 400)
		);
	}

	$bytes = base64_decode(preg_replace('/\s+/', '', $matches[2]) ?? '', true);
	if (false === $bytes || '' === $bytes) {
		return new WP_Error(
			'vibe_mart_upload_failed',
			__('That image could not be decoded.', 'vibe-mart'),
			array('status' => 400)
		);
	}

	$max = get_max_upload_bytes();
	if (strlen($bytes) > $max) {
		return new WP_Error(
			'vibe_mart_upload_too_large',
			sprintf(
				/* translators: %s: human readable size, e.g. "10 MB" */
				__('That image is too large. Maximum size is %s.', 'vibe-mart'),
				size_format($max)
			),
			array('status' => 413)
		);
	}

	$filename = UPLOAD_FILENAME_PREFIX . wp_generate_password(12, false) . '.' . MIME_EXTENSIONS[ $mime ];
	$saved = wp_upload_bits($filename, null, $bytes);
	if (! empty($saved['error'])) {
		return new WP_Error(
			'vibe_mart_upload_failed',
			(string) $saved['error'],
			array('status' => 500)
		);
	}

	return attach_media_file(
		(string) $saved['file'],
		(string) $saved['url'],
		$mime,
		$owner_id
	);
}

/**
 * Register an already-saved file as an attachment and build thumbnails.
 *
 * @return array<string, mixed>|WP_Error
 */
function attach_media_file(string $path, string $url, string $mime, int $owner_id): array|WP_Error {
	load_media_helpers();

	$attachment_id = wp_insert_attachment(
		array(
			'post_mime_type' => $mime,
			'post_title' => sanitize_file_name(pathinfo($path, PATHINFO_FILENAME)),
			'post_content' => '',
			'post_status' => 'inherit',
			'post_author' => $owner_id > 0 ? $owner_id : 0,
		),
		$path
	);

	if (is_wp_error($attachment_id)) {
		return $attachment_id;
	}
	if (! $attachment_id) {
		return new WP_Error(
			'vibe_mart_upload_failed',
			__('Could not add that image to the media library.', 'vibe-mart'),
			array('status' => 500)
		);
	}

	$attachment_id = (int) $attachment_id;
	$metadata = wp_generate_attachment_metadata($attachment_id, $path);
	if (is_array($metadata)) {
		wp_update_attachment_metadata($attachment_id, $metadata);
	}

	update_post_meta($attachment_id, '_vibe_mart_upload', '1');

	return array(
		'id' => $attachment_id,
		'url' => wp_get_attachment_url($attachment_id) ?: $url,
		'mime' => $mime,
		'width' => (int) ($metadata['width'] ?? 0),
		'height' => (int) ($metadata['height'] ?? 0),
	);
}

/**
 * Normalize an incoming image reference for storage.
 *
 * Media library / remote URLs pass through sanitized. A base64 data-URL is
 * converted into a real attachment so images never land in the database. If the
 * conversion fails the original string is kept, so a save is never lost.
 */
function sanitize_image_reference(mixed $raw, int $owner_id = 0): string {
	$value = trim((string) $raw);
	if ('' === $value) {
		return '';
	}

	if (! str_starts_with(strtolower($value), 'data:')) {
		return esc_url_raw($value);
	}

	$stored = store_data_url_image($value, $owner_id);
	if (is_wp_error($stored)) {
		return $value;
	}

	return (string) $stored['url'];
}
