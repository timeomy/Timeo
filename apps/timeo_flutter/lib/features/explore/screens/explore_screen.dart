import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/models/public_tenant.dart';
import '../../../core/providers/public_tenants_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/shimmer.dart';
import '../../../core/utils/haptics.dart';
import '../../../core/widgets/timeo_logo.dart';

// ─────────────────────────────────────────────────────────
// CATEGORY DATA
// ─────────────────────────────────────────────────────────

class _Category {
  final String label;
  final IconData icon;
  final Color color;
  const _Category({
    required this.label,
    required this.icon,
    required this.color,
  });
}

const _kCategories = [
  _Category(
    label: 'All',
    icon: Icons.apps_rounded,
    color: Color(0xFF0066FF),
  ),
  _Category(
    label: 'Fitness',
    icon: Icons.fitness_center_rounded,
    color: Color(0xFF0066FF),
  ),
  _Category(
    label: 'Salon',
    icon: Icons.content_cut_rounded,
    color: Color(0xFFEC4899),
  ),
  _Category(
    label: 'Restaurant',
    icon: Icons.restaurant_rounded,
    color: Color(0xFFF97316),
  ),
  _Category(
    label: 'Wellness',
    icon: Icons.self_improvement_rounded,
    color: Color(0xFF22C55E),
  ),
  _Category(
    label: 'Spa',
    icon: Icons.spa_rounded,
    color: Color(0xFF8B5CF6),
  ),
];

// ─────────────────────────────────────────────────────────
// EXPLORE SCREEN — Meituan-style Discovery Marketplace
// ─────────────────────────────────────────────────────────

/// First screen unauthenticated users see.
/// Fully browsable without login. Sign In is optional (top-right).
class ExploreScreen extends ConsumerStatefulWidget {
  const ExploreScreen({super.key});

  @override
  ConsumerState<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends ConsumerState<ExploreScreen> {
  final _searchController = TextEditingController();
  String? _searchQuery;
  int _selectedCategoryIndex = 0; // 0 = All
  Timer? _debounce;

  @override
  void dispose() {
    _searchController.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      if (mounted) {
        setState(() {
          _searchQuery = value.isEmpty ? null : value;
        });
      }
    });
  }

  String? get _selectedCategoryLabel =>
      _selectedCategoryIndex == 0 ? null : _kCategories[_selectedCategoryIndex].label;

  @override
  Widget build(BuildContext context) {
    final tenantsAsync = ref.watch(publicTenantsProvider(_searchQuery));

    return Scaffold(
      backgroundColor: const Color(0xFF0B0B0F),
      body: SafeArea(
        child: Column(
          children: [
            // ── Header: Logo + QR + Sign In ──
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 14, 16, 0),
              child: Row(
                children: [
                  const TimeoWordmark(fontSize: 22),
                  const Spacer(),
                  // QR Code / Scan button
                  GestureDetector(
                    onTap: () {
                      Haptics.light();
                      context.push('/sign-in');
                    },
                    child: Container(
                      width: 36,
                      height: 36,
                      margin: const EdgeInsets.only(right: 10),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        Icons.qr_code_scanner_rounded,
                        color: Colors.white.withValues(alpha: 0.7),
                        size: 20,
                      ),
                    ),
                  ),
                  GestureDetector(
                    onTap: () {
                      Haptics.light();
                      context.go('/sign-in');
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 7),
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: AppTheme.primary.withValues(alpha: 0.35),
                        ),
                      ),
                      child: const Text(
                        'Sign In',
                        style: TextStyle(
                          color: AppTheme.primary,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14),

            // ── Search bar ──
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                decoration: BoxDecoration(
                  color: const Color(0xFF16162A),
                  borderRadius: BorderRadius.circular(14),
                  border:
                      Border.all(color: Colors.white.withValues(alpha: 0.08)),
                ),
                child: TextField(
                  controller: _searchController,
                  onChanged: _onSearchChanged,
                  style: const TextStyle(color: Colors.white, fontSize: 15),
                  decoration: InputDecoration(
                    hintText: 'Search businesses...',
                    hintStyle: TextStyle(
                      color: Colors.white.withValues(alpha: 0.3),
                      fontSize: 15,
                    ),
                    prefixIcon: const Icon(
                      Icons.search_rounded,
                      color: AppTheme.primary,
                      size: 22,
                    ),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 14),
                  ),
                ),
              ),
            ),

            const SizedBox(height: 16),

            // ── Category row ──
            SizedBox(
              height: 82,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                itemCount: _kCategories.length,
                separatorBuilder: (_, __) => const SizedBox(width: 18),
                itemBuilder: (context, i) {
                  final cat = _kCategories[i];
                  final isSelected = _selectedCategoryIndex == i;
                  return GestureDetector(
                    onTap: () {
                      Haptics.light();
                      setState(() => _selectedCategoryIndex = i);
                    },
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 180),
                          width: 52,
                          height: 52,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: isSelected
                                ? cat.color.withValues(alpha: 0.25)
                                : cat.color.withValues(alpha: 0.10),
                            border: Border.all(
                              color: isSelected
                                  ? cat.color
                                  : cat.color.withValues(alpha: 0.2),
                              width: isSelected ? 2 : 1,
                            ),
                            boxShadow: isSelected
                                ? [
                                    BoxShadow(
                                      color: cat.color.withValues(alpha: 0.3),
                                      blurRadius: 8,
                                      offset: const Offset(0, 2),
                                    )
                                  ]
                                : null,
                          ),
                          child: Icon(cat.icon, color: cat.color, size: 24),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          cat.label,
                          style: TextStyle(
                            color: isSelected
                                ? Colors.white
                                : Colors.white.withValues(alpha: 0.55),
                            fontSize: 11,
                            fontWeight: isSelected
                                ? FontWeight.w600
                                : FontWeight.w400,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),

            const SizedBox(height: 6),

            // ── Section label ──
            Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
              child: Row(
                children: [
                  Text(
                    _selectedCategoryLabel == null
                        ? 'All Businesses'
                        : _selectedCategoryLabel!,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const Spacer(),
                  tenantsAsync.maybeWhen(
                    data: (list) => Text(
                      '${_filteredList(list).length} places',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.4),
                        fontSize: 12,
                      ),
                    ),
                    orElse: () => const SizedBox.shrink(),
                  ),
                ],
              ),
            ),

            // ── Business 2-column grid ──
            Expanded(
              child: tenantsAsync.when(
                loading: () => const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16),
                  child: ShimmerGrid(rows: 4, cardHeight: 150, spacing: 12),
                ),
                error: (_, __) => Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.wifi_off_rounded,
                        color: Colors.white.withValues(alpha: 0.2),
                        size: 48,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Could not load businesses',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.5),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextButton(
                        onPressed: () =>
                            ref.invalidate(publicTenantsProvider(_searchQuery)),
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                ),
                data: (allTenants) {
                  final tenants = _filteredList(allTenants);

                  if (tenants.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.store_rounded,
                            color: Colors.white.withValues(alpha: 0.2),
                            size: 48,
                          ),
                          const SizedBox(height: 12),
                          Text(
                            _searchQuery != null
                                ? 'No businesses found'
                                : 'No businesses yet',
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.4),
                              fontSize: 15,
                            ),
                          ),
                          if (_selectedCategoryIndex != 0) ...[
                            const SizedBox(height: 8),
                            TextButton(
                              onPressed: () {
                                setState(() => _selectedCategoryIndex = 0);
                              },
                              child: const Text('Show all categories'),
                            ),
                          ],
                        ],
                      ),
                    );
                  }

                  return GridView.builder(
                    padding:
                        const EdgeInsets.fromLTRB(16, 4, 16, 32),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      childAspectRatio: 0.75,
                    ),
                    itemCount: tenants.length,
                    itemBuilder: (context, index) => _BusinessGridCard(
                      tenant: tenants[index],
                      onTap: () {
                        Haptics.light();
                        final slug =
                            tenants[index].slug ?? tenants[index].id;
                        context.push('/store/$slug');
                      },
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  List<PublicTenant> _filteredList(List<PublicTenant> all) {
    final cat = _selectedCategoryLabel;
    if (cat == null) return all;
    return all
        .where((t) =>
            t.industry?.toLowerCase() == cat.toLowerCase())
        .toList();
  }
}

// ─────────────────────────────────────────────────────────
// BUSINESS GRID CARD
// ─────────────────────────────────────────────────────────

class _BusinessGridCard extends StatelessWidget {
  final PublicTenant tenant;
  final VoidCallback onTap;

  const _BusinessGridCard({required this.tenant, required this.onTap});

  Color get _accentColor {
    try {
      final hex = tenant.primaryColor.replaceFirst('#', '');
      return Color(int.parse('FF$hex', radix: 16));
    } catch (_) {
      return AppTheme.primary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final accent = _accentColor;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0xFF16162A),
          borderRadius: BorderRadius.circular(16),
          border:
              Border.all(color: Colors.white.withValues(alpha: 0.07)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.3),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Image / gradient area ──
            Expanded(
              child: Stack(
                children: [
                  Container(
                    width: double.infinity,
                    decoration: BoxDecoration(
                      borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(16)),
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          accent.withValues(alpha: 0.40),
                          accent.withValues(alpha: 0.12),
                        ],
                      ),
                    ),
                    child: tenant.logoUrl != null
                        ? ClipRRect(
                            borderRadius: const BorderRadius.vertical(
                                top: Radius.circular(16)),
                            child: Image.network(
                              tenant.logoUrl!,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Center(
                                child: _InitialLogo(
                                    name: tenant.name,
                                    color: accent,
                                    size: 52),
                              ),
                            ),
                          )
                        : Center(
                            child: _InitialLogo(
                                name: tenant.name,
                                color: accent,
                                size: 52),
                          ),
                  ),
                  // Industry badge overlay (bottom-left, Meituan style)
                  if (tenant.industry != null)
                    Positioned(
                      bottom: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 7, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.65),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          _capitalize(tenant.industry!),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.2,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // ── Name + Open badge ──
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    tenant.name,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      height: 1.2,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 5),
                  Row(
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: Color(0xFF22C55E),
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Text(
                        'Open',
                        style: TextStyle(
                          color: Color(0xFF22C55E),
                          fontSize: 10,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  static String _capitalize(String s) =>
      s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);
}

class _InitialLogo extends StatelessWidget {
  final String name;
  final Color color;
  final double size;

  const _InitialLogo({
    required this.name,
    required this.color,
    this.size = 40,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: color.withValues(alpha: 0.2),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Center(
        child: Text(
          name.isNotEmpty ? name[0].toUpperCase() : '?',
          style: TextStyle(
            color: color,
            fontSize: size * 0.38,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}
