<?php
/**
 * REST endpoint that proxies uploads to remove.bg.
 *
 * POST /wp-json/vibe-stall/v1/remove-background
 *   multipart/form-data, field "image", header "X-WP-Nonce"
 *   200 -> image/png (transparent cutout)
 *   4xx/5xx -> application/json { "error": string, "code": string }
 *
 * The remove.bg key is read server-side only and never reaches the browser.
 *
 * @package VibeStallGenerator
 */

declare( strict_types = 1 );

namespace VibeStall;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const REMOVE_BG_ENDPOINT = 'https://api.remove.bg/v1.0/removebg';
const REQUEST_TIMEOUT    = 60;
const RAW_PNG_KEY        = '__vibe_stall_png';

/** Extension pattern => MIME, in the shape wp_check_filetype_and_ext() expects. */
const ALLOWED_TYPES = array(
	'jpg|jpeg|jpe' => 'image/jpeg',
	'png'          => 'image/png',
	'webp'         => 'image/webp',
);

/** MIME => canonical extension used when storing the temp file. */
const MIME_EXTENSIONS = array(
	'image/jpeg' => 'jpg',
	'image/png'  => 'png',
	'image/webp' => 'webp',
);

/**
 * Registers the route.
 */
function register_rest_routes(): void {
	register_rest_route(
		REST_NAMESPACE,
		REST_ROUTE,
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => __NAMESPACE__ . '\handle_remove_background',
			'permission_callback' => __NAMESPACE__ . '\check_request_permission',
		)
	);
}
add_action( 'rest_api_init', __NAMESPACE__ . '\register_rest_routes' );

/**
 * Builds a JSON error response in the shape the React client expects.
 *
 * @param string $message User-facing message.
 * @param string $code    Machine-readable code.
 * @param int    $status  HTTP status.
 */
function error_response( string $message, string $code, int $status ): WP_REST_Response {
	return new WP_REST_Response(
		array(
			'error'   => $message,
			'code'    => $code,
			'message' => $message,
		),
		$status
	);
}

/**
 * Verifies the REST nonce. The endpoint is open to visitors (the stall editor
 * is a public tool), so the nonce is what ties a request to a real page view.
 *
 * @param WP_REST_Request $request Incoming request.
 *
 * @return true|WP_Error
 */
function check_request_permission( WP_REST_Request $request ) {
	/**
	 * Filters whether a valid REST nonce is required.
	 *
	 * Disable only if full-page caching serves stale nonces and you accept the
	 * reduced protection.
	 *
	 * @param bool $required Default true.
	 */
	$required = (bool) apply_filters( 'vibe_stall_require_nonce', true );

	if ( ! $required ) {
		return true;
	}

	$nonce = (string) $request->get_header( 'X-WP-Nonce' );

	if ( '' === $nonce || ! wp_verify_nonce( $nonce, 'wp_rest' ) ) {
		return new WP_Error(
			'vibe_stall_invalid_nonce',
			__( 'Your session expired. Please refresh the page and try again.', 'vibe-stall-generator' ),
			array( 'status' => 403 )
		);
	}

	return true;
}

/**
 * Visitor IP used for rate limiting.
 */
function get_client_ip(): string {
	$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';

	/**
	 * Filters the client IP, for sites behind a proxy or CDN.
	 *
	 * @param string $ip Detected IP address.
	 */
	return (string) apply_filters( 'vibe_stall_client_ip', $ip );
}

/**
 * Transient key for the current visitor's hourly quota.
 */
function rate_limit_key(): string {
	return 'vibe_stall_rl_' . md5( get_client_ip() );
}

/**
 * True when the visitor still has quota left. Does not consume a slot —
 * call consume_rate_limit() only after a successful remove.bg response so
 * validation failures and upstream errors do not burn credits/slots.
 */
function within_rate_limit(): bool {
	$limit = get_rate_limit();

	if ( $limit <= 0 ) {
		return true;
	}

	return (int) get_transient( rate_limit_key() ) < $limit;
}

/**
 * Consumes one slot from the visitor's hourly quota.
 */
function consume_rate_limit(): void {
	$limit = get_rate_limit();

	if ( $limit <= 0 ) {
		return;
	}

	$key = rate_limit_key();
	set_transient( $key, (int) get_transient( $key ) + 1, HOUR_IN_SECONDS );
}

/**
 * Maps PHP upload error codes to user-facing messages.
 *
 * @param int $error PHP UPLOAD_ERR_* constant.
 *
 * @return array{0:string,1:string,2:int}|null Message, code, status.
 */
function upload_error_details( int $error ): ?array {
	switch ( $error ) {
		case UPLOAD_ERR_OK:
			return null;

		case UPLOAD_ERR_INI_SIZE:
		case UPLOAD_ERR_FORM_SIZE:
			return array(
				__( 'That image is too large for this server. Please upload a smaller photo.', 'vibe-stall-generator' ),
				'FILE_TOO_LARGE',
				413,
			);

		case UPLOAD_ERR_PARTIAL:
		case UPLOAD_ERR_NO_FILE:
			return array(
				__( 'The upload did not complete. Please try again.', 'vibe-stall-generator' ),
				'INCOMPLETE_UPLOAD',
				400,
			);

		default:
			return array(
				__( 'The server could not read the uploaded image. Please try again.', 'vibe-stall-generator' ),
				'UPLOAD_FAILED',
				500,
			);
	}
}

/**
 * Handles POST /remove-background.
 *
 * @param WP_REST_Request $request Incoming request.
 */
function handle_remove_background( WP_REST_Request $request ): WP_REST_Response {
	if ( '' === get_api_key() ) {
		return error_response(
			__( 'Background removal is not configured yet. Please contact the site administrator.', 'vibe-stall-generator' ),
			'MISSING_API_KEY',
			500
		);
	}

	if ( ! within_rate_limit() ) {
		return error_response(
			__( 'Too many uploads in a short time. Please wait a few minutes and try again.', 'vibe-stall-generator' ),
			'RATE_LIMITED',
			429
		);
	}

	$files = $request->get_file_params();
	$file  = $files['image'] ?? null;

	if ( ! is_array( $file ) || empty( $file['tmp_name'] ) ) {
		return error_response(
			__( 'No image was uploaded. Please choose a photo and try again.', 'vibe-stall-generator' ),
			'MISSING_IMAGE',
			400
		);
	}

	$upload_error = upload_error_details( (int) ( $file['error'] ?? UPLOAD_ERR_NO_FILE ) );

	if ( null !== $upload_error ) {
		return error_response( $upload_error[0], $upload_error[1], $upload_error[2] );
	}

	if ( ! is_uploaded_file( $file['tmp_name'] ) ) {
		return error_response(
			__( 'The upload could not be verified. Please try again.', 'vibe-stall-generator' ),
			'INVALID_UPLOAD',
			400
		);
	}

	$max_bytes = get_max_upload_bytes();

	if ( (int) ( $file['size'] ?? 0 ) > $max_bytes ) {
		return error_response(
			sprintf(
				/* translators: %s: formatted file size, e.g. "10 MB". */
				__( 'That image is larger than %s. Please choose a smaller photo.', 'vibe-stall-generator' ),
				size_format( (float) $max_bytes )
			),
			'FILE_TOO_LARGE',
			413
		);
	}

	$stored = store_upload( $file );

	if ( is_wp_error( $stored ) ) {
		$data = $stored->get_error_data();

		return error_response(
			$stored->get_error_message(),
			is_array( $data ) && isset( $data['code'] ) ? (string) $data['code'] : 'INVALID_FILE_TYPE',
			is_array( $data ) && isset( $data['status'] ) ? (int) $data['status'] : 400
		);
	}

	try {
		$contents = file_get_contents( $stored ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents

		if ( false === $contents || '' === $contents ) {
			return error_response(
				__( 'The uploaded image could not be read. Please try again.', 'vibe-stall-generator' ),
				'UNREADABLE_FILE',
				500
			);
		}

		$png = call_remove_bg( $contents, basename( $stored ) );

		if ( is_wp_error( $png ) ) {
			$data = $png->get_error_data();

			return error_response(
				$png->get_error_message(),
				is_array( $data ) && isset( $data['code'] ) ? (string) $data['code'] : 'REMOVE_BG_ERROR',
				is_array( $data ) && isset( $data['status'] ) ? (int) $data['status'] : 502
			);
		}

		consume_rate_limit();

		return new WP_REST_Response( array( RAW_PNG_KEY => $png ), 200 );
	} finally {
		wp_delete_file( $stored );
	}
}

/**
 * Moves the upload into the plugin's private temp directory and validates that
 * the bytes really are an allowed image type.
 *
 * @param array<string,mixed> $file Entry from $_FILES.
 *
 * @return string|WP_Error Absolute path to the stored file.
 */
function store_upload( array $file ) {
	$dir = temp_dir();

	if ( '' === $dir ) {
		return new WP_Error(
			'vibe_stall_no_temp_dir',
			__( 'The server could not prepare the upload folder. Please contact the site administrator.', 'vibe-stall-generator' ),
			array(
				'code'   => 'NO_TEMP_DIR',
				'status' => 500,
			)
		);
	}

	$name       = isset( $file['name'] ) ? sanitize_file_name( (string) $file['name'] ) : 'upload.png';
	$check      = wp_check_filetype_and_ext( (string) $file['tmp_name'], $name, ALLOWED_TYPES );
	$mime       = (string) ( $check['type'] ?: '' );
	$dimensions = @getimagesize( (string) $file['tmp_name'] ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged

	// Shared hosts without fileinfo sometimes leave type empty; fall back to
	// the MIME reported by getimagesize() after a successful image decode.
	if ( '' === $mime && is_array( $dimensions ) && ! empty( $dimensions['mime'] ) ) {
		$mime = (string) $dimensions['mime'];
	}

	if ( ! isset( MIME_EXTENSIONS[ $mime ] ) || false === $dimensions ) {
		return new WP_Error(
			'vibe_stall_invalid_type',
			__( 'Unsupported format. Please upload a JPEG, PNG, or WebP image.', 'vibe-stall-generator' ),
			array(
				'code'   => 'INVALID_FILE_TYPE',
				'status' => 400,
			)
		);
	}

	$target = $dir . 'vibe-stall-' . wp_generate_password( 16, false ) . '.' . MIME_EXTENSIONS[ $mime ];

	if ( ! move_uploaded_file( (string) $file['tmp_name'], $target ) ) {
		return new WP_Error(
			'vibe_stall_move_failed',
			__( 'The server could not store the upload. Please try again.', 'vibe-stall-generator' ),
			array(
				'code'   => 'UPLOAD_FAILED',
				'status' => 500,
			)
		);
	}

	return $target;
}

/**
 * Sends the image to remove.bg and returns the transparent PNG bytes.
 *
 * @param string $contents Raw image bytes.
 * @param string $filename Filename sent to remove.bg.
 *
 * @return string|WP_Error PNG bytes.
 */
function call_remove_bg( string $contents, string $filename ) {
	$boundary = wp_generate_password( 24, false );
	$body     = build_multipart_body(
		$boundary,
		array(
			'size'   => 'auto',
			'format' => 'png',
		),
		'image_file',
		$filename,
		$contents
	);

	$response = wp_remote_post(
		REMOVE_BG_ENDPOINT,
		array(
			'timeout'     => REQUEST_TIMEOUT,
			'redirection' => 0,
			'headers'     => array(
				'X-Api-Key'    => get_api_key(),
				'Content-Type' => 'multipart/form-data; boundary=' . $boundary,
				'Accept'       => 'image/png, application/json',
			),
			'body'        => $body,
		)
	);

	if ( is_wp_error( $response ) ) {
		$is_timeout = false !== stripos( $response->get_error_message(), 'timed out' );

		return new WP_Error(
			'vibe_stall_request_failed',
			$is_timeout
				? __( 'Background removal timed out. Please try again with a smaller image.', 'vibe-stall-generator' )
				: __( 'Could not reach the background-removal service. Please try again in a moment.', 'vibe-stall-generator' ),
			array(
				'code'   => $is_timeout ? 'TIMEOUT' : 'NETWORK_ERROR',
				'status' => $is_timeout ? 504 : 503,
			)
		);
	}

	$status = (int) wp_remote_retrieve_response_code( $response );
	$png    = (string) wp_remote_retrieve_body( $response );

	if ( 200 === $status && '' !== $png ) {
		return $png;
	}

	return remove_bg_error( $status, $png );
}

/**
 * Translates a remove.bg failure into a user-facing WP_Error.
 *
 * @param int    $status Response status code.
 * @param string $body   Response body.
 */
function remove_bg_error( int $status, string $body ): WP_Error {
	$message = __( 'Background removal failed. Please try a different photo.', 'vibe-stall-generator' );
	$code    = 'REMOVE_BG_ERROR';

	$decoded = json_decode( $body, true );
	$first   = is_array( $decoded ) && isset( $decoded['errors'][0] ) ? $decoded['errors'][0] : null;

	if ( is_array( $first ) ) {
		$code = isset( $first['code'] ) ? (string) $first['code'] : $code;

		if ( ! empty( $first['title'] ) ) {
			$message = (string) $first['title'];
		} elseif ( ! empty( $first['detail'] ) ) {
			$message = (string) $first['detail'];
		}
	}

	if ( 'insufficient_credits' === $code ) {
		$message = __( 'Background removal is temporarily unavailable (no credits left). Please contact the site administrator.', 'vibe-stall-generator' );
	} elseif ( 401 === $status || 403 === $status ) {
		$message = __( 'Background removal is misconfigured. Please contact the site administrator.', 'vibe-stall-generator' );
		$code    = 'INVALID_API_KEY';
	} elseif ( 429 === $status ) {
		$message = __( 'The background-removal service is busy. Please try again shortly.', 'vibe-stall-generator' );
		$code    = 'RATE_LIMITED';
	}

	return new WP_Error(
		'vibe_stall_remove_bg_failed',
		$message,
		array(
			'code'   => $code,
			'status' => ( $status >= 400 && $status < 600 ) ? $status : 502,
		)
	);
}

/**
 * Builds a multipart/form-data payload for the WordPress HTTP API.
 *
 * @param string                $boundary   Multipart boundary.
 * @param array<string,string>  $fields     Simple text fields.
 * @param string                $file_field Field name for the file part.
 * @param string                $filename   Filename for the file part.
 * @param string                $contents   Raw file bytes.
 */
function build_multipart_body(
	string $boundary,
	array $fields,
	string $file_field,
	string $filename,
	string $contents
): string {
	$eol  = "\r\n";
	$body = '';

	foreach ( $fields as $name => $value ) {
		$body .= '--' . $boundary . $eol;
		$body .= 'Content-Disposition: form-data; name="' . $name . '"' . $eol . $eol;
		$body .= $value . $eol;
	}

	$safe_name = str_replace( array( '"', "\r", "\n" ), '', $filename );

	$body .= '--' . $boundary . $eol;
	$body .= 'Content-Disposition: form-data; name="' . $file_field . '"; filename="' . $safe_name . '"' . $eol;
	$body .= 'Content-Type: application/octet-stream' . $eol . $eol;
	$body .= $contents . $eol;
	$body .= '--' . $boundary . '--' . $eol;

	return $body;
}

/**
 * Streams the PNG instead of letting the REST server JSON-encode it.
 *
 * @param bool            $served  Whether the request was already served.
 * @param mixed           $result  Response object.
 * @param WP_REST_Request $request Current request.
 * @param WP_REST_Server  $server  REST server instance.
 *
 * @return bool
 */
function serve_png_response( $served, $result, $request, $server ) {
	$route = '/' . REST_NAMESPACE . REST_ROUTE;

	if ( ! $request instanceof WP_REST_Request || $route !== $request->get_route() ) {
		return $served;
	}

	if ( ! $result instanceof WP_REST_Response ) {
		return $served;
	}

	$data = $result->get_data();

	if ( ! is_array( $data ) || ! isset( $data[ RAW_PNG_KEY ] ) ) {
		return $served;
	}

	$png = (string) $data[ RAW_PNG_KEY ];

	status_header( 200 );
	header( 'Content-Type: image/png' );
	header( 'Content-Length: ' . strlen( $png ) );
	header( 'Content-Disposition: inline; filename="cutout.png"' );
	header( 'Cache-Control: no-store, no-cache, must-revalidate' );
	header( 'X-Content-Type-Options: nosniff' );

	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Binary PNG payload.
	echo $png;

	return true;
}
add_filter( 'rest_pre_serve_request', __NAMESPACE__ . '\serve_png_response', 10, 4 );
