<?php
/**
 * Admin settings: remove.bg credentials and upload limits.
 *
 * The API key is only ever read server-side. It is never localized into the
 * page, never returned by the REST route, and never written to the DOM.
 *
 * @package VibeStallGenerator
 */

declare( strict_types = 1 );

namespace VibeStall;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const OPTION_API_KEY    = 'vibe_stall_api_key';
const OPTION_MAX_UPLOAD = 'vibe_stall_max_upload_mb';
const OPTION_RATE_LIMIT = 'vibe_stall_rate_limit';

const DEFAULT_MAX_UPLOAD_MB = 10;
const DEFAULT_RATE_LIMIT    = 20;

/**
 * remove.bg API key, preferring a wp-config.php constant over the DB option.
 */
function get_api_key(): string {
	if ( defined( 'VIBE_STALL_REMOVE_BG_API_KEY' ) && '' !== (string) VIBE_STALL_REMOVE_BG_API_KEY ) {
		return trim( (string) VIBE_STALL_REMOVE_BG_API_KEY );
	}

	return trim( (string) get_option( OPTION_API_KEY, '' ) );
}

/**
 * True when the key comes from wp-config.php and must not be editable in the UI.
 */
function api_key_is_constant(): bool {
	return defined( 'VIBE_STALL_REMOVE_BG_API_KEY' ) && '' !== (string) VIBE_STALL_REMOVE_BG_API_KEY;
}

/**
 * Maximum accepted upload size in bytes, capped by the server's own limit.
 */
function get_max_upload_bytes(): int {
	$configured = (int) get_option( OPTION_MAX_UPLOAD, DEFAULT_MAX_UPLOAD_MB );
	$configured = max( 1, min( 50, $configured ) ) * MB_IN_BYTES;
	$server_max = (int) wp_max_upload_size();

	if ( $server_max > 0 ) {
		$configured = min( $configured, $server_max );
	}

	/**
	 * Filters the maximum upload size accepted by the stall generator.
	 *
	 * @param int $configured Size in bytes.
	 */
	return (int) apply_filters( 'vibe_stall_max_upload_bytes', $configured );
}

/**
 * Allowed background removals per IP per hour. Zero disables rate limiting.
 */
function get_rate_limit(): int {
	$limit = (int) get_option( OPTION_RATE_LIMIT, DEFAULT_RATE_LIMIT );

	/**
	 * Filters the hourly per-IP request limit.
	 *
	 * @param int $limit Requests per hour; 0 disables the limit.
	 */
	return (int) apply_filters( 'vibe_stall_rate_limit', max( 0, $limit ) );
}

/**
 * Registers options with sanitizing callbacks.
 */
function register_settings(): void {
	register_setting(
		OPTION_GROUP,
		OPTION_API_KEY,
		array(
			'type'              => 'string',
			'default'           => '',
			'sanitize_callback' => __NAMESPACE__ . '\sanitize_api_key',
			'show_in_rest'      => false,
		)
	);

	register_setting(
		OPTION_GROUP,
		OPTION_MAX_UPLOAD,
		array(
			'type'              => 'integer',
			'default'           => DEFAULT_MAX_UPLOAD_MB,
			'sanitize_callback' => static fn( $value ): int => max( 1, min( 50, (int) $value ) ),
			'show_in_rest'      => false,
		)
	);

	register_setting(
		OPTION_GROUP,
		OPTION_RATE_LIMIT,
		array(
			'type'              => 'integer',
			'default'           => DEFAULT_RATE_LIMIT,
			'sanitize_callback' => static fn( $value ): int => max( 0, min( 1000, (int) $value ) ),
			'show_in_rest'      => false,
		)
	);
}
add_action( 'admin_init', __NAMESPACE__ . '\register_settings' );

/**
 * Keeps the stored key when the field is submitted empty (masked display).
 *
 * @param mixed $value Raw submitted value.
 */
function sanitize_api_key( $value ): string {
	$value = sanitize_text_field( (string) $value );

	if ( '' === trim( $value ) ) {
		return (string) get_option( OPTION_API_KEY, '' );
	}

	return trim( $value );
}

/**
 * Adds the Settings -> Vibe Stall page.
 */
function register_settings_page(): void {
	add_options_page(
		__( 'Vibe Stall Generator', 'vibe-stall-generator' ),
		__( 'Vibe Stall', 'vibe-stall-generator' ),
		'manage_options',
		'vibe-stall-generator',
		__NAMESPACE__ . '\render_settings_page'
	);
}
add_action( 'admin_menu', __NAMESPACE__ . '\register_settings_page' );

/**
 * Renders the settings screen.
 */
function render_settings_page(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	$has_key      = '' !== get_api_key();
	$from_config  = api_key_is_constant();
	$max_upload   = (int) get_option( OPTION_MAX_UPLOAD, DEFAULT_MAX_UPLOAD_MB );
	$rate_limit   = (int) get_option( OPTION_RATE_LIMIT, DEFAULT_RATE_LIMIT );
	$assets_ready = assets_are_built();
	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'Vibe Stall Generator', 'vibe-stall-generator' ); ?></h1>

		<p>
			<?php
			printf(
				/* translators: %s: shortcode */
				esc_html__( 'Place the stall generator on any page with the %s shortcode.', 'vibe-stall-generator' ),
				'<code>[' . esc_html( SHORTCODE ) . ']</code>'
			);
			?>
		</p>

		<?php if ( ! $assets_ready ) : ?>
			<div class="notice notice-error">
				<p>
					<?php esc_html_e( 'React assets are missing. Run "npm run build:wp" and upload assets/react/ before using the shortcode.', 'vibe-stall-generator' ); ?>
				</p>
			</div>
		<?php endif; ?>

		<?php if ( ! $has_key ) : ?>
			<div class="notice notice-warning">
				<p><?php esc_html_e( 'Add a remove.bg API key to enable background removal.', 'vibe-stall-generator' ); ?></p>
			</div>
		<?php endif; ?>

		<form action="options.php" method="post">
			<?php settings_fields( OPTION_GROUP ); ?>

			<table class="form-table" role="presentation">
				<tr>
					<th scope="row">
						<label for="vibe-stall-api-key"><?php esc_html_e( 'remove.bg API key', 'vibe-stall-generator' ); ?></label>
					</th>
					<td>
						<?php if ( $from_config ) : ?>
							<p>
								<strong><?php esc_html_e( 'Set in wp-config.php', 'vibe-stall-generator' ); ?></strong><br />
								<span class="description"><code>VIBE_STALL_REMOVE_BG_API_KEY</code></span>
							</p>
						<?php else : ?>
							<input
								type="password"
								id="vibe-stall-api-key"
								name="<?php echo esc_attr( OPTION_API_KEY ); ?>"
								value=""
								class="regular-text"
								autocomplete="off"
								placeholder="<?php echo $has_key ? esc_attr__( 'Saved — leave blank to keep', 'vibe-stall-generator' ) : ''; ?>"
							/>
							<p class="description">
								<?php esc_html_e( 'Stored server-side only. For extra safety define VIBE_STALL_REMOVE_BG_API_KEY in wp-config.php instead.', 'vibe-stall-generator' ); ?>
							</p>
						<?php endif; ?>
					</td>
				</tr>

				<tr>
					<th scope="row">
						<label for="vibe-stall-max-upload"><?php esc_html_e( 'Maximum upload size (MB)', 'vibe-stall-generator' ); ?></label>
					</th>
					<td>
						<input
							type="number"
							id="vibe-stall-max-upload"
							name="<?php echo esc_attr( OPTION_MAX_UPLOAD ); ?>"
							value="<?php echo esc_attr( (string) $max_upload ); ?>"
							min="1"
							max="50"
							class="small-text"
						/>
						<p class="description">
							<?php
							printf(
								/* translators: %s: server upload limit */
								esc_html__( 'Server limit: %s', 'vibe-stall-generator' ),
								esc_html( size_format( (float) wp_max_upload_size() ) )
							);
							?>
						</p>
					</td>
				</tr>

				<tr>
					<th scope="row">
						<label for="vibe-stall-rate-limit"><?php esc_html_e( 'Uploads per hour, per visitor', 'vibe-stall-generator' ); ?></label>
					</th>
					<td>
						<input
							type="number"
							id="vibe-stall-rate-limit"
							name="<?php echo esc_attr( OPTION_RATE_LIMIT ); ?>"
							value="<?php echo esc_attr( (string) $rate_limit ); ?>"
							min="0"
							max="1000"
							class="small-text"
						/>
						<p class="description"><?php esc_html_e( '0 disables rate limiting. Each removal consumes a remove.bg credit.', 'vibe-stall-generator' ); ?></p>
					</td>
				</tr>
			</table>

			<?php submit_button(); ?>
		</form>
	</div>
	<?php
}
