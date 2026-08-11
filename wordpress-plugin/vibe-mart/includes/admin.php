<?php
/**
 * WordPress admin: marketplace management screens.
 *
 * Menu: Vibe Mart → Dashboard, Traders, Stalls, Products, Settings
 * Capability: manage_options (filterable via vibe_mart_admin_capability).
 *
 * @package VibeMartPlugin
 */

declare(strict_types=1);

namespace VibeMart\Plugin;

if (! defined('ABSPATH')) {
	exit;
}

/**
 * Capability required for all marketplace admin screens and mutations.
 */
function admin_capability(): string {
	return (string) apply_filters('vibe_mart_admin_capability', 'manage_options');
}

function current_user_can_manage_marketplace(): bool {
	return current_user_can(admin_capability());
}

/**
 * Abort unless the current user may manage the marketplace.
 */
function require_marketplace_admin(): void {
	if (! current_user_can_manage_marketplace()) {
		wp_die(
			esc_html__('You do not have permission to manage Vibe Mart.', 'vibe-mart'),
			esc_html__('Forbidden', 'vibe-mart'),
			array('response' => 403)
		);
	}
}

add_action(
	'admin_menu',
	static function (): void {
		$cap = admin_capability();

		add_menu_page(
			__('Vibe Mart', 'vibe-mart'),
			__('Vibe Mart', 'vibe-mart'),
			$cap,
			'vibe-mart',
			__NAMESPACE__ . '\\render_admin_dashboard',
			'dashicons-store',
			58
		);

		add_submenu_page(
			'vibe-mart',
			__('Marketplace Dashboard', 'vibe-mart'),
			__('Dashboard', 'vibe-mart'),
			$cap,
			'vibe-mart',
			__NAMESPACE__ . '\\render_admin_dashboard'
		);

		add_submenu_page(
			'vibe-mart',
			__('Traders', 'vibe-mart'),
			__('Traders', 'vibe-mart'),
			$cap,
			'vibe-mart-traders',
			__NAMESPACE__ . '\\render_admin_traders'
		);

		add_submenu_page(
			'vibe-mart',
			__('Stalls', 'vibe-mart'),
			__('Stalls', 'vibe-mart'),
			$cap,
			'vibe-mart-stalls',
			__NAMESPACE__ . '\\render_admin_stalls'
		);

		add_submenu_page(
			'vibe-mart',
			__('Products', 'vibe-mart'),
			__('Products', 'vibe-mart'),
			$cap,
			'vibe-mart-products',
			__NAMESPACE__ . '\\render_admin_products'
		);

		add_submenu_page(
			'vibe-mart',
			__('Vibe Mart Settings', 'vibe-mart'),
			__('Settings', 'vibe-mart'),
			$cap,
			'vibe-mart-settings',
			__NAMESPACE__ . '\\render_settings_page'
		);
	},
	9
);

add_action(
	'admin_enqueue_scripts',
	static function (string $hook): void {
		if (! str_contains($hook, 'vibe-mart')) {
			return;
		}
		$css = '
			.vibe-mart-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin:16px 0 24px}
			.vibe-mart-stat{background:#fff;border:1px solid #c3c4c7;border-radius:4px;padding:16px}
			.vibe-mart-stat strong{display:block;font-size:1.6rem;line-height:1.2;margin-top:6px}
			.vibe-mart-table .column-actions{width:120px}
			.vibe-mart-badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600}
			.vibe-mart-badge--published{background:#edfaef;color:#007017}
			.vibe-mart-badge--draft{background:#f0f0f1;color:#50575e}
			.vibe-mart-truncate{max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
		';
		wp_register_style('vibe-mart-admin', false, array(), VERSION);
		wp_enqueue_style('vibe-mart-admin');
		wp_add_inline_style('vibe-mart-admin', $css);
	}
);

/**
 * @return array{traders:int,stalls:int,published:int,drafts:int,products:int,badges:int,stalls_7d:int,stalls_30d:int}
 */
function get_marketplace_statistics(): array {
	global $wpdb;

	$stalls = table('stalls');
	$products = table('products');
	$badges = table('badges');

	$trader_ids = get_trader_user_ids();

	$published = (int) $wpdb->get_var(
		$wpdb->prepare("SELECT COUNT(*) FROM {$stalls} WHERE status = %s", 'published')
	);
	$drafts = (int) $wpdb->get_var(
		$wpdb->prepare("SELECT COUNT(*) FROM {$stalls} WHERE status = %s", 'draft')
	);
	$total_stalls = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$stalls}"); // phpcs:ignore WordPress.DB.PreparedSQL
	$total_products = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$products}"); // phpcs:ignore WordPress.DB.PreparedSQL
	$total_badges = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$badges}"); // phpcs:ignore WordPress.DB.PreparedSQL

	$stalls_7d = (int) $wpdb->get_var(
		$wpdb->prepare(
			"SELECT COUNT(*) FROM {$stalls} WHERE created_at >= %s",
			gmdate('Y-m-d H:i:s', time() - WEEK_IN_SECONDS)
		)
	);
	$stalls_30d = (int) $wpdb->get_var(
		$wpdb->prepare(
			"SELECT COUNT(*) FROM {$stalls} WHERE created_at >= %s",
			gmdate('Y-m-d H:i:s', time() - MONTH_IN_SECONDS)
		)
	);

	return array(
		'traders' => count($trader_ids),
		'stalls' => $total_stalls,
		'published' => $published,
		'drafts' => $drafts,
		'products' => $total_products,
		'badges' => $total_badges,
		'stalls_7d' => $stalls_7d,
		'stalls_30d' => $stalls_30d,
	);
}

/**
 * Trader user IDs: vibe_trader role, vm_is_trader meta, or stall owners.
 *
 * @return list<int>
 */
function get_trader_user_ids(): array {
	global $wpdb;

	$ids = array();

	$role_query = new \WP_User_Query(
		array(
			'role' => 'vibe_trader',
			'fields' => 'ID',
			'number' => 500,
		)
	);
	foreach ((array) $role_query->get_results() as $uid) {
		$ids[] = (int) $uid;
	}

	$meta_ids = get_users(
		array(
			'meta_key' => 'vm_is_trader',
			'meta_value' => '1',
			'fields' => 'ID',
			'number' => 500,
		)
	);
	foreach ((array) $meta_ids as $uid) {
		$ids[] = (int) $uid;
	}

	$owner_ids = $wpdb->get_col('SELECT DISTINCT owner_id FROM ' . table('stalls')); // phpcs:ignore WordPress.DB.PreparedSQL
	foreach ((array) $owner_ids as $uid) {
		$ids[] = (int) $uid;
	}

	$ids = array_values(array_unique(array_filter($ids)));
	sort($ids);
	return $ids;
}

function render_admin_notices_from_query(): void {
	if (empty($_GET['vibe_mart_notice'])) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		return;
	}
	$notice = sanitize_key((string) wp_unslash($_GET['vibe_mart_notice'])); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$map = array(
		'stall_deleted' => array('success', __('Stall deleted.', 'vibe-mart')),
		'product_deleted' => array('success', __('Product deleted.', 'vibe-mart')),
		'error' => array('error', __('The action could not be completed.', 'vibe-mart')),
		'invalid' => array('error', __('Invalid request.', 'vibe-mart')),
	);
	if (! isset($map[ $notice ])) {
		return;
	}
	[$class, $message] = $map[ $notice ];
	printf(
		'<div class="notice notice-%1$s is-dismissible"><p>%2$s</p></div>',
		esc_attr($class),
		esc_html($message)
	);
}

function render_admin_dashboard(): void {
	require_marketplace_admin();
	$stats = get_marketplace_statistics();
	?>
	<div class="wrap">
		<h1><?php esc_html_e('Vibe Mart Dashboard', 'vibe-mart'); ?></h1>
		<p><?php esc_html_e('Marketplace overview. Manage traders, stalls, and products from the submenu.', 'vibe-mart'); ?></p>
		<?php render_admin_notices_from_query(); ?>

		<div class="vibe-mart-stats">
			<div class="vibe-mart-stat">
				<span><?php esc_html_e('Traders', 'vibe-mart'); ?></span>
				<strong><?php echo esc_html((string) $stats['traders']); ?></strong>
			</div>
			<div class="vibe-mart-stat">
				<span><?php esc_html_e('Stalls', 'vibe-mart'); ?></span>
				<strong><?php echo esc_html((string) $stats['stalls']); ?></strong>
			</div>
			<div class="vibe-mart-stat">
				<span><?php esc_html_e('Published', 'vibe-mart'); ?></span>
				<strong><?php echo esc_html((string) $stats['published']); ?></strong>
			</div>
			<div class="vibe-mart-stat">
				<span><?php esc_html_e('Drafts', 'vibe-mart'); ?></span>
				<strong><?php echo esc_html((string) $stats['drafts']); ?></strong>
			</div>
			<div class="vibe-mart-stat">
				<span><?php esc_html_e('Products', 'vibe-mart'); ?></span>
				<strong><?php echo esc_html((string) $stats['products']); ?></strong>
			</div>
			<div class="vibe-mart-stat">
				<span><?php esc_html_e('Trust badges', 'vibe-mart'); ?></span>
				<strong><?php echo esc_html((string) $stats['badges']); ?></strong>
			</div>
			<div class="vibe-mart-stat">
				<span><?php esc_html_e('Stalls (7 days)', 'vibe-mart'); ?></span>
				<strong><?php echo esc_html((string) $stats['stalls_7d']); ?></strong>
			</div>
			<div class="vibe-mart-stat">
				<span><?php esc_html_e('Stalls (30 days)', 'vibe-mart'); ?></span>
				<strong><?php echo esc_html((string) $stats['stalls_30d']); ?></strong>
			</div>
		</div>

		<p>
			<a class="button button-primary" href="<?php echo esc_url(admin_url('admin.php?page=vibe-mart-stalls')); ?>"><?php esc_html_e('Manage stalls', 'vibe-mart'); ?></a>
			<a class="button" href="<?php echo esc_url(admin_url('admin.php?page=vibe-mart-traders')); ?>"><?php esc_html_e('View traders', 'vibe-mart'); ?></a>
			<a class="button" href="<?php echo esc_url(admin_url('admin.php?page=vibe-mart-products')); ?>"><?php esc_html_e('View products', 'vibe-mart'); ?></a>
			<a class="button" href="<?php echo esc_url(admin_url('admin.php?page=vibe-mart-settings')); ?>"><?php esc_html_e('Settings', 'vibe-mart'); ?></a>
		</p>
	</div>
	<?php
}

function render_admin_traders(): void {
	require_marketplace_admin();
	global $wpdb;

	$ids = get_trader_user_ids();
	$stalls_table = table('stalls');
	?>
	<div class="wrap">
		<h1><?php esc_html_e('Traders', 'vibe-mart'); ?></h1>
		<?php render_admin_notices_from_query(); ?>
		<table class="wp-list-table widefat fixed striped vibe-mart-table">
			<thead>
				<tr>
					<th scope="col"><?php esc_html_e('ID', 'vibe-mart'); ?></th>
					<th scope="col"><?php esc_html_e('Username', 'vibe-mart'); ?></th>
					<th scope="col"><?php esc_html_e('Display name', 'vibe-mart'); ?></th>
					<th scope="col"><?php esc_html_e('Email', 'vibe-mart'); ?></th>
					<th scope="col"><?php esc_html_e('Business', 'vibe-mart'); ?></th>
					<th scope="col"><?php esc_html_e('Stalls', 'vibe-mart'); ?></th>
					<th scope="col"><?php esc_html_e('Role', 'vibe-mart'); ?></th>
				</tr>
			</thead>
			<tbody>
			<?php if (! $ids) : ?>
				<tr><td colspan="7"><?php esc_html_e('No traders found yet.', 'vibe-mart'); ?></td></tr>
			<?php else : ?>
				<?php foreach ($ids as $user_id) : ?>
					<?php
					$user = get_userdata($user_id);
					if (! $user) {
						continue;
					}
					$stall_count = (int) $wpdb->get_var(
						$wpdb->prepare("SELECT COUNT(*) FROM {$stalls_table} WHERE owner_id = %d", $user_id)
					);
					$business = (string) get_user_meta($user_id, 'vm_business_name', true);
					?>
					<tr>
						<td><?php echo esc_html((string) $user_id); ?></td>
						<td>
							<a href="<?php echo esc_url(get_edit_user_link($user_id)); ?>">
								<?php echo esc_html($user->user_login); ?>
							</a>
						</td>
						<td><?php echo esc_html($user->display_name); ?></td>
						<td><?php echo esc_html($user->user_email); ?></td>
						<td><?php echo esc_html($business ?: '—'); ?></td>
						<td><?php echo esc_html((string) $stall_count); ?></td>
						<td><?php echo esc_html(implode(', ', $user->roles)); ?></td>
					</tr>
				<?php endforeach; ?>
			<?php endif; ?>
			</tbody>
		</table>
	</div>
	<?php
}

function render_admin_stalls(): void {
	require_marketplace_admin();
	global $wpdb;

	$status_filter = isset($_GET['status']) ? sanitize_key((string) wp_unslash($_GET['status'])) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
	if ($status_filter && ! in_array($status_filter, array('draft', 'published'), true)) {
		$status_filter = '';
	}

	$table = table('stalls');
	if ('' !== $status_filter) {
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$table} WHERE status = %s ORDER BY updated_at DESC LIMIT 200",
				$status_filter
			)
		);
	} else {
		$rows = $wpdb->get_results("SELECT * FROM {$table} ORDER BY updated_at DESC LIMIT 200"); // phpcs:ignore WordPress.DB.PreparedSQL
	}
	?>
	<div class="wrap">
		<h1><?php esc_html_e('Stalls', 'vibe-mart'); ?></h1>
		<?php render_admin_notices_from_query(); ?>

		<ul class="subsubsub">
			<li>
				<a href="<?php echo esc_url(admin_url('admin.php?page=vibe-mart-stalls')); ?>" class="<?php echo '' === $status_filter ? 'current' : ''; ?>">
					<?php esc_html_e('All', 'vibe-mart'); ?>
				</a> |
			</li>
			<li>
				<a href="<?php echo esc_url(admin_url('admin.php?page=vibe-mart-stalls&status=published')); ?>" class="<?php echo 'published' === $status_filter ? 'current' : ''; ?>">
					<?php esc_html_e('Published', 'vibe-mart'); ?>
				</a> |
			</li>
			<li>
				<a href="<?php echo esc_url(admin_url('admin.php?page=vibe-mart-stalls&status=draft')); ?>" class="<?php echo 'draft' === $status_filter ? 'current' : ''; ?>">
					<?php esc_html_e('Drafts', 'vibe-mart'); ?>
				</a>
			</li>
		</ul>

		<table class="wp-list-table widefat fixed striped vibe-mart-table">
			<thead>
				<tr>
					<th scope="col"><?php esc_html_e('ID', 'vibe-mart'); ?></th>
					<th scope="col"><?php esc_html_e('Brand', 'vibe-mart'); ?></th>
					<th scope="col"><?php esc_html_e('Owner', 'vibe-mart'); ?></th>
					<th scope="col"><?php esc_html_e('Status', 'vibe-mart'); ?></th>
					<th scope="col"><?php esc_html_e('Products', 'vibe-mart'); ?></th>
					<th scope="col"><?php esc_html_e('Updated', 'vibe-mart'); ?></th>
					<th scope="col" class="column-actions"><?php esc_html_e('Actions', 'vibe-mart'); ?></th>
				</tr>
			</thead>
			<tbody>
			<?php if (! $rows) : ?>
				<tr><td colspan="7"><?php esc_html_e('No stalls found.', 'vibe-mart'); ?></td></tr>
			<?php else : ?>
				<?php foreach ($rows as $row) : ?>
					<?php
					$owner = get_userdata((int) $row->owner_id);
					$product_count = (int) $wpdb->get_var(
						$wpdb->prepare(
							'SELECT COUNT(*) FROM ' . table('products') . ' WHERE stall_id = %d',
							(int) $row->id
						)
					);
					$delete_url = wp_nonce_url(
						admin_url('admin-post.php?action=vibe_mart_delete_stall&stall_id=' . (int) $row->id),
						'vibe_mart_delete_stall_' . (int) $row->id
					);
					?>
					<tr>
						<td><?php echo esc_html((string) $row->id); ?></td>
						<td>
							<span class="vibe-mart-truncate" title="<?php echo esc_attr((string) $row->brand_name); ?>">
								<?php echo esc_html((string) $row->brand_name); ?>
							</span>
						</td>
						<td>
							<?php
							echo $owner
								? esc_html($owner->user_login . ' (#' . $owner->ID . ')')
								: esc_html('#' . (string) $row->owner_id);
							?>
						</td>
						<td>
							<span class="vibe-mart-badge vibe-mart-badge--<?php echo esc_attr((string) $row->status); ?>">
								<?php echo esc_html((string) $row->status); ?>
							</span>
						</td>
						<td>
							<a href="<?php echo esc_url(admin_url('admin.php?page=vibe-mart-products&stall_id=' . (int) $row->id)); ?>">
								<?php echo esc_html((string) $product_count); ?>
							</a>
						</td>
						<td><?php echo esc_html((string) $row->updated_at); ?></td>
						<td class="column-actions">
							<a class="button button-small button-link-delete" href="<?php echo esc_url($delete_url); ?>" onclick="return confirm('<?php echo esc_js(__('Delete this stall and all related products, badges, and pitch data?', 'vibe-mart')); ?>');">
								<?php esc_html_e('Delete', 'vibe-mart'); ?>
							</a>
						</td>
					</tr>
				<?php endforeach; ?>
			<?php endif; ?>
			</tbody>
		</table>
	</div>
	<?php
}

function render_admin_products(): void {
	require_marketplace_admin();
	global $wpdb;

	$stall_id = isset($_GET['stall_id']) ? absint($_GET['stall_id']) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$products_table = table('products');
	$stalls_table = table('stalls');

	if ($stall_id > 0) {
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT p.*, s.brand_name FROM {$products_table} p LEFT JOIN {$stalls_table} s ON s.id = p.stall_id WHERE p.stall_id = %d ORDER BY p.sort_order ASC, p.id ASC LIMIT 500",
				$stall_id
			)
		);
	} else {
		$rows = $wpdb->get_results(
			"SELECT p.*, s.brand_name FROM {$products_table} p LEFT JOIN {$stalls_table} s ON s.id = p.stall_id ORDER BY p.id DESC LIMIT 500" // phpcs:ignore WordPress.DB.PreparedSQL
		);
	}
	?>
	<div class="wrap">
		<h1><?php esc_html_e('Products', 'vibe-mart'); ?></h1>
		<?php render_admin_notices_from_query(); ?>
		<?php if ($stall_id > 0) : ?>
			<p>
				<a href="<?php echo esc_url(admin_url('admin.php?page=vibe-mart-products')); ?>">
					<?php esc_html_e('← All products', 'vibe-mart'); ?>
				</a>
				—
				<?php
				printf(
					/* translators: %d: stall id */
					esc_html__('Filtered by stall #%d', 'vibe-mart'),
					$stall_id
				);
				?>
			</p>
		<?php endif; ?>

		<table class="wp-list-table widefat fixed striped vibe-mart-table">
			<thead>
				<tr>
					<th scope="col"><?php esc_html_e('ID', 'vibe-mart'); ?></th>
					<th scope="col"><?php esc_html_e('Name', 'vibe-mart'); ?></th>
					<th scope="col"><?php esc_html_e('Stall', 'vibe-mart'); ?></th>
					<th scope="col"><?php esc_html_e('Condition', 'vibe-mart'); ?></th>
					<th scope="col"><?php esc_html_e('Price', 'vibe-mart'); ?></th>
					<th scope="col"><?php esc_html_e('Sort', 'vibe-mart'); ?></th>
					<th scope="col" class="column-actions"><?php esc_html_e('Actions', 'vibe-mart'); ?></th>
				</tr>
			</thead>
			<tbody>
			<?php if (! $rows) : ?>
				<tr><td colspan="7"><?php esc_html_e('No products found.', 'vibe-mart'); ?></td></tr>
			<?php else : ?>
				<?php foreach ($rows as $row) : ?>
					<?php
					$delete_url = wp_nonce_url(
						admin_url('admin-post.php?action=vibe_mart_delete_product&product_id=' . (int) $row->id),
						'vibe_mart_delete_product_' . (int) $row->id
					);
					?>
					<tr>
						<td><?php echo esc_html((string) $row->id); ?></td>
						<td>
							<span class="vibe-mart-truncate" title="<?php echo esc_attr((string) $row->name); ?>">
								<?php echo esc_html((string) $row->name); ?>
							</span>
						</td>
						<td>
							<a href="<?php echo esc_url(admin_url('admin.php?page=vibe-mart-stalls')); ?>">
								<?php echo esc_html(trim((string) ($row->brand_name ?: '')) ?: ('#' . (string) $row->stall_id)); ?>
							</a>
						</td>
						<td><?php echo esc_html((string) $row->condition_label); ?></td>
						<td><?php echo esc_html((string) $row->price); ?></td>
						<td><?php echo esc_html((string) $row->sort_order); ?></td>
						<td class="column-actions">
							<a class="button button-small button-link-delete" href="<?php echo esc_url($delete_url); ?>" onclick="return confirm('<?php echo esc_js(__('Delete this product?', 'vibe-mart')); ?>');">
								<?php esc_html_e('Delete', 'vibe-mart'); ?>
							</a>
						</td>
					</tr>
				<?php endforeach; ?>
			<?php endif; ?>
			</tbody>
		</table>
	</div>
	<?php
}

add_action(
	'admin_post_vibe_mart_delete_stall',
	static function (): void {
		require_marketplace_admin();

		$stall_id = isset($_GET['stall_id']) ? absint($_GET['stall_id']) : 0;
		if ($stall_id <= 0 || ! isset($_GET['_wpnonce']) || ! wp_verify_nonce(sanitize_text_field(wp_unslash((string) $_GET['_wpnonce'])), 'vibe_mart_delete_stall_' . $stall_id)) {
			wp_safe_redirect(admin_url('admin.php?page=vibe-mart-stalls&vibe_mart_notice=invalid'));
			exit;
		}

		$row = get_stall_row($stall_id);
		if (! $row) {
			wp_safe_redirect(admin_url('admin.php?page=vibe-mart-stalls&vibe_mart_notice=error'));
			exit;
		}

		$ok = delete_stall_cascade($stall_id);
		$notice = $ok ? 'stall_deleted' : 'error';
		wp_safe_redirect(admin_url('admin.php?page=vibe-mart-stalls&vibe_mart_notice=' . $notice));
		exit;
	}
);

add_action(
	'admin_post_vibe_mart_delete_product',
	static function (): void {
		require_marketplace_admin();
		global $wpdb;

		$product_id = isset($_GET['product_id']) ? absint($_GET['product_id']) : 0;
		if ($product_id <= 0 || ! isset($_GET['_wpnonce']) || ! wp_verify_nonce(sanitize_text_field(wp_unslash((string) $_GET['_wpnonce'])), 'vibe_mart_delete_product_' . $product_id)) {
			wp_safe_redirect(admin_url('admin.php?page=vibe-mart-products&vibe_mart_notice=invalid'));
			exit;
		}

		$deleted = $wpdb->delete(table('products'), array('id' => $product_id), array('%d'));
		$notice = false !== $deleted && $deleted > 0 ? 'product_deleted' : 'error';
		wp_safe_redirect(admin_url('admin.php?page=vibe-mart-products&vibe_mart_notice=' . $notice));
		exit;
	}
);
