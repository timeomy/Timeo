import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/models/tenant.dart';
import '../../../core/providers/tenant_provider.dart';
import '../../../core/theme/app_theme.dart';

/// Full-screen tenant selection — no bottom nav (outside ShellRoute).
class SelectShopScreen extends ConsumerStatefulWidget {
  const SelectShopScreen({super.key});

  @override
  ConsumerState<SelectShopScreen> createState() => _SelectShopScreenState();
}

class _SelectShopScreenState extends ConsumerState<SelectShopScreen> {
  String _search = '';
  Tenant? _selected;

  @override
  void initState() {
    super.initState();
    _selected = ref.read(activeTenantProvider);
  }

  Color _tenantColor(Tenant t) {
    final hex = t.branding?['primaryColor'] as String?;
    if (hex != null) {
      try {
        final cleaned = hex.replaceAll('#', '');
        return Color(int.parse('FF$cleaned', radix: 16));
      } catch (_) {}
    }
    final industry = (t.branding?['industry'] as String? ?? '').toLowerCase();
    switch (industry) {
      case 'fitness': return const Color(0xFF0066FF);
      case 'wellness': return const Color(0xFF7C3AED);
      case 'coworking': return const Color(0xFF0EA5E9);
      case 'salon': return const Color(0xFFEC4899);
      default: return const Color(0xFF0066FF);
    }
  }

  String _industryEmoji(String? industry) {
    switch ((industry ?? '').toLowerCase()) {
      case 'fitness': return '🏋️';
      case 'wellness': return '🧘';
      case 'coworking': return '💻';
      case 'salon': return '💅';
      default: return '🏢';
    }
  }

  @override
  Widget build(BuildContext context) {
    final tenantsAsync = ref.watch(tenantsProvider);
    final tenants = tenantsAsync.valueOrNull ?? [];
    final filtered = tenants
        .where((t) => t.name.toLowerCase().contains(_search.toLowerCase()))
        .toList();
    final role = ref.read(authProvider).role;

    String homeForRole(String? r) {
      switch (r) {
        case 'admin': return '/admin-home';
        case 'staff': return '/coach-home';
        default: return '/home';
      }
    }

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Column(
          children: [
            // ── Top bar ──
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: () {
                      if (Navigator.canPop(context)) {
                        Navigator.pop(context);
                      } else {
                        context.go(homeForRole(role));
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1A1A2E),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.close_rounded, color: Colors.white, size: 20),
                    ),
                  ),
                  const Expanded(
                    child: Text(
                      'Select Shop',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  GestureDetector(
                    onTap: () => showSearch(
                      context: context,
                      delegate: _TenantSearchDelegate(tenants: tenants, onSelect: (t) {
                        setState(() => _selected = t);
                      }),
                    ),
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1A1A2E),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.search_rounded, color: Colors.white, size: 20),
                    ),
                  ),
                ],
              ),
            ),

            // ── Grid ──
            Expanded(
              child: tenantsAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, _) => Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.error_outline, color: AppTheme.error, size: 48),
                      const SizedBox(height: 12),
                      Text('Failed to load shops', style: TextStyle(color: AppTheme.onSurfaceMuted)),
                      const SizedBox(height: 12),
                      ElevatedButton(
                        onPressed: () => ref.invalidate(tenantsProvider),
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                ),
                data: (_) => filtered.isEmpty
                  ? Center(
                      child: Text('No businesses found',
                        style: TextStyle(color: AppTheme.onSurfaceMuted)))
                  : GridView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                        childAspectRatio: 1.0,
                      ),
                      itemCount: filtered.length,
                      itemBuilder: (context, i) {
                        final tenant = filtered[i];
                        final isSelected = _selected?.id == tenant.id;
                        final color = _tenantColor(tenant);
                        final initial = tenant.name.isNotEmpty ? tenant.name[0].toUpperCase() : '?';
                        final emoji = _industryEmoji(tenant.branding?['industry'] as String?);

                        return GestureDetector(
                          onTap: () => setState(() => _selected = tenant),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 180),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? color.withValues(alpha: 0.12)
                                  : const Color(0xFF1A1A2E),
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(
                                color: isSelected ? color : const Color(0xFF252535),
                                width: isSelected ? 2 : 1,
                              ),
                            ),
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                // Logo or initial circle
                                tenant.logoUrl != null
                                  ? ClipOval(
                                      child: Image.network(
                                        tenant.logoUrl!,
                                        width: 60, height: 60, fit: BoxFit.cover,
                                        errorBuilder: (_, __, ___) => _InitialCircle(
                                          initial: initial, color: color),
                                      ))
                                  : _InitialCircle(initial: initial, color: color),
                                const SizedBox(height: 10),
                                Text(
                                  tenant.name,
                                  textAlign: TextAlign.center,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    color: isSelected ? color : Colors.white,
                                    fontSize: 13,
                                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  emoji,
                                  style: const TextStyle(fontSize: 14),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
              ),
            ),

            // ── Save button ──
            Padding(
              padding: EdgeInsets.fromLTRB(16, 8, 16, MediaQuery.of(context).padding.bottom + 20),
              child: SizedBox(
                width: double.infinity,
                height: 54,
                child: ElevatedButton(
                  onPressed: _selected != null
                    ? () async {
                        ref.read(activeTenantProvider.notifier).state = _selected;
                        // Persist selection for next launch
                        try {
                          const storage = FlutterSecureStorage();
                          await storage.write(key: 'last_tenant_id', value: _selected!.id);
                        } catch (_) {}
                        if (!context.mounted) return;
                        if (Navigator.canPop(context)) {
                          Navigator.pop(context);
                        } else {
                          context.go(homeForRole(role));
                        }
                      }
                    : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    disabledBackgroundColor: AppTheme.primary.withValues(alpha: 0.3),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: const Text('Save',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _InitialCircle extends StatelessWidget {
  final String initial;
  final Color color;
  const _InitialCircle({required this.initial, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 60, height: 60,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      child: Center(child: Text(initial,
        style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w700))),
    );
  }
}

class _TenantSearchDelegate extends SearchDelegate<Tenant?> {
  final List<Tenant> tenants;
  final void Function(Tenant) onSelect;

  _TenantSearchDelegate({required this.tenants, required this.onSelect});

  @override
  ThemeData appBarTheme(BuildContext context) => Theme.of(context).copyWith(
    scaffoldBackgroundColor: const Color(0xFF0B0B0F),
    inputDecorationTheme: const InputDecorationTheme(
      hintStyle: TextStyle(color: Color(0xFF55547A)),
    ),
  );

  @override
  List<Widget> buildActions(BuildContext context) => [
    IconButton(icon: const Icon(Icons.clear), onPressed: () => query = ''),
  ];

  @override
  Widget buildLeading(BuildContext context) =>
    IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => close(context, null));

  @override
  Widget buildResults(BuildContext context) => _buildList(context);

  @override
  Widget buildSuggestions(BuildContext context) => _buildList(context);

  Widget _buildList(BuildContext context) {
    final filtered = tenants.where(
      (t) => t.name.toLowerCase().contains(query.toLowerCase())).toList();
    return Container(
      color: const Color(0xFF0B0B0F),
      child: ListView.builder(
        itemCount: filtered.length,
        itemBuilder: (_, i) {
          final t = filtered[i];
          return ListTile(
            title: Text(t.name, style: const TextStyle(color: Colors.white)),
            onTap: () {
              onSelect(t);
              close(context, t);
            },
          );
        },
      ),
    );
  }
}
