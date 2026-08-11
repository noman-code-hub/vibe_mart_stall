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

function get_api_key(): string {
	if (defined('VIBE_MART_REMOVE_BG_API_KEY') && '' !== (string) VIBE_MART_REMOVE_BG_API_KEY) {
		return trim((string) VIBE_MART_REMOVE_BG_API_KEY);
	}
	return trim((string) get_option(OPTION_API_KEY, ''));
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

function render_settings_page(): void {
	if (! current_user_can_manage_marketplace()) {
		return;
	}
	$has_key = '' !== get_api_key();
	?>
	<div class="wrap">
		<h1><?php esc_html_e('Vibe Mart Settings', 'vibe-mart'); ?></h1>
		<p><?php esc_html_e('Backend settings for background removal and upload limits. Marketplace data is managed under Traders, Stalls, and Products.', 'vibe-mart'); ?></p>
		<form action="options.php" method="post">
			<?php settings_fields(OPTION_GROUP); ?>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="vibe-mart-api-key"><?php esc_html_e('remove.bg API key', 'vibe-mart'); ?></label></th>
					<td>
						<input type="password" class="regular-text" id="vibe-mart-api-key" name="<?php echo esc_attr(OPTION_API_KEY); ?>" value="" autocomplete="off" placeholder="<?php echo $has_key ? esc_attr__('Saved — leave blank to keep', 'vibe-mart') : ''; ?>" />
						<p class="description"><?php esc_html_e('Or define VIBE_MART_REMOVE_BG_API_KEY in wp-config.php.', 'vibe-mart'); ?></p>
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
	</div>
	<?php
}
