import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/providers/tenant_provider.dart';
import '../../../core/providers/membership_provider.dart';
import '../../../core/providers/stats_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/tenant_switcher.dart';
import '../../../core/widgets/shimmer.dart';
import '../../../core/utils/haptics.dart';
import '../../qr_code/screens/qr_screen.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final role = authState.role ?? 'customer';

    // Route to the correct home view based on role
    if (role == 'admin') {
      return const _AdminHomeView();
    } else if (role == 'staff' || role == 'coach') {
      return const _CoachHomeView();
    } else {
      return const _MemberHomeView();
    }
  }
}

// ─────────────────────────────────────────────────────────
// MEMBER HOME VIEW
// ─────────────────────────────────────────────────────────
class _MemberHomeView extends ConsumerWidget {
  const _MemberHomeView();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final memberName = authState.memberName ?? 'Member';
    final activeTenant = ref.watch(activeTenantProvider);
    final tenantId = activeTenant?.id;

    final membershipAsync = tenantId != null
        ? ref.watch(membershipProvider(tenantId))
        : const AsyncValue<MembershipData?>.data(null);
    final statsAsync = tenantId != null
        ? ref.watch(statsProvider(tenantId))
        : const AsyncValue<UserStats?>.data(null);

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            Haptics.medium();
            if (tenantId != null) {
              ref.invalidate(membershipProvider(tenantId!));
              ref.invalidate(statsProvider(tenantId!));
            }
            await Future.delayed(const Duration(milliseconds: 500));
          },
          color: AppTheme.primary,
          backgroundColor: AppTheme.surface,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ══════════════════════════════════════
                // PROFILE HEADER (Meituan "Me" style)
                // ══════════════════════════════════════
                Container(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        AppTheme.surface,
                        AppTheme.primary.withValues(alpha: 0.05),
                      ],
                    ),
                  ),
                  child: Column(
                    children: [
                      // Top row: tenant switcher + QR + notification bell
                      Row(
                        children: [
                          const TenantSwitcherHeader(),
                          const Spacer(),
                          // QR code button — shows member QR
                          GestureDetector(
                            onTap: () {
                              Haptics.light();
                              showModalBottomSheet(
                                context: context,
                                isScrollControlled: true,
                                backgroundColor: AppTheme.background,
                                shape: const RoundedRectangleBorder(
                                  borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                                ),
                                builder: (_) => SizedBox(
                                  height: MediaQuery.of(context).size.height * 0.85,
                                  child: const QrScreen(),
                                ),
                              );
                            },
                            child: Container(
                              width: 38,
                              height: 38,
                              margin: const EdgeInsets.only(right: 4),
                              decoration: BoxDecoration(
                                color: AppTheme.primary.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(
                                Icons.qr_code_rounded,
                                color: AppTheme.primary,
                                size: 22,
                              ),
                            ),
                          ),
                          IconButton(
                            onPressed: () {},
                            icon: const Icon(
                              Icons.notifications_outlined,
                              color: Colors.white,
                              size: 24,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      // Avatar + name + membership badge
                      Row(
                        children: [
                          Container(
                            width: 72,
                            height: 72,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: RadialGradient(
                                colors: [
                                  AppTheme.primary.withValues(alpha: 0.45),
                                  AppTheme.primary.withValues(alpha: 0.12),
                                ],
                              ),
                              border: Border.all(
                                color: AppTheme.primary.withValues(alpha: 0.5),
                                width: 2,
                              ),
                            ),
                            child: Center(
                              child: Text(
                                memberName.isNotEmpty
                                    ? memberName[0].toUpperCase()
                                    : 'M',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 28,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  memberName,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 20,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                membershipAsync.when(
                                  loading: () => const ShimmerBox(
                                    height: 24,
                                    width: 110,
                                    borderRadius:
                                        BorderRadius.all(Radius.circular(20)),
                                  ),
                                  error: (_, __) => const SizedBox.shrink(),
                                  data: (m) {
                                    final isActive = m?.isActive ?? false;
                                    return Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 10, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: isActive
                                            ? const Color(0xFF22C55E)
                                                .withValues(alpha: 0.15)
                                            : AppTheme.warning
                                                .withValues(alpha: 0.15),
                                        borderRadius:
                                            BorderRadius.circular(20),
                                        border: Border.all(
                                          color: isActive
                                              ? const Color(0xFF22C55E)
                                                  .withValues(alpha: 0.4)
                                              : AppTheme.warning
                                                  .withValues(alpha: 0.4),
                                        ),
                                      ),
                                      child: Text(
                                        m == null
                                            ? '○  No Membership'
                                            : isActive
                                                ? '●  Active Member'
                                                : '○  Expired',
                                        style: TextStyle(
                                          color: isActive
                                              ? const Color(0xFF22C55E)
                                              : AppTheme.warning,
                                          fontSize: 11,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    );
                                  },
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      // Stats row
                      statsAsync.when(
                        loading: () => const ShimmerStatRow(),
                        error: (_, __) => _buildStatsRow('—', '—'),
                        data: (stats) => _buildStatsRow(
                          stats?.visitsThisMonth.toString() ?? '—',
                          stats?.visitsThisWeek.toString() ?? '—',
                        ),
                      ),
                    ],
                  ),
                ),

                // ══════════════════════════════════════
                // QUICK ACCESS
                // ══════════════════════════════════════
                const _SectionDivider(),
                const _SectionHeader(title: 'Quick Access'),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                  child: _MeituanServiceGrid(
                    items: [
                      _ServiceItem(
                        icon: Icons.star_rounded,
                        label: 'Favorites',
                        color: const Color(0xFFF59E0B),
                        onTap: () => Haptics.light(),
                      ),
                      _ServiceItem(
                        icon: Icons.receipt_long_rounded,
                        label: 'History',
                        color: const Color(0xFF0066FF),
                        onTap: () {
                          Haptics.light();
                          context.push('/order-history');
                        },
                      ),
                      _ServiceItem(
                        icon: Icons.local_activity_rounded,
                        label: 'Vouchers',
                        color: const Color(0xFFEC4899),
                        onTap: () => Haptics.light(),
                      ),
                      _ServiceItem(
                        icon: Icons.monetization_on_rounded,
                        label: 'Points',
                        color: const Color(0xFF22C55E),
                        onTap: () => Haptics.light(),
                      ),
                    ],
                  ),
                ),

                // ══════════════════════════════════════
                // MY ACTIVITY
                // ══════════════════════════════════════
                const _SectionDivider(),
                const _SectionHeader(title: 'My Activity'),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                  child: _MeituanServiceGrid(
                    items: [
                      _ServiceItem(
                        icon: Icons.calendar_today_rounded,
                        label: 'Bookings',
                        color: const Color(0xFF0066FF),
                        onTap: () {
                          Haptics.light();
                          context.push('/bookings');
                        },
                      ),
                      _ServiceItem(
                        icon: Icons.fitness_center_rounded,
                        label: 'Check-ins',
                        color: const Color(0xFF8B5CF6),
                        onTap: () {
                          Haptics.light();
                          context.push('/bookings');
                        },
                      ),
                      _ServiceItem(
                        icon: Icons.rate_review_rounded,
                        label: 'Reviews',
                        color: const Color(0xFFF97316),
                        onTap: () => Haptics.light(),
                      ),
                      _ServiceItem(
                        icon: Icons.payment_rounded,
                        label: 'Payments',
                        color: const Color(0xFF22C55E),
                        onTap: () {
                          Haptics.light();
                          context.go('/membership');
                        },
                      ),
                    ],
                  ),
                ),

                // ══════════════════════════════════════
                // MEMBERSHIP CARD
                // ══════════════════════════════════════
                const _SectionDivider(),
                const _SectionHeader(title: 'Membership'),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                  child: membershipAsync.when(
                    loading: () => const ShimmerBox(
                      height: 86,
                      borderRadius:
                          BorderRadius.all(Radius.circular(14)),
                    ),
                    error: (_, __) => const SizedBox.shrink(),
                    data: (membership) {
                      final isActive = membership?.isActive ?? false;
                      final planName = membership?.planName;
                      return GestureDetector(
                        onTap: () {
                          Haptics.light();
                          context.go('/membership');
                        },
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: isActive
                                  ? [
                                      const Color(0xFF22C55E)
                                          .withValues(alpha: 0.15),
                                      const Color(0xFF0066FF)
                                          .withValues(alpha: 0.10),
                                    ]
                                  : [
                                      AppTheme.warning
                                          .withValues(alpha: 0.15),
                                      AppTheme.warning
                                          .withValues(alpha: 0.05),
                                    ],
                            ),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: isActive
                                  ? const Color(0xFF22C55E)
                                      .withValues(alpha: 0.3)
                                  : AppTheme.warning
                                      .withValues(alpha: 0.3),
                            ),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: isActive
                                      ? const Color(0xFF22C55E)
                                          .withValues(alpha: 0.2)
                                      : AppTheme.warning
                                          .withValues(alpha: 0.2),
                                ),
                                child: Icon(
                                  isActive
                                      ? Icons.verified_rounded
                                      : Icons.warning_amber_rounded,
                                  color: isActive
                                      ? const Color(0xFF22C55E)
                                      : AppTheme.warning,
                                  size: 22,
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      isActive
                                          ? (planName ?? 'Active Membership')
                                          : 'No Active Membership',
                                      style: TextStyle(
                                        color: isActive
                                            ? const Color(0xFF22C55E)
                                            : AppTheme.warning,
                                        fontWeight: FontWeight.w700,
                                        fontSize: 15,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      isActive
                                          ? 'Tap to manage your plan'
                                          : 'Tap to get a membership',
                                      style: const TextStyle(
                                        color: AppTheme.onSurfaceMuted,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const Icon(
                                Icons.chevron_right_rounded,
                                color: AppTheme.onSurfaceMuted,
                                size: 20,
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),

                // ══════════════════════════════════════
                // SERVICES GRID
                // ══════════════════════════════════════
                const _SectionDivider(),
                const _SectionHeader(title: 'Services'),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                  child: _MeituanServiceGrid(
                    items: [
                      _ServiceItem(
                        icon: Icons.qr_code_rounded,
                        label: 'QR Code',
                        color: const Color(0xFF0066FF),
                        onTap: () {
                          Haptics.medium();
                          showModalBottomSheet(
                            context: context,
                            isScrollControlled: true,
                            backgroundColor: AppTheme.background,
                            shape: const RoundedRectangleBorder(
                              borderRadius: BorderRadius.vertical(
                                  top: Radius.circular(24)),
                            ),
                            builder: (_) => SizedBox(
                              height:
                                  MediaQuery.of(context).size.height *
                                      0.85,
                              child: const QrScreen(),
                            ),
                          );
                        },
                      ),
                      _ServiceItem(
                        icon: Icons.bar_chart_rounded,
                        label: 'Stats',
                        color: const Color(0xFF8B5CF6),
                        onTap: () => Haptics.light(),
                      ),
                      _ServiceItem(
                        icon: Icons.sports_martial_arts_rounded,
                        label: 'Book PT',
                        color: const Color(0xFFF97316),
                        onTap: () {
                          Haptics.light();
                          context.push('/bookings');
                        },
                      ),
                      _ServiceItem(
                        icon: Icons.headset_mic_rounded,
                        label: 'Support',
                        color: const Color(0xFF22C55E),
                        onTap: () => Haptics.light(),
                      ),
                      _ServiceItem(
                        icon: Icons.settings_rounded,
                        label: 'Settings',
                        color: const Color(0xFF6B7280),
                        onTap: () {
                          Haptics.light();
                          context.go('/profile');
                        },
                      ),
                      _ServiceItem(
                        icon: Icons.group_add_rounded,
                        label: 'Refer',
                        color: const Color(0xFFEC4899),
                        onTap: () => Haptics.light(),
                      ),
                      _ServiceItem(
                        icon: Icons.help_outline_rounded,
                        label: 'Help',
                        color: const Color(0xFFF59E0B),
                        onTap: () => Haptics.light(),
                      ),
                      _ServiceItem(
                        icon: Icons.add_circle_outline_rounded,
                        label: 'More',
                        color: AppTheme.onSurfaceMuted,
                        onTap: () => Haptics.light(),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 100),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStatsRow(String monthly, String weekly) {
    return Row(
      children: [
        Expanded(
          child: _StatCard(
            label: 'This Month',
            value: monthly,
            icon: Icons.directions_walk_rounded,
            valueColor: AppTheme.primary,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _StatCard(
            label: 'This Week',
            value: weekly,
            icon: Icons.local_fire_department_rounded,
            valueColor: AppTheme.warning,
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────
// COACH HOME VIEW
// ─────────────────────────────────────────────────────────
class _CoachHomeView extends ConsumerWidget {
  const _CoachHomeView();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final name = auth.memberName ?? 'Coach';

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Header ──
              Row(
                children: [
                  const TenantSwitcherHeader(),
                  const Expanded(
                    child: Center(
                      child: Text(
                        'Coach Portal',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.3,
                        ),
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () {},
                    icon: const Icon(Icons.notifications_outlined,
                        color: Colors.white, size: 24),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // ── Welcome ──
              const Text(
                'Welcome back,',
                style: TextStyle(
                  fontSize: 14,
                  color: AppTheme.onSurfaceMuted,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                name.toUpperCase(),
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 6),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF7C3AED).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Text(
                  'COACH',
                  style: TextStyle(
                    color: Color(0xFF7C3AED),
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1,
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // ── Today stats ──
              const Text(
                'TODAY',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.onSurfaceMuted,
                  letterSpacing: 1.0,
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _StatCard(
                      label: 'Sessions Today',
                      value: '—',
                      icon: Icons.fitness_center_rounded,
                      valueColor: const Color(0xFF7C3AED),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _StatCard(
                      label: 'My Clients',
                      value: '—',
                      icon: Icons.people_rounded,
                      valueColor: AppTheme.primary,
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 28),

              // ── Quick actions ──
              const Text(
                'QUICK ACTIONS',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.onSurfaceMuted,
                  letterSpacing: 1.0,
                ),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _ActionChip(
                    emoji: '📝',
                    label: 'Log Session',
                    onTap: () => context.push('/coach-log-session'),
                  ),
                  _ActionChip(
                    emoji: '👥',
                    label: 'My Clients',
                    onTap: () => context.push('/coach-clients'),
                  ),
                ],
              ),

              const SizedBox(height: 28),

              // ── My clients placeholder ──
              const Text(
                'MY CLIENTS',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.onSurfaceMuted,
                  letterSpacing: 1.0,
                ),
              ),
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppTheme.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.surfaceVariant),
                ),
                child: Column(
                  children: [
                    Icon(Icons.people_outline_rounded,
                        color: AppTheme.onSurfaceMuted.withValues(alpha: 0.5),
                        size: 40),
                    const SizedBox(height: 8),
                    const Text(
                      'No clients assigned yet',
                      style: TextStyle(
                        color: AppTheme.onSurfaceMuted,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 80),
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────
// ADMIN HOME VIEW
// ─────────────────────────────────────────────────────────
class _AdminHomeView extends ConsumerWidget {
  const _AdminHomeView();

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final name = auth.memberName ?? 'Admin';

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Header ──
              Row(
                children: [
                  const TenantSwitcherHeader(),
                  const Expanded(
                    child: Center(
                      child: Text(
                        'Admin Dashboard',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.3,
                        ),
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () {},
                    icon: const Icon(Icons.notifications_outlined,
                        color: Colors.white, size: 24),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // ── Welcome ──
              Text(
                '${_greeting()},',
                style: const TextStyle(
                  fontSize: 14,
                  color: AppTheme.onSurfaceMuted,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                name.toUpperCase(),
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 6),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
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

              // ── Stats grid ──
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.5,
                children: const [
                  _AdminStatCard(
                      icon: Icons.person_rounded,
                      label: 'Total Members',
                      value: '—'),
                  _AdminStatCard(
                      icon: Icons.how_to_reg_rounded,
                      label: 'Active Today',
                      value: '—'),
                  _AdminStatCard(
                      icon: Icons.payments_rounded,
                      label: 'This Month',
                      value: 'RM —'),
                  _AdminStatCard(
                      icon: Icons.trending_up_rounded,
                      label: 'New This Week',
                      value: '—'),
                ],
              ),

              const SizedBox(height: 28),

              // ── Quick actions ──
              const Text(
                'QUICK ACTIONS',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.onSurfaceMuted,
                  letterSpacing: 1.0,
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
                    emoji: '⚙️',
                    label: 'Settings',
                    onTap: () => context.push('/profile'),
                  ),
                ],
              ),

              const SizedBox(height: 80),
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────
// SECTION LAYOUT HELPERS (Meituan-style)
// ─────────────────────────────────────────────────────────

class _SectionDivider extends StatelessWidget {
  const _SectionDivider();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 8,
      color: const Color(0xFF0D0D18),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
      child: Row(
        children: [
          Container(
            width: 3,
            height: 14,
            decoration: BoxDecoration(
              color: AppTheme.primary,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            title,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 15,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────
// SHARED WIDGETS
// ─────────────────────────────────────────────────────────

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color valueColor;

  const _StatCard({
    required this.label,
    required this.value,
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
          Text(
            value,
            style: TextStyle(
              fontSize: 36,
              fontWeight: FontWeight.w900,
              color: valueColor,
              height: 1.0,
            ),
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

class _AdminStatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _AdminStatCard({
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
        border: Border.all(color: AppTheme.surfaceVariant),
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

// ─────────────────────────────────────────────────────────
// MEITUAN-STYLE SERVICE GRID
// ─────────────────────────────────────────────────────────

class _ServiceItem {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? color;
  const _ServiceItem({
    required this.icon,
    required this.label,
    required this.onTap,
    this.color,
  });
}

class _MeituanServiceGrid extends StatelessWidget {
  final List<_ServiceItem> items;
  const _MeituanServiceGrid({required this.items});

  @override
  Widget build(BuildContext context) {
    const columns = 4;
    final rows = (items.length / columns).ceil();

    return Column(
      children: List.generate(rows, (rowIdx) {
        final start = rowIdx * columns;
        final end = (start + columns).clamp(0, items.length);
        final rowItems = items.sublist(start, end);

        return Padding(
          padding: EdgeInsets.only(bottom: rowIdx < rows - 1 ? 16 : 0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: rowItems
                .map((item) => Expanded(child: _ServiceGridItem(item: item)))
                .toList(),
          ),
        );
      }),
    );
  }
}

class _ServiceGridItem extends StatefulWidget {
  final _ServiceItem item;
  const _ServiceGridItem({required this.item});

  @override
  State<_ServiceGridItem> createState() => _ServiceGridItemState();
}

class _ServiceGridItemState extends State<_ServiceGridItem>
    with SingleTickerProviderStateMixin {
  late AnimationController _scaleCtrl;
  late Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _scaleCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 120),
    );
    _scale = Tween<double>(begin: 1.0, end: 0.92).animate(
      CurvedAnimation(parent: _scaleCtrl, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _scaleCtrl.dispose();
    super.dispose();
  }

  void _onTapDown(TapDownDetails _) => _scaleCtrl.forward();
  void _onTapUp(TapUpDetails _) {
    _scaleCtrl.reverse();
    widget.item.onTap();
  }
  void _onTapCancel() => _scaleCtrl.reverse();

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: _onTapDown,
      onTapUp: _onTapUp,
      onTapCancel: _onTapCancel,
      child: ScaleTransition(
        scale: _scale,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Builder(builder: (context) {
              final c = widget.item.color ?? AppTheme.primary;
              return Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: c.withValues(alpha: 0.12),
                  border: Border.all(
                    color: c.withValues(alpha: 0.20),
                  ),
                ),
                child: Icon(
                  widget.item.icon,
                  color: c,
                  size: 24,
                ),
              );
            }),
            const SizedBox(height: 8),
            Text(
              widget.item.label,
              style: const TextStyle(
                color: AppTheme.onSurfaceMuted,
                fontSize: 11,
                fontWeight: FontWeight.w500,
              ),
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}


