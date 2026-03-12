import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/providers/membership_provider.dart';
import '../../../core/providers/tenant_provider.dart';
import '../../../core/theme/app_theme.dart';

class MembershipScreen extends ConsumerWidget {
  const MembershipScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final memberName = authState.memberName ?? 'Member';
    final tenantId = ref.watch(activeTenantIdProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Membership'),
      ),
      body: tenantId == null
          ? const Center(
              child: Text('No active shop selected',
                  style: TextStyle(color: Colors.white70)))
          : _MembershipBody(
              tenantId: tenantId, memberName: memberName),
    );
  }
}

class _MembershipBody extends ConsumerWidget {
  final String tenantId;
  final String memberName;

  const _MembershipBody({
    required this.tenantId,
    required this.memberName,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final membershipAsync = ref.watch(membershipProvider(tenantId));

    return membershipAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (_, __) => const Center(
          child:
              Text('Could not load membership', style: TextStyle(color: Colors.white70))),
      data: (membership) {
        final planName = membership?.planName ?? 'Premium Membership';
        final isActive = membership?.isActive ?? false;
        final periodEnd = membership?.periodEnd;
        final periodStart = membership?.periodStart;

        final dateFmt = DateFormat('MMM d, yyyy');
        final startLabel = periodStart != null ? dateFmt.format(periodStart) : 'N/A';
        final endLabel = periodEnd != null
            ? 'Active until ${dateFmt.format(periodEnd)}'
            : 'No expiry';

        return SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Current plan card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF0066FF), Color(0xFF001a66)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Current Plan',
                      style: TextStyle(
                        color: Colors.white70,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      planName,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      memberName,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.8),
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _InfoChip(label: 'Started', value: startLabel),
                        _InfoChip(
                          label: 'Status',
                          value: isActive ? endLabel : 'Inactive',
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'Plan Benefits',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 12),
              _BenefitItem(
                icon: Icons.fitness_center_rounded,
                title: 'Unlimited Gym Access',
                subtitle: 'All locations, all hours',
              ),
              _BenefitItem(
                icon: Icons.group_rounded,
                title: 'Group Classes',
                subtitle: 'Up to 5 classes per week',
              ),
              _BenefitItem(
                icon: Icons.spa_rounded,
                title: 'Recovery Zone',
                subtitle: 'Sauna & cold plunge access',
              ),
              _BenefitItem(
                icon: Icons.person_rounded,
                title: 'Personal Training',
                subtitle: '2 sessions per month included',
              ),
              const SizedBox(height: 28),
              // ── Buy / Upgrade CTA ──
              SizedBox(
                width: double.infinity,
                height: 54,
                child: ElevatedButton.icon(
                  onPressed: () => context.push('/plans'),
                  icon: const Icon(Icons.add_card_rounded, size: 20),
                  label: Text(
                    isActive ? 'Upgrade / Renew Plan' : 'Browse Membership Plans',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              if (!isActive) ...[
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: OutlinedButton.icon(
                    onPressed: () => context.push('/plans'),
                    icon: const Icon(Icons.card_giftcard_rounded, size: 18),
                    label: const Text('View All Plans'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppTheme.primary,
                      side: const BorderSide(color: AppTheme.primary),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
              ],
            ],
          ),
        );
      },
    );
  }
}

class _InfoChip extends StatelessWidget {
  final String label;
  final String value;
  const _InfoChip({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Flexible(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.6), fontSize: 12)),
          const SizedBox(height: 4),
          Text(value,
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

class _BenefitItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;

  const _BenefitItem({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppTheme.primary.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: AppTheme.primary, size: 22),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.w600)),
                const SizedBox(height: 2),
                Text(subtitle,
                    style: const TextStyle(
                        color: AppTheme.onSurfaceMuted, fontSize: 13)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
