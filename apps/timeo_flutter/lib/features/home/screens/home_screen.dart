import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/providers/tenant_provider.dart';
import '../../../core/providers/membership_provider.dart';
import '../../../core/providers/stats_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/tenant_switcher.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final memberName = authState.memberName ?? 'Member';
    final activeTenant = ref.watch(activeTenantProvider);
    final tenantId = activeTenant?.id;

    // Fetch real membership + stats data when tenant is available
    final membershipAsync = tenantId != null
        ? ref.watch(membershipProvider(tenantId))
        : const AsyncValue<MembershipData?>.data(null);
    final statsAsync = tenantId != null
        ? ref.watch(statsProvider(tenantId))
        : const AsyncValue<UserStats?>.data(null);

    final membershipActive = membershipAsync.whenOrNull(
          data: (m) => m?.isActive ?? false,
        ) ??
        false;

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Header row ──
              Row(
                children: [
                  // Left: tenant logo + name
                  const TenantSwitcherHeader(),
                  // Center: portal title
                  Expanded(
                    child: Center(
                      child: Text(
                        _portalTitle(authState.role),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.3,
                        ),
                      ),
                    ),
                  ),
                  // Right: notification bell
                  IconButton(
                    onPressed: () {},
                    icon: const Icon(Icons.notifications_outlined,
                        color: Colors.white, size: 24),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // ── Status banner ──
              membershipAsync.when(
                loading: () => Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: AppTheme.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.surfaceVariant),
                  ),
                  child: const Row(
                    children: [
                      SizedBox(
                        width: 16, height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                      SizedBox(width: 10),
                      Text(
                        'Checking membership…',
                        style: TextStyle(color: AppTheme.onSurfaceMuted, fontSize: 14),
                      ),
                    ],
                  ),
                ),
                error: (_, __) => const SizedBox.shrink(),
                data: (membership) {
                  final isActive = membership?.isActive ?? false;
                  final planName = membership?.planName;
                  final label = membership == null
                      ? 'No Active Membership'
                      : isActive
                          ? 'Membership Active${planName != null ? ' · $planName' : ''}'
                          : 'Membership Expired';
                  return GestureDetector(
                    onTap: isActive ? null : () => context.push('/plans'),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: isActive
                              ? [
                                  const Color(0xFF22C55E).withValues(alpha: 0.15),
                                  const Color(0xFF0066FF).withValues(alpha: 0.10),
                                ]
                              : [
                                  AppTheme.warning.withValues(alpha: 0.15),
                                  AppTheme.warning.withValues(alpha: 0.05),
                                ],
                        ),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isActive
                              ? const Color(0xFF22C55E).withValues(alpha: 0.3)
                              : AppTheme.warning.withValues(alpha: 0.3),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            isActive ? Icons.verified_rounded : Icons.warning_amber_rounded,
                            color: isActive ? const Color(0xFF22C55E) : AppTheme.warning,
                            size: 20,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              label,
                              style: TextStyle(
                                color: isActive ? const Color(0xFF22C55E) : AppTheme.warning,
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                              ),
                            ),
                          ),
                          if (!isActive)
                            const Icon(Icons.chevron_right_rounded,
                                color: AppTheme.warning, size: 18),
                        ],
                      ),
                    ),
                  );
                },
              ),

              const SizedBox(height: 20),

              // ── Welcome ──
              Text(
                'Welcome back,',
                style: TextStyle(
                  fontSize: 14,
                  color: AppTheme.onSurfaceMuted,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                memberName.toUpperCase(),
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                  letterSpacing: 0.5,
                ),
              ),

              const SizedBox(height: 20),

              // ── Stats cards (2 cols) ──
              statsAsync.when(
                loading: () => Row(
                  children: [
                    Expanded(
                      child: _StatCard(
                        label: 'Visits This Month',
                        value: '—',
                        icon: Icons.directions_walk_rounded,
                        valueColor: AppTheme.primary,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _StatCard(
                        label: 'Visits This Week',
                        value: '—',
                        icon: Icons.local_fire_department_rounded,
                        valueColor: AppTheme.warning,
                      ),
                    ),
                  ],
                ),
                error: (_, __) => Row(
                  children: [
                    Expanded(
                      child: _StatCard(
                        label: 'Visits This Month',
                        value: '—',
                        icon: Icons.directions_walk_rounded,
                        valueColor: AppTheme.primary,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _StatCard(
                        label: 'Visits This Week',
                        value: '—',
                        icon: Icons.local_fire_department_rounded,
                        valueColor: AppTheme.warning,
                      ),
                    ),
                  ],
                ),
                data: (stats) => Row(
                  children: [
                    Expanded(
                      child: _StatCard(
                        label: 'Visits This Month',
                        value: stats?.visitsThisMonth.toString() ?? '—',
                        icon: Icons.directions_walk_rounded,
                        valueColor: AppTheme.primary,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _StatCard(
                        label: 'Visits This Week',
                        value: stats?.visitsThisWeek.toString() ?? '—',
                        icon: Icons.local_fire_department_rounded,
                        valueColor: AppTheme.warning,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 28),

              // ── Coach Notes ──
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'COACH NOTES',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.onSurfaceMuted,
                      letterSpacing: 1.0,
                    ),
                  ),
                  TextButton(
                    onPressed: () {},
                    child: const Text(
                      'View All',
                      style: TextStyle(
                        color: AppTheme.primary,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              _CoachNoteItem(
                note:
                    'Great progress on deadlifts! Increase weight next session.',
                date: 'Mar 10',
                coach: 'Coach Mike',
              ),
              const SizedBox(height: 8),
              _CoachNoteItem(
                note: 'Focus on hip mobility before squats.',
                date: 'Mar 8',
                coach: 'Coach Sarah',
              ),

              const SizedBox(height: 28),

              // ── Recent Sessions ──
              const Text(
                'RECENT SESSIONS',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.onSurfaceMuted,
                  letterSpacing: 1.0,
                ),
              ),
              const SizedBox(height: 12),
              _SessionItem(
                title: 'Upper Body Strength',
                subtitle: 'Coach Mike • 45 min',
                date: 'Mar 11',
              ),
              const SizedBox(height: 8),
              _SessionItem(
                title: 'HIIT Circuit',
                subtitle: 'Coach Sarah • 30 min',
                date: 'Mar 9',
              ),

              // Bottom padding for FAB clearance
              const SizedBox(height: 80),
            ],
          ),
        ),
      ),
    );
  }
}

String _portalTitle(String? role) {
  switch (role) {
    case 'admin':
    case 'staff':
      return 'Staff Portal';
    default:
      return 'Member Portal';
  }
}

// ── Stat Card ──
class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final String? suffix;
  final IconData icon;
  final Color valueColor;

  const _StatCard({
    required this.label,
    required this.value,
    this.suffix,
    required this.icon,
    required this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.surfaceVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: valueColor.withValues(alpha: 0.7), size: 20),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                value,
                style: TextStyle(
                  fontSize: 36,
                  fontWeight: FontWeight.w900,
                  color: valueColor,
                  height: 1.0,
                ),
              ),
              if (suffix != null) ...[
                const SizedBox(width: 4),
                Text(
                  suffix!,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: valueColor.withValues(alpha: 0.7),
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: const TextStyle(
              color: AppTheme.onSurfaceMuted,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Coach Note Item ──
class _CoachNoteItem extends StatelessWidget {
  final String note;
  final String date;
  final String coach;

  const _CoachNoteItem({
    required this.note,
    required this.date,
    required this.coach,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.surfaceVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            note,
            style: const TextStyle(color: Colors.white, fontSize: 14),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                coach,
                style: const TextStyle(
                  color: AppTheme.primary,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
              Text(
                date,
                style: const TextStyle(
                  color: AppTheme.onSurfaceMuted,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Session Item ──
class _SessionItem extends StatelessWidget {
  final String title;
  final String subtitle;
  final String date;

  const _SessionItem({
    required this.title,
    required this.subtitle,
    required this.date,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.surfaceVariant),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppTheme.primary.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.fitness_center_rounded,
                color: AppTheme.primary, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(
                    color: AppTheme.onSurfaceMuted,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          Text(
            date,
            style: const TextStyle(
              color: AppTheme.onSurfaceMuted,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}
