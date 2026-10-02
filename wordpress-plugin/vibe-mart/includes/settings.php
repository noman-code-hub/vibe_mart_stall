<?php
/**
 * Admin settings for remove.bg and upload limits.
 *
 * @package VibeMartPlugin
 */

declare(strict_types=1);

namespace VibeMart\Plugin;

if (! defined('ABSPATH')) {
	exit;
}

const OPTION_API_KEY = 'vibe_mart_api_key';
const OPTION_MAX_UPLOAD = 'vibe_mart_max_upload_mb';
const OPTION_RATE_LIMIT = 'vibe_mart_rate_limit';
const OPTION_GROUP = 'vibe_mart_settings';

/** admin-post action + transient used by the "Test key" button. */
const ACTION_TEST_KEY = 'vibe_mart_test_api_key';
const ACTION_RESEQUENCE_PITCHES = 'vibe_mart_resequence_pitches';
const TRANSIENT_TEST_RESULT = 'vibe_mart_api_key_test';
const TRANSIENT_PITCH_RESULT = 'vibe_mart_pitch_resequence';
const ACCOUNT_ENDPOINT = 'https://api.remove.bg/v1.0/account';

function get_api_key(): string {
	if (defined('VIBE_MART_REMOVE_BG_API_KEY') && '' !== (string) VIBE_MART_REMOVE_BG_API_KEY) {
		return trim((string) VIBE_MART_REMOVE_BG_API_KEY);
	}
	return trim((string) get_option(OPTION_API_KEY, ''));
}

/** True when the saved key is a Poof.bg (proof.bg) `pk_…` key. */
function is_poof_bg_key(string $key = ''): bool {
	$key = '' !== $key ? $key : get_api_key();
	return (bool) preg_match('/^pk_/i', trim($key));
}

function get_max_upload_bytes(): int {
	$configured = max(1, min(50, (int) get_option(OPTION_MAX_UPLOAD, 10))) * MB_IN_BYTES;
	$server_max = (int) wp_max_upload_size();
	if ($server_max > 0) {
		$configured = min($configured, $server_max);
	}
	return (int) apply_filters('vibe_mart_max_upload_bytes', $configured);
}

function get_rate_limit(): int {
	return (int) apply_filters('vibe_mart_rate_limit', max(0, (int) get_option(OPTION_RATE_LIMIT, 20)));
}

add_action(
	'admin_init',
	static function (): void {
		register_setting(OPTION_GROUP, OPTION_API_KEY, array(
			'type' => 'string',
			'sanitize_callback' => static function ($value): string {
				$value = sanitize_text_field((string) $value);
				return '' === trim($value) ? (string) get_option(OPTION_API_KEY, '') : trim($value);
			},
			'show_in_rest' => false,
		));
		register_setting(OPTION_GROUP, OPTION_MAX_UPLOAD, array(
			'type' => 'integer',
			'sanitize_callback' => static fn($v): int => max(1, min(50, (int) $v)),
			'show_in_rest' => false,
		));
		register_setting(OPTION_GROUP, OPTION_RATE_LIMIT, array(
			'type' => 'integer',
			'sanitize_callback' => static fn($v): int => max(0, min(1000, (int) $v)),
			'show_in_rest' => false,
		));
	}
);

/**
 * Describe the stored key without revealing it.
 *
 * The key field always renders blank, so an admin otherwise has no way to tell
 * "I typed a key and saved" apart from "a key is actually stored". Reporting the
 * source, length and last four characters makes that state visible.
 *
 * @return array{set:bool,source:string,length:int,tail:string}
 */
function api_key_status(): array {
	$from_constant = defined('VIBE_MART_REMOVE_BG_API_KEY')
		&& '' !== trim((string) VIBE_MART_REMOVE_BG_API_KEY);
	$from_option = '' !== trim((string) get_option(OPTION_API_KEY, ''));
	$key = get_api_key();

	$source = '';
	if ($from_constant) {
		$source = 'wp-config.php';
	} elseif ($from_option) {
		$source = 'database';
	}

	return array(
		'set' => '' !== $key,
		'source' => $source,
		'length' => strlen($key),
		'tail' => '' !== $key ? substr($key, -4) : '',
	);
}

/**
 * Ask remove.bg whether the stored key works, and how many credits remain.
 *
 * @return array{ok:bool,message:string}
 */
function test_api_key(): array {
	$key = get_api_key();

	if ('' === $key) {
		return array(
			'ok' => false,
			'message' => __('No API key is saved, so there is nothing to test. Paste your key above and press Save Changes first.', 'vibe-mart'),
		);
	}

	// Poof.bg keys: confirm the remove endpoint accepts the key with a tiny probe.
	if (function_exists(__NAMESPACE__ . '\\is_poof_bg_key') && is_poof_bg_key($key)) {
		$boundary = wp_generate_password(16, false);
		// 1x1 transparent PNG
		$png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', true);
		if (false === $png) {
			return array(
				'ok' => false,
				'message' => __('Could not build a test image for Poof.bg.', 'vibe-mart'),
			);
		}
		$body = '';
		$eol = "\r\n";
		$body .= '--' . $boundary . $eol;
		$body .= 'Content-Disposition: form-data; name="format"' . $eol . $eol . 'png' . $eol;
		$body .= '--' . $boundary . $eol;
		$body .= 'Content-Disposition: form-data; name="image_file"; filename="probe.png"' . $eol;
		$body .= 'Content-Type: image/png' . $eol . $eol;
		$body .= $png . $eol;
		$body .= '--' . $boundary . '--' . $eol;

		$response = wp_remote_post(
			'https://api.poof.bg/v1/remove',
			array(
				'timeout' => 30,
				'headers' => array(
					'x-api-key' => $key,
					'Content-Type' => 'multipart/form-data; boundary=' . $boundary,
					'Accept' => 'image/png, application/json',
				),
				'body' => $body,
			)
		);

		if (is_wp_error($response)) {
			return array(
				'ok' => false,
				/* translators: %s: error detail */
				'message' => sprintf(__('Could not reach Poof.bg: %s', 'vibe-mart'), $response->get_error_message()),
			);
		}

		$status = (int) wp_remote_retrieve_response_code($response);
		if (401 === $status || 403 === $status) {
			return array(
				'ok' => false,
				'message' => __('Poof.bg rejected this key. Check for a typo, then save it again.', 'vibe-mart'),
			);
		}
		if ($status >= 200 && $status < 300) {
			return array(
				'ok' => true,
				'message' => __('Poof.bg key works.', 'vibe-mart'),
			);
		}
		return array(
			'ok' => false,
			/* translators: %d: HTTP status */
			'message' => sprintf(__('Poof.bg replied with status %d. Try again shortly.', 'vibe-mart'), $status),
		);
	}

	$response = wp_remote_get(
		ACCOUNT_ENDPOINT,
		array(
			'timeout' => 20,
			'headers' => array(
				'X-Api-Key' => $key,
				'Accept' => 'application/json',
			),
		)
	);

	if (is_wp_error($response)) {
		return array(
			'ok' => false,
			/* translators: %s: error detail from the HTTP request. */
			'message' => sprintf(__('Could not reach remove.bg: %s', 'vibe-mart'), $response->get_error_message()),
		);
	}

	$status = (int) wp_remote_retrieve_response_code($response);
	$body = json_decode((string) wp_remote_retrieve_body($response), true);

	if (401 === $status || 403 === $status) {
		return array(
			'ok' => false,
			'message' => __('remove.bg rejected this key. Check for a stray space or a mistyped character, then save it again.', 'vibe-mart'),
		);
	}

	if (200 !== $status) {
		return array(
			'ok' => false,
			/* translators: %d: HTTP status code. */
			'message' => sprintf(__('remove.bg replied with an unexpected status (%d). Try again shortly.', 'vibe-mart'), $status),
		);
	}

	$credits = $body['data']['attributes']['credits']['total'] ?? null;
	$free = $body['data']['attributes']['api']['free_calls'] ?? null;

	$detail = array();
	if (null !== $credits) {
		/* translators: %s: number of paid credits. */
		$detail[] = sprintf(__('%s credits', 'vibe-mart'), number_format_i18n((float) $credits));
	}
	if (null !== $free) {
		/* translators: %s: number of free API calls left this month. */
		$detail[] = sprintf(__('%s free calls left this month', 'vibe-mart'), number_format_i18n((float) $free));
	}

	return array(
		'ok' => true,
		'message' => __('Key works.', 'vibe-mart') . ( $detail ? ' ' . implode(', ', $detail) . '.' : '' ),
	);
}

add_action(
	'admin_post_' . ACTION_TEST_KEY,
	static function (): void {
		if (! current_user_can_manage_marketplace()) {
			wp_die(esc_html__('You are not allowed to do that.', 'vibe-mart'), '', array('response' => 403));
		}
		check_admin_referer(ACTION_TEST_KEY);

		set_transient(TRANSIENT_TEST_RESULT, test_api_key(), MINUTE_IN_SECONDS);

		wp_safe_redirect(admin_url('admin.php?page=vibe-mart-settings'));
		exit;
	}
);

add_action(
	'admin_post_' . ACTION_RESEQUENCE_PITCHES,
	static function (): void {
		if (! current_user_can_manage_marketplace()) {
			wp_die(esc_html__('You are not allowed to do that.', 'vibe-mart'), '', array('response' => 403));
		}
		check_admin_referer(ACTION_RESEQUENCE_PITCHES);

		$result = resequence_all_pitch_numbers();
		set_transient(
			TRANSIENT_PITCH_RESULT,
			array(
				'ok' => true,
				'message' => sprintf(
					/* translators: 1: trader count, 2: next pitch code like VM2026C */
					__('Pitch numbers reset for %1$d traders (VM2026A, VM2026B, …). Next new trader gets %2$s.', 'vibe-mart'),
					(int) $result['traders'],
					(string) $result['next']
				),
			),
			MINUTE_IN_SECONDS
		);

		wp_safe_redirect(admin_url('admin.php?page=vibe-mart-settings'));
		exit;
	}
);

function render_settings_page(): void {
	if (! current_user_can_manage_marketplace()) {
		return;
	}
	$status = api_key_status();
	$has_key = $status['set'];

	$test = get_transient(TRANSIENT_TEST_RESULT);
	if (is_array($test)) {
		delete_transient(TRANSIENT_TEST_RESULT);
	}

	$pitch_notice = get_transient(TRANSIENT_PITCH_RESULT);
	if (is_array($pitch_notice)) {
		delete_transient(TRANSIENT_PITCH_RESULT);
	}

	$assigned = max_assigned_pitch_index();
	$next_pitch = format_pitch_number($assigned + 1);
	?>
	<div class="wrap">
		<h1><?php esc_html_e('Vibe Mart Settings', 'vibe-mart'); ?></h1>
		<?php if (is_array($test)) : ?>
			<div class="notice notice-<?php echo empty($test['ok']) ? 'error' : 'success'; ?> is-dismissible">
				<p><?php echo esc_html((string) ( $test['message'] ?? '' )); ?></p>
			</div>
		<?php endif; ?>
		<?php if (is_array($pitch_notice)) : ?>
			<div class="notice notice-<?php echo empty($pitch_notice['ok']) ? 'error' : 'success'; ?> is-dismissible">
				<p><?php echo esc_html((string) ( $pitch_notice['message'] ?? '' )); ?></p>
			</div>
		<?php endif; ?>
		<p><?php esc_html_e('Backend settings for background removal and upload limits. Marketplace data is managed under Traders, Stalls, and Products.', 'vibe-mart'); ?></p>
		<form action="options.php" method="post">
			<?php settings_fields(OPTION_GROUP); ?>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="vibe-mart-api-key"><?php esc_html_e('Background removal API key', 'vibe-mart'); ?></label></th>
					<td>
						<input type="password" class="regular-text" id="vibe-mart-api-key" name="<?php echo esc_attr(OPTION_API_KEY); ?>" value="" autocomplete="new-password" placeholder="<?php echo $has_key ? esc_attr__('Saved — leave blank to keep', 'vibe-mart') : esc_attr__('Poof.bg pk_… or remove.bg key', 'vibe-mart'); ?>" />
						<p class="description">
							<?php esc_html_e('Paste a Poof.bg key (starts with pk_) or a remove.bg key. Stored server-side only.', 'vibe-mart'); ?>
							<br />
							<?php if ($has_key) : ?>
								<strong style="color:#008a20;">
									<?php
									printf(
										/* translators: 1: where the key is stored, 2: character count, 3: last four characters. */
										esc_html__('A key is saved (source: %1$s, %2$d characters, ending %3$s).', 'vibe-mart'),
										esc_html($status['source']),
										(int) $status['length'],
										esc_html($status['tail'])
									);
									?>
								</strong>
								<br />
								<?php esc_html_e('Leave the box blank to keep it. Type a new key to replace it.', 'vibe-mart'); ?>
							<?php else : ?>
								<strong style="color:#d63638;">
									<?php esc_html_e('No key is saved — background removal will fail with "not configured yet".', 'vibe-mart'); ?>
								</strong>
							<?php endif; ?>
						</p>
						<p class="description"><?php esc_html_e('Or define VIBE_MART_REMOVE_BG_API_KEY in wp-config.php, which overrides this field.', 'vibe-mart'); ?></p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="vibe-mart-max"><?php esc_html_e('Max upload (MB)', 'vibe-mart'); ?></label></th>
					<td><input type="number" min="1" max="50" class="small-text" id="vibe-mart-max" name="<?php echo esc_attr(OPTION_MAX_UPLOAD); ?>" value="<?php echo esc_attr((string) get_option(OPTION_MAX_UPLOAD, 10)); ?>" /></td>
				</tr>
				<tr>
					<th scope="row"><label for="vibe-mart-rate"><?php esc_html_e('Uploads / hour / visitor', 'vibe-mart'); ?></label></th>
					<td><input type="number" min="0" max="1000" class="small-text" id="vibe-mart-rate" name="<?php echo esc_attr(OPTION_RATE_LIMIT); ?>" value="<?php echo esc_attr((string) get_option(OPTION_RATE_LIMIT, 20)); ?>" /></td>
				</tr>
			</table>
			<?php submit_button(); ?>
		</form>

		<hr />
		<h2><?php esc_html_e('Check the connection', 'vibe-mart'); ?></h2>
		<p><?php esc_html_e('Asks remove.bg whether the saved key is accepted and how much quota is left. Uses no image credits.', 'vibe-mart'); ?></p>
		<form action="<?php echo esc_url(admin_url('admin-post.php')); ?>" method="post">
			<input type="hidden" name="action" value="<?php echo esc_attr(ACTION_TEST_KEY); ?>" />
			<?php wp_nonce_field(ACTION_TEST_KEY); ?>
			<?php submit_button(__('Test key', 'vibe-mart'), 'secondary', 'submit', false); ?>
		</form>

		<hr />
		<h2><?php esc_html_e('Pitch numbers', 'vibe-mart'); ?></h2>
		<p>
			<?php
			printf(
				/* translators: %s: next pitch code like VM2026A */
				esc_html__('Traders get one code each in order: VM2026A, VM2026B, VM2026C, …. Next new trader would get %s.', 'vibe-mart'),
				'<strong>' . esc_html($next_pitch) . '</strong>'
			);
			?>
		</p>
		<p class="description">
			<?php esc_html_e('If codes jumped ahead (for example VM2026AG) after testing, use the button below to renumber every trader from VM2026A again.', 'vibe-mart'); ?>
		</p>
		<form action="<?php echo esc_url(admin_url('admin-post.php')); ?>" method="post" onsubmit="return confirm('<?php echo esc_js(__('Reassign every trader VM2026A, VM2026B, VM2026C… in order? Existing stall pitch codes will update to match.', 'vibe-mart')); ?>');">
			<input type="hidden" name="action" value="<?php echo esc_attr(ACTION_RESEQUENCE_PITCHES); ?>" />
			<?php wp_nonce_field(ACTION_RESEQUENCE_PITCHES); ?>
			<?php submit_button(__('Reset pitch numbers to A, B, C…', 'vibe-mart'), 'secondary', 'submit', false); ?>
		</form>
	</div>
	<?php
}
