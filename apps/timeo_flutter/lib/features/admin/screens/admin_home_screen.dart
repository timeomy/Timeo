import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/providers/tenant_provider.dart';
import '../../../core/theme/app_theme.dart';

class AdminHomeScreen extends ConsumerWidget {
  const AdminHomeScreen({super.key});

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final tenant = ref.watch(activeTenantProvider);
    final name = auth.memberName ?? 'Admin';
    final tenantName = tenant?.name ?? 'WS Fitness';

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.background,
        title: Text(
          tenantName,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: AppTheme.onSurface,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined,
                color: AppTheme.onSurfaceMuted),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Notifications coming soon')),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded,
                color: AppTheme.onSurfaceMuted),
            onPressed: () {
              ref.read(authProvider.notifier).signOut();
              context.go('/sign-in');
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Welcome header
            Text(
              '${_greeting()}, $name 👋',
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: AppTheme.onSurface,
              ),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: AppTheme.primary.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Text(
                'ADMIN',
                style: TextStyle(
                  color: AppTheme.primary,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1,
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Stats grid
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 1.5,
              children: const [
                _StatCard(
                    icon: Icons.person_rounded,
                    label: 'Total Members',
                    value: '--'),
                _StatCard(
                    icon: Icons.how_to_reg_rounded,
                    label: 'Active Today',
                    value: '--'),
                _StatCard(
                    icon: Icons.payments_rounded,
                    label: 'This Month',
                    value: 'RM --'),
                _StatCard(
                    icon: Icons.trending_up_rounded,
                    label: 'New This Week',
                    value: '--'),
              ],
            ),
            const SizedBox(height: 28),

            // Quick Actions
            const Text(
              'QUICK ACTIONS',
              style: TextStyle(
                color: AppTheme.onSurfaceMuted,
                fontSize: 12,
                fontWeight: FontWeight.w600,
                letterSpacing: 1,
              ),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _ActionChip(
                  emoji: '👥',
                  label: 'Members',
                  onTap: () => context.push('/admin-members'),
                ),
                _ActionChip(
                  emoji: '✅',
                  label: 'Check-ins',
                  onTap: () => context.push('/admin-checkins'),
                ),
                _ActionChip(
                  emoji: '📦',
                  label: 'Packages',
                  onTap: () => context.push('/plans'),
                ),
                _ActionChip(
                  emoji: '📊',
                  label: 'Reports',
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Coming soon')),
                    );
                  },
                ),
              ],
            ),
            const SizedBox(height: 28),

            // Recent check-ins
            const Text(
              'RECENT CHECK-INS',
              style: TextStyle(
                color: AppTheme.onSurfaceMuted,
                fontSize: 12,
                fontWeight: FontWeight.w600,
                letterSpacing: 1,
              ),
            ),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  Icon(Icons.fact_check_outlined,
                      color: AppTheme.onSurfaceMuted.withValues(alpha: 0.5),
                      size: 40),
                  const SizedBox(height: 8),
                  const Text(
                    'No check-ins today',
                    style: TextStyle(
                      color: AppTheme.onSurfaceMuted,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Icon(icon, color: AppTheme.primary, size: 22),
          const Spacer(),
          Text(
            value,
            style: const TextStyle(
              color: AppTheme.onSurface,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(
              color: AppTheme.onSurfaceMuted,
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionChip extends StatelessWidget {
  final String emoji;
  final String label;
  final VoidCallback onTap;

  const _ActionChip({
    required this.emoji,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: AppTheme.surfaceVariant,
            width: 1,
          ),
        ),
        child: Text(
          '$emoji  $label',
          style: const TextStyle(
            color: AppTheme.onSurface,
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }
}
