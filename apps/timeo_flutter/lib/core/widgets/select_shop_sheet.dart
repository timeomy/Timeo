import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/tenant.dart';
import '../providers/tenant_provider.dart';

class SelectShopSheet extends ConsumerStatefulWidget {
  const SelectShopSheet({super.key});

  @override
  ConsumerState<SelectShopSheet> createState() => _SelectShopSheetState();
}

class _SelectShopSheetState extends ConsumerState<SelectShopSheet> {
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

  @override
  Widget build(BuildContext context) {
    final tenantsAsync = ref.watch(tenantsProvider);
    final tenants = tenantsAsync.valueOrNull ?? [];
    final filtered = tenants
        .where((t) => t.name.toLowerCase().contains(_search.toLowerCase()))
        .toList();

    return Container(
      height: MediaQuery.of(context).size.height * 0.92,
      decoration: const BoxDecoration(
        color: Color(0xFF0B0B0F),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Drag handle
          Container(
            margin: const EdgeInsets.only(top: 12, bottom: 4),
            width: 40, height: 4,
            decoration: BoxDecoration(
              color: const Color(0xFF252535),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: const Icon(Icons.close_rounded, color: Colors.white, size: 22),
                ),
                const Expanded(
                  child: Text('Select Business',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700)),
                ),
                const SizedBox(width: 22),
              ],
            ),
          ),
          // Search bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: TextField(
              onChanged: (v) => setState(() => _search = v),
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Search businesses...',
                hintStyle: const TextStyle(color: Color(0xFF55547A)),
                prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF55547A)),
                filled: true,
                fillColor: const Color(0xFF1A1A2E),
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          // Grid of businesses
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.05,
              ),
              itemCount: filtered.length,
              itemBuilder: (context, i) {
                final tenant = filtered[i];
                final isSelected = _selected?.id == tenant.id;
                final color = _tenantColor(tenant);
                final initial = tenant.name.isNotEmpty ? tenant.name[0].toUpperCase() : '?';
                return _ShopCard(
                  name: tenant.name,
                  subtitle: _industryLabel(tenant.branding?['industry'] as String?),
                  logoWidget: tenant.logoUrl != null
                    ? ClipOval(child: Image.network(tenant.logoUrl!, width: 60, height: 60, fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => _InitialCircle(initial: initial, color: color)))
                    : _InitialCircle(initial: initial, color: color),
                  color: color,
                  isSelected: isSelected,
                  onTap: () => setState(() => _selected = tenant),
                );
              },
            ),
          ),
          // Save button
          Padding(
            padding: EdgeInsets.fromLTRB(16, 8, 16, MediaQuery.of(context).padding.bottom + 20),
            child: SizedBox(
              width: double.infinity,
              height: 54,
              child: ElevatedButton(
                onPressed: () {
                  ref.read(activeTenantProvider.notifier).state = _selected;
                  Navigator.pop(context);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0066FF),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: const Text('Confirm',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _industryLabel(String? industry) {
    switch ((industry ?? '').toLowerCase()) {
      case 'fitness': return '🏋️ Fitness';
      case 'wellness': return '🧘 Wellness';
      case 'coworking': return '💻 Co-working';
      case 'salon': return '💅 Beauty';
      default: return '🏢 Business';
    }
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

class _ShopCard extends StatelessWidget {
  final String name;
  final String subtitle;
  final Widget logoWidget;
  final Color color;
  final bool isSelected;
  final VoidCallback onTap;

  const _ShopCard({
    required this.name, required this.subtitle, required this.logoWidget,
    required this.color, required this.isSelected, required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        decoration: BoxDecoration(
          color: isSelected ? color.withValues(alpha: 0.12) : const Color(0xFF1A1A2E),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? color : const Color(0xFF252535),
            width: isSelected ? 2 : 1,
          ),
        ),
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            logoWidget,
            const SizedBox(height: 10),
            Text(name,
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: isSelected ? color : Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 4),
            Text(subtitle,
              style: const TextStyle(color: Color(0xFF88878F), fontSize: 11)),
          ],
        ),
      ),
    );
  }
}
