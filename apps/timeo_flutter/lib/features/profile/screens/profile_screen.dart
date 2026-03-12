import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/providers/user_provider.dart';
import '../../../core/providers/tenant_provider.dart';
import '../../../core/providers/membership_provider.dart';
import '../../../core/theme/app_theme.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final userAsync = ref.watch(userProfileProvider);
    final tenantId = ref.watch(activeTenantIdProvider);
    final membershipAsync = tenantId != null
        ? ref.watch(membershipProvider(tenantId))
        : const AsyncValue<MembershipData?>.data(null);

    final memberName = userAsync.whenOrNull(data: (u) => u?.name) ??
        authState.memberName ??
        'Member';
    final email = userAsync.whenOrNull(data: (u) => u?.email) ?? '';
    final avatarUrl = userAsync.whenOrNull(data: (u) => u?.avatarUrl);
    final membershipBadge = membershipAsync.whenOrNull(
          data: (m) => m?.planName,
        ) ??
        'Standard Customer';
    const appVersion = '1.0.0';

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── App bar header ──
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'ACCOUNT',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                        letterSpacing: 1.0,
                      ),
                    ),
                    IconButton(
                      onPressed: () => _showSignOutDialog(context, ref),
                      icon: const Icon(Icons.logout_rounded,
                          color: AppTheme.onSurfaceMuted),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // ── Profile header card ──
              Container(
                width: double.infinity,
                margin: const EdgeInsets.symmetric(horizontal: 20),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppTheme.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.surfaceVariant),
                ),
                child: Column(
                  children: [
                    // Avatar with camera button
                    Stack(
                      children: [
                        Container(
                          width: 96,
                          height: 96,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppTheme.surfaceVariant,
                            border: Border.all(
                              color: AppTheme.primary.withValues(alpha: 0.4),
                              width: 2,
                            ),
                          ),
                          child: ClipOval(
                            child: _buildAvatar(memberName, avatarUrl),
                          ),
                        ),
                        Positioned(
                          bottom: 0,
                          right: 0,
                          child: GestureDetector(
                            onTap: () {
                              // TODO: pick profile photo
                            },
                            child: Container(
                              width: 30,
                              height: 30,
                              decoration: BoxDecoration(
                                color: AppTheme.primary,
                                shape: BoxShape.circle,
                                border: Border.all(
                                    color: AppTheme.background, width: 2),
                              ),
                              child: const Icon(Icons.camera_alt_rounded,
                                  color: Colors.white, size: 14),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Name
                    Text(
                      memberName,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 6),

                    // Membership badge pill
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                            color: AppTheme.primary.withValues(alpha: 0.3)),
                      ),
                      child: Text(
                        membershipBadge,
                        style: const TextStyle(
                          color: AppTheme.primary,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Email
                    Text(
                      email,
                      style: const TextStyle(
                        color: AppTheme.onSurfaceMuted,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 28),

              // ── ACCOUNT section ──
              _SectionLabel(label: 'ACCOUNT'),
              const SizedBox(height: 8),
              _MenuTile(
                icon: Icons.person_outline_rounded,
                iconColor: AppTheme.primary,
                label: 'Edit Profile',
                onTap: () => context.push('/edit-profile'),
              ),
              _MenuTile(
                icon: Icons.card_membership_rounded,
                iconColor: const Color(0xFF7C3AED),
                label: 'My Subscription',
                onTap: () => context.go('/membership'),
              ),
              _MenuTile(
                icon: Icons.receipt_long_rounded,
                iconColor: const Color(0xFF059669),
                label: 'Order History',
                onTap: () => context.push('/order-history'),
              ),
              _MenuTile(
                icon: Icons.lock_outline_rounded,
                iconColor: AppTheme.warning,
                label: 'Change Password',
                onTap: () => context.push('/change-password'),
              ),
              const SizedBox(height: 24),

              // ── OTHERS section ──
              _SectionLabel(label: 'OTHERS'),
              const SizedBox(height: 8),
              _MenuTile(
                icon: Icons.description_outlined,
                iconColor: AppTheme.onSurfaceMuted,
                label: 'Terms & Conditions',
                onTap: () => _launchUrl('https://timeo.my/terms'),
              ),
              _MenuTile(
                icon: Icons.privacy_tip_outlined,
                iconColor: AppTheme.onSurfaceMuted,
                label: 'Privacy Policy',
                onTap: () => _launchUrl('https://timeo.my/privacy'),
              ),
              _MenuTile(
                icon: Icons.money_off_rounded,
                iconColor: AppTheme.error,
                label: 'Refund Policy',
                subtitle: 'All purchases are non-refundable',
                onTap: () {
                  // No navigation — just info
                },
                showChevron: false,
              ),
              _MenuTile(
                icon: Icons.help_outline_rounded,
                iconColor: AppTheme.onSurfaceMuted,
                label: 'FAQ',
                onTap: () => _launchUrl('https://timeo.my/'),
              ),
              const SizedBox(height: 20),

              // ── App version ──
              Center(
                child: Text(
                  'App Version $appVersion',
                  style: const TextStyle(
                    color: AppTheme.onSurfaceMuted,
                    fontSize: 12,
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // ── Sign Out ──
              Center(
                child: TextButton.icon(
                  onPressed: () => _showSignOutDialog(context, ref),
                  icon: const Icon(Icons.logout_rounded,
                      color: AppTheme.error, size: 18),
                  label: const Text(
                    'Sign Out',
                    style: TextStyle(
                      color: AppTheme.error,
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 80),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAvatar(String name, String? avatarUrl) {
    final initials = name
        .split(' ')
        .take(2)
        .map((w) => w.isNotEmpty ? w[0].toUpperCase() : '')
        .join();

    // Use selected Doodle avatar if available, otherwise fall back to initials avatar
    final imageUrl = avatarUrl ??
        'https://api.dicebear.com/7.x/initials/png?seed=${Uri.encodeComponent(name)}&size=96';

    return Image.network(
      imageUrl,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => Center(
        child: Text(
          initials,
          style: const TextStyle(
            fontSize: 32,
            fontWeight: FontWeight.w700,
            color: AppTheme.primary,
          ),
        ),
      ),
    );
  }

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _showSignOutDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.surface,
        title: const Text('Sign Out', style: TextStyle(color: Colors.white)),
        content: const Text('Are you sure you want to sign out?',
            style: TextStyle(color: AppTheme.onSurfaceMuted)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel',
                style: TextStyle(color: AppTheme.onSurfaceMuted)),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              ref.read(authProvider.notifier).signOut();
              context.go('/sign-in');
            },
            child: const Text('Sign Out',
                style: TextStyle(color: AppTheme.error)),
          ),
        ],
      ),
    );
  }
}

// ── Section label ──
class _SectionLabel extends StatelessWidget {
  final String label;
  const _SectionLabel({required this.label});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: AppTheme.primary,
          letterSpacing: 1.2,
        ),
      ),
    );
  }
}

// ── Menu tile ──
class _MenuTile extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String label;
  final String? subtitle;
  final VoidCallback onTap;
  final bool showChevron;

  const _MenuTile({
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.onTap,
    this.subtitle,
    this.showChevron = true,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: iconColor, size: 18),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      subtitle!,
                      style: const TextStyle(
                        color: AppTheme.onSurfaceMuted,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            if (showChevron)
              const Icon(Icons.chevron_right_rounded,
                  color: AppTheme.onSurfaceMuted, size: 20),
          ],
        ),
      ),
    );
  }
}
