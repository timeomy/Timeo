import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/models/public_tenant.dart';
import '../../../core/providers/public_tenants_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/shimmer.dart';
import '../../../core/utils/haptics.dart';

class StoreDetailScreen extends ConsumerWidget {
  final String slug;
  const StoreDetailScreen({super.key, required this.slug});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tenantAsync = ref.watch(publicTenantBySlugProvider(slug));

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: tenantAsync.when(
        loading: () => _StoreDetailShimmer(slug: slug),
        error: (err, _) => _ErrorView(
          onRetry: () => ref.invalidate(publicTenantBySlugProvider(slug)),
        ),
        data: (tenant) {
          if (tenant == null) {
            return const _ErrorView(message: 'Business not found');
          }
          return _StoreDetailBody(tenant: tenant);
        },
      ),
    );
  }
}

// ──────────────────────────────────────────────────
// SHIMMER SKELETON
// ──────────────────────────────────────────────────

class _StoreDetailShimmer extends StatelessWidget {
  final String slug;
  const _StoreDetailShimmer({required this.slug});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Back button row
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 8, 8, 0),
            child: Row(
              children: [
                IconButton(
                  onPressed: () {
                    if (context.canPop()) context.pop();
                  },
                  icon: const Icon(Icons.arrow_back_rounded,
                      color: Colors.white),
                ),
              ],
            ),
          ),
          // Header shimmer
          const ShimmerBox(
            height: 180,
            borderRadius: BorderRadius.zero,
          ),
          const SizedBox(height: 20),
          // Name shimmer
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 24),
            child: ShimmerBox(height: 28, width: 200),
          ),
          const SizedBox(height: 12),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 24),
            child: ShimmerBox(height: 20, width: 80),
          ),
          const SizedBox(height: 20),
          // Action buttons shimmer
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 24),
            child: ShimmerBox(height: 44),
          ),
          const SizedBox(height: 24),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 24),
            child: ShimmerList(count: 3, itemHeight: 72, spacing: 10),
          ),
        ],
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;

  const _ErrorView({
    this.message = 'Could not load business',
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: IconButton(
              onPressed: () => context.pop(),
              icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
            ),
          ),
          Expanded(
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.storefront_rounded,
                      color: AppTheme.onSurfaceMuted, size: 48),
                  const SizedBox(height: 12),
                  Text(
                    message,
                    style: TextStyle(
                        color: AppTheme.onSurfaceMuted, fontSize: 15),
                  ),
                  if (onRetry != null) ...[
                    const SizedBox(height: 16),
                    TextButton(
                      onPressed: onRetry,
                      child: const Text('Retry'),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StoreDetailBody extends StatelessWidget {
  final PublicTenant tenant;
  const _StoreDetailBody({required this.tenant});

  @override
  Widget build(BuildContext context) {
    Color accentColor = AppTheme.primary;
    try {
      final hex = tenant.primaryColor.replaceFirst('#', '');
      accentColor = Color(int.parse('FF$hex', radix: 16));
    } catch (_) {}

    return CustomScrollView(
      slivers: [
        // App bar
        SliverAppBar(
          backgroundColor: AppTheme.background,
          leading: IconButton(
            onPressed: () => context.pop(),
            icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
          ),
          expandedHeight: 200,
          pinned: true,
          flexibleSpace: FlexibleSpaceBar(
            background: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    accentColor.withOpacity(0.3),
                    AppTheme.background,
                  ],
                ),
              ),
              child: Center(
                child: _LargeAvatar(tenant: tenant, color: accentColor),
              ),
            ),
          ),
        ),

        // Content
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Name
                Text(
                  tenant.name,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 26,
                    fontWeight: FontWeight.w800,
                  ),
                ),

                const SizedBox(height: 8),

                // Industry tag
                if (tenant.industry != null)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: accentColor.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      tenant.industry!.substring(0, 1).toUpperCase() +
                          tenant.industry!.substring(1),
                      style: TextStyle(
                        color: accentColor,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),

                const SizedBox(height: 16),

                // Description
                if (tenant.description != null &&
                    tenant.description!.isNotEmpty) ...[
                  Text(
                    tenant.description!,
                    style: TextStyle(
                      color: AppTheme.onSurfaceMuted,
                      fontSize: 14,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 20),
                ],

                // Address
                if (tenant.address != null &&
                    tenant.address!.isNotEmpty) ...[
                  _InfoRow(
                    icon: Icons.location_on_rounded,
                    text: tenant.address!,
                  ),
                  const SizedBox(height: 10),
                ],

                // Hours
                if (tenant.hours != null && tenant.hours!.isNotEmpty) ...[
                  _InfoRow(
                    icon: Icons.schedule_rounded,
                    text: tenant.hours!,
                  ),
                  const SizedBox(height: 10),
                ],

                const SizedBox(height: 24),

                // ── Action buttons row ──
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Haptics.medium();
                          context.go('/sign-up?join=${tenant.slug ?? tenant.id}');
                        },
                        icon: const Icon(Icons.how_to_reg_rounded, size: 16),
                        label: const Text('Join Now'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: accentColor,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                          elevation: 0,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () {
                          Haptics.light();
                          context.push('/bookings');
                        },
                        icon: Icon(Icons.calendar_today_rounded,
                            size: 16, color: accentColor),
                        label: Text('Book',
                            style: TextStyle(color: accentColor)),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          side: BorderSide(color: accentColor),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    OutlinedButton(
                      onPressed: () => Haptics.light(),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(
                            vertical: 12, horizontal: 14),
                        side: BorderSide(
                            color: Colors.white.withValues(alpha: 0.2)),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      child: const Icon(Icons.share_rounded,
                          color: Colors.white, size: 18),
                    ),
                  ],
                ),

                const SizedBox(height: 28),

                // ── Services section ──
                const Text(
                  'Services',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                        color: AppTheme.surfaceVariant),
                  ),
                  child: const Text(
                    'Services available after joining',
                    style: TextStyle(
                      color: AppTheme.onSurfaceMuted,
                      fontSize: 13,
                    ),
                  ),
                ),

                const SizedBox(height: 24),

                // Plans section
                if (tenant.plans.isNotEmpty) ...[
                  const Text(
                    'Plans & Packages',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ...tenant.plans.map(
                    (plan) => _PlanCard(plan: plan, accentColor: accentColor),
                  ),
                  const SizedBox(height: 24),
                ],

                // Join button
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: () {
                      // Navigate to sign-up with returnTo for join flow
                      context.go('/sign-up?join=${tenant.slug ?? tenant.id}');
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: accentColor,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: const Text(
                      'Join This Business',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _LargeAvatar extends StatelessWidget {
  final PublicTenant tenant;
  final Color color;
  const _LargeAvatar({required this.tenant, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 80,
      height: 80,
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.3), width: 2),
      ),
      child: tenant.logoUrl != null
          ? ClipRRect(
              borderRadius: BorderRadius.circular(18),
              child: Image.network(
                tenant.logoUrl!,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Center(
                  child: Text(
                    tenant.name.isNotEmpty
                        ? tenant.name[0].toUpperCase()
                        : '?',
                    style: TextStyle(
                      color: color,
                      fontSize: 32,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            )
          : Center(
              child: Text(
                tenant.name.isNotEmpty ? tenant.name[0].toUpperCase() : '?',
                style: TextStyle(
                  color: color,
                  fontSize: 32,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String text;
  const _InfoRow({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: AppTheme.onSurfaceMuted, size: 18),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              color: AppTheme.onSurfaceMuted,
              fontSize: 13,
              height: 1.4,
            ),
          ),
        ),
      ],
    );
  }
}

class _PlanCard extends StatelessWidget {
  final PublicPlan plan;
  final Color accentColor;
  const _PlanCard({required this.plan, required this.accentColor});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF16162A),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  plan.name,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (plan.description != null &&
                    plan.description!.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    plan.description!,
                    style: TextStyle(
                      color: AppTheme.onSurfaceMuted,
                      fontSize: 12,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${plan.currency} ${plan.price.toStringAsFixed(plan.price == plan.price.roundToDouble() ? 0 : 2)}',
                style: TextStyle(
                  color: accentColor,
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
              if (plan.interval != null)
                Text(
                  '/${plan.interval}',
                  style: TextStyle(
                    color: AppTheme.onSurfaceMuted,
                    fontSize: 11,
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
