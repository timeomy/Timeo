import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/packages_provider.dart';
import 'payment_screen.dart';

/// Returns a gradient based on the plan category.
LinearGradient _categoryGradient(String category) {
  switch (category.toUpperCase()) {
    case 'GYM ACCESS':
      return const LinearGradient(
        colors: [Color(0xFF1A56DB), Color(0xFF0B3DB5)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      );
    case 'STUDIO CLASS':
      return const LinearGradient(
        colors: [Color(0xFF7C3AED), Color(0xFF4C1D95)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      );
    case 'TRAINING':
      return const LinearGradient(
        colors: [Color(0xFFD97706), Color(0xFF92400E)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      );
    case 'DAY PASS':
      return const LinearGradient(
        colors: [Color(0xFF059669), Color(0xFF064E3B)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      );
    default: // THIS MONTH PROMO, etc.
      return const LinearGradient(
        colors: [Color(0xFFEF4444), Color(0xFF991B1B)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      );
  }
}

/// List of benefits derived from the plan category.
List<String> _categoryBenefits(String category) {
  switch (category.toUpperCase()) {
    case 'GYM ACCESS':
      return [
        'Access to full gym floor & equipment',
        'Locker & shower facilities included',
        'Access during operating hours',
        'No class booking required',
      ];
    case 'STUDIO CLASS':
      return [
        'Unlimited studio classes',
        'Book classes via the app',
        'Professional instructors',
        'Small class sizes for better coaching',
      ];
    case 'TRAINING':
      return [
        'One-on-one with certified coach',
        'Personalised workout plan',
        'Nutrition guidance included',
        'Progress tracking & assessments',
      ];
    case 'DAY PASS':
      return [
        'Full-day access to all facilities',
        'No commitment required',
        'Includes locker usage',
        'Valid on purchase date only',
      ];
    default:
      return [
        'Full access to gym & studio',
        'Priority class booking',
        'Exclusive member discounts',
        'Access to all facilities',
      ];
  }
}

class PackageDetailScreen extends StatelessWidget {
  final MembershipPlan plan;

  const PackageDetailScreen({super.key, required this.plan});

  @override
  Widget build(BuildContext context) {
    final gradient = _categoryGradient(plan.planType);
    final benefits = plan.features.isNotEmpty
        ? plan.features
        : _categoryBenefits(plan.planType);

    return Scaffold(
      backgroundColor: AppTheme.background,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.35),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.arrow_back_rounded,
                color: Colors.white, size: 20),
          ),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'PACKAGE DETAILS',
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w800,
            color: Colors.white,
            letterSpacing: 1.0,
          ),
        ),
      ),
      body: Column(
        children: [
          // ── Scrollable body ──
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Hero banner ──
                  Container(
                    width: double.infinity,
                    height: 220,
                    decoration: BoxDecoration(gradient: gradient),
                    child: Stack(
                      children: [
                        // Subtle pattern overlay
                        Positioned.fill(
                          child: Opacity(
                            opacity: 0.06,
                            child: GridView.builder(
                              physics: const NeverScrollableScrollPhysics(),
                              gridDelegate:
                                  const SliverGridDelegateWithFixedCrossAxisCount(
                                      crossAxisCount: 6),
                              itemBuilder: (_, __) => const Icon(
                                  Icons.circle,
                                  color: Colors.white,
                                  size: 4),
                            ),
                          ),
                        ),
                        // Category chip
                        Positioned(
                          top: 80,
                          left: 20,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                  color: Colors.white.withValues(alpha: 0.4)),
                            ),
                            child: Text(
                              plan.planType.replaceAll('_', ' ').toUpperCase(),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                        // Plan name overlay
                        Positioned(
                          bottom: 20,
                          left: 20,
                          right: 20,
                          child: Text(
                            plan.name,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 26,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.5,
                              shadows: [
                                Shadow(
                                  blurRadius: 8,
                                  color: Colors.black45,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // ── Content ──
                  Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Plan name + price
                        Text(
                          plan.name,
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            Text(
                              plan.displayPrice,
                              style: const TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.w900,
                                color: AppTheme.warning,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppTheme.surfaceVariant,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                plan.displayDuration,
                                style: const TextStyle(
                                  color: AppTheme.onSurfaceMuted,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        const Divider(color: AppTheme.surfaceVariant),
                        const SizedBox(height: 20),

                        // Description
                        const Text(
                          'Description',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 8),
                        if (plan.description != null)
                          Text(
                            plan.description!,
                            style: const TextStyle(
                              color: AppTheme.onSurfaceMuted,
                              fontSize: 14,
                              height: 1.6,
                            ),
                          ),
                        const SizedBox(height: 20),

                        // Benefits
                        const Text(
                          'What\'s Included',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 12),
                        ...benefits.map((b) => _BenefitRow(text: b)),
                        const SizedBox(height: 20),

                        // Terms
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: AppTheme.warning.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                                color: AppTheme.warning.withValues(alpha: 0.25)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: const [
                                  Icon(Icons.info_outline_rounded,
                                      color: AppTheme.warning, size: 16),
                                  SizedBox(width: 6),
                                  Text(
                                    'Terms & Conditions',
                                    style: TextStyle(
                                      color: AppTheme.warning,
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              _TermRow(text: 'Non-refundable & non-exchangeable'),
                              _TermRow(
                                  text: 'Valid for ${plan.displayDuration} from activation'),
                              _TermRow(text: 'Subject to Timeo Fitness house rules'),
                              _TermRow(text: 'Management reserves the right to amend terms'),
                            ],
                          ),
                        ),
                        const SizedBox(height: 100), // space for sticky bar
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),

      // ── Sticky bottom bar ──
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          decoration: BoxDecoration(
            color: AppTheme.surface,
            border: Border(
              top: BorderSide(color: AppTheme.surfaceVariant),
            ),
          ),
          child: Row(
            children: [
              Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Total Price',
                    style: TextStyle(
                      color: AppTheme.onSurfaceMuted,
                      fontSize: 12,
                    ),
                  ),
                  Text(
                    plan.displayPrice,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      color: AppTheme.warning,
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 16),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => PaymentScreen(
                          planName: plan.name,
                          amount: plan.price,
                          currency: plan.currency == 'MYR' ? 'RM' : plan.currency,
                        ),
                      ),
                    );
                  },
                  icon: const Icon(Icons.arrow_forward_rounded, size: 18),
                  label: const Text(
                    'Checkout',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BenefitRow extends StatelessWidget {
  final String text;
  const _BenefitRow({required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.check_circle_rounded,
              color: AppTheme.success, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 14,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TermRow extends StatelessWidget {
  final String text;
  const _TermRow({required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('• ',
              style: TextStyle(color: AppTheme.warning, fontSize: 13)),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                color: AppTheme.onSurfaceMuted,
                fontSize: 13,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
