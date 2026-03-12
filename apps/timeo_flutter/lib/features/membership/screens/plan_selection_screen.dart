import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/providers/packages_provider.dart';
import '../../../core/providers/tenant_provider.dart';
import '../../../core/theme/app_theme.dart';

class PlanSelectionScreen extends ConsumerStatefulWidget {
  const PlanSelectionScreen({super.key});

  @override
  ConsumerState<PlanSelectionScreen> createState() =>
      _PlanSelectionScreenState();
}

class _PlanSelectionScreenState extends ConsumerState<PlanSelectionScreen> {
  String? _selectedPlanType;

  @override
  Widget build(BuildContext context) {
    final tenantId = ref.watch(activeTenantIdProvider);
    if (tenantId == null) {
      return Scaffold(
        backgroundColor: AppTheme.background,
        body: const Center(
          child: Text('No gym selected', style: TextStyle(color: Colors.white)),
        ),
      );
    }

    final plansAsync = ref.watch(packagesProvider(tenantId));

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.background,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: plansAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, color: AppTheme.error, size: 48),
              const SizedBox(height: 12),
              Text(
                'Failed to load plans',
                style: TextStyle(color: AppTheme.onSurfaceMuted, fontSize: 14),
              ),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () => ref.invalidate(packagesProvider(tenantId)),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (allPlans) {
          // Build category list from plan types
          final planTypes = allPlans.map((p) => p.planType).toSet().toList();
          final activeType = _selectedPlanType ?? (planTypes.isNotEmpty ? planTypes.first : null);
          final filteredPlans = activeType != null
              ? allPlans.where((p) => p.planType == activeType).toList()
              : allPlans;

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Header ──
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text(
                      'SELECT YOUR PLAN',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                        letterSpacing: 1.0,
                      ),
                    ),
                    SizedBox(height: 6),
                    Text(
                      'Choose the membership that fits your fitness goals',
                      style: TextStyle(
                        color: AppTheme.onSurfaceMuted,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // ── Category filter tabs ──
              if (planTypes.length > 1)
                SizedBox(
                  height: 40,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    itemCount: planTypes.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (context, index) {
                      final type = planTypes[index];
                      final isSelected = type == activeType;
                      return GestureDetector(
                        onTap: () => setState(() => _selectedPlanType = type),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            color: isSelected ? AppTheme.primary : AppTheme.surface,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: isSelected ? AppTheme.primary : AppTheme.surfaceVariant,
                            ),
                          ),
                          child: Text(
                            type.replaceAll('_', ' ').toUpperCase(),
                            style: TextStyle(
                              color: isSelected ? Colors.white : AppTheme.onSurfaceMuted,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              if (planTypes.length > 1) const SizedBox(height: 16),

              // ── Plan cards ──
              Expanded(
                child: filteredPlans.isEmpty
                    ? const Center(
                        child: Text(
                          'No plans available',
                          style: TextStyle(color: AppTheme.onSurfaceMuted, fontSize: 14),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        itemCount: filteredPlans.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final plan = filteredPlans[index];
                          return _PlanCard(plan: plan);
                        },
                      ),
              ),

              // ── Bottom warning ──
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                color: AppTheme.warning.withValues(alpha: 0.08),
                child: const Row(
                  children: [
                    Icon(Icons.warning_amber_rounded, color: AppTheme.warning, size: 16),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'All plans are Non-refundable & Non-exchangeable',
                        style: TextStyle(
                          color: AppTheme.warning,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _PlanCard extends StatelessWidget {
  final MembershipPlan plan;
  const _PlanCard({required this.plan});

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
          // Plan type badge + duration
          Row(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  plan.planType.replaceAll('_', ' ').toUpperCase(),
                  style: const TextStyle(
                    color: AppTheme.primary,
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppTheme.surfaceVariant,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  plan.displayDuration,
                  style: const TextStyle(
                    color: AppTheme.onSurfaceMuted,
                    fontSize: 10,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Plan name
          Text(
            plan.name,
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 6),

          // Description
          if (plan.description != null)
            Text(
              plan.description!,
              style: const TextStyle(
                color: AppTheme.onSurfaceMuted,
                fontSize: 12,
                height: 1.4,
              ),
            ),

          // Features
          if (plan.features.isNotEmpty) ...[
            const SizedBox(height: 8),
            ...plan.features.map((f) => Padding(
              padding: const EdgeInsets.only(bottom: 2),
              child: Row(
                children: [
                  const Icon(Icons.check_circle_outline, color: Color(0xFF22C55E), size: 14),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(f, style: const TextStyle(color: AppTheme.onSurfaceMuted, fontSize: 12)),
                  ),
                ],
              ),
            )),
          ],
          const SizedBox(height: 14),

          // Price + Select button
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Text(
                plan.displayPrice,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  color: AppTheme.warning,
                ),
              ),
              ElevatedButton(
                onPressed: () {
                  context.push('/package-detail', extra: plan);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.warning,
                  foregroundColor: Colors.black,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  minimumSize: Size.zero,
                ),
                child: const Text(
                  'Select',
                  style:
                      TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
