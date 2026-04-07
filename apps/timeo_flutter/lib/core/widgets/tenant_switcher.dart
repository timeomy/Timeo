import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/tenant_provider.dart';

class TenantSwitcherHeader extends ConsumerWidget {
  const TenantSwitcherHeader({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activeTenant = ref.watch(activeTenantProvider);
    final tenantsAsync = ref.watch(tenantsProvider);

    final tenantCount = tenantsAsync.valueOrNull?.length ?? 0;
    final showDropdown = tenantCount > 1;

    return GestureDetector(
      onTap: showDropdown ? () => _openSelectShop(context) : null,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xFF1A1A2E),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: const Color(0xFF252535)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Tenant logo or branded initial circle
            _TenantLogoWidget(
              logoUrl: activeTenant?.logoUrl,
              tenantName: activeTenant?.name ?? '',
              branding: activeTenant?.branding,
            ),
            const SizedBox(width: 8),
            Text(
              activeTenant?.name ?? 'All Shop',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
            if (showDropdown) ...[
              const SizedBox(width: 4),
              const Icon(Icons.keyboard_arrow_down_rounded,
                  color: Colors.white, size: 18),
            ],
          ],
        ),
      ),
    );
  }

  void _openSelectShop(BuildContext context) {
    context.push('/select-shop');
  }
}

/// Displays tenant logo if available, otherwise a branded initial circle.
class _TenantLogoWidget extends StatelessWidget {
  final String? logoUrl;
  final String tenantName;
  final Map<String, dynamic>? branding;

  const _TenantLogoWidget({
    required this.logoUrl,
    required this.tenantName,
    this.branding,
  });

  Color _resolveColor() {
    // 1. Try explicit primaryColor from branding
    final primaryHex = branding?['primaryColor'] as String?;
    if (primaryHex != null) {
      final parsed = _parseHexColor(primaryHex);
      if (parsed != null) return parsed;
    }

    // 2. Fall back to industry-based color
    final industry =
        (branding?['industry'] as String?)?.toLowerCase() ?? '';
    switch (industry) {
      case 'fitness':
        return const Color(0xFF0066FF);
      case 'wellness':
        return const Color(0xFF7C3AED);
      case 'coworking':
        return const Color(0xFF0EA5E9);
      case 'salon':
        return const Color(0xFFEC4899);
      default:
        return const Color(0xFF0066FF);
    }
  }

  static Color? _parseHexColor(String hex) {
    try {
      final cleaned = hex.replaceAll('#', '').trim();
      if (cleaned.length == 6) {
        return Color(int.parse('FF$cleaned', radix: 16));
      } else if (cleaned.length == 8) {
        return Color(int.parse(cleaned, radix: 16));
      }
    } catch (_) {}
    return null;
  }

  @override
  Widget build(BuildContext context) {
    if (logoUrl != null) {
      return SizedBox(
        width: 28,
        height: 28,
        child: ClipOval(
          child: Image.network(
            logoUrl!,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => _InitialCircle(
              initial: _initial,
              color: _resolveColor(),
            ),
          ),
        ),
      );
    }

    return _InitialCircle(
      initial: _initial,
      color: _resolveColor(),
    );
  }

  String get _initial =>
      tenantName.isNotEmpty ? tenantName[0].toUpperCase() : '?';
}

class _InitialCircle extends StatelessWidget {
  final String initial;
  final Color color;

  const _InitialCircle({required this.initial, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 28,
      height: 28,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Text(
          initial,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 13,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}
