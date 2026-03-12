import 'dart:async';
import 'dart:io' show Platform;
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/providers/api_client_provider.dart';
import '../../../core/providers/tenant_provider.dart';
import '../../../core/theme/app_theme.dart';

class QrScreen extends ConsumerStatefulWidget {
  const QrScreen({super.key});

  @override
  ConsumerState<QrScreen> createState() => _QrScreenState();
}

class _QrScreenState extends ConsumerState<QrScreen> {
  String? _qrData;
  String? _errorMessage;
  int _countdown = 30;
  Timer? _refreshTimer;
  Timer? _countdownTimer;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchToken();
    _startCountdown();
  }

  Future<void> _fetchToken() async {
    final tenantId = ref.read(activeTenantIdProvider);
    if (tenantId == null) {
      setState(() {
        _errorMessage = 'No active gym selected';
        _isLoading = false;
      });
      return;
    }

    try {
      final api = ref.read(apiClientProvider);
      final response = await api.get(
        '/api/gate/qr-token',
        params: {'tenantId': tenantId},
      );
      final data = response.data as Map<String, dynamic>;
      final payload = data['data'] as Map<String, dynamic>;
      final token = payload['token'] as String;
      final expiresAt = payload['expiresAt'] as int;

      if (!mounted) return;

      final msLeft = expiresAt - DateTime.now().millisecondsSinceEpoch;
      final secondsLeft = (msLeft / 1000).ceil().clamp(1, 30);

      setState(() {
        _qrData = token;
        _countdown = secondsLeft;
        _errorMessage = null;
        _isLoading = false;
      });

      // Schedule next fetch when this token expires
      _refreshTimer?.cancel();
      _refreshTimer = Timer(Duration(seconds: secondsLeft), _fetchToken);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'Failed to generate QR. Retrying...';
        _isLoading = false;
      });
      // Retry in 5s on error
      _refreshTimer?.cancel();
      _refreshTimer = Timer(const Duration(seconds: 5), _fetchToken);
    }
  }

  void _startCountdown() {
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() {
        if (_countdown > 0) _countdown--;
      });
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _countdownTimer?.cancel();
    super.dispose();
  }

  Future<void> _addToAppleWallet() async {
    final tenantId = ref.read(activeTenantIdProvider);
    if (tenantId == null) return;
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.get(
        '/api/wallet/apple-pass',
        params: {'tenantId': tenantId},
      );
      final data = response.data as Map<String, dynamic>;
      // TODO: Once Apple signing is configured, this will return a .pkpass file
      // For now show a message
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Apple Wallet pass will be available soon!'),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Apple Wallet not yet configured'),
        ),
      );
    }
  }

  Future<void> _addToGoogleWallet() async {
    final tenantId = ref.read(activeTenantIdProvider);
    if (tenantId == null) return;
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.get(
        '/api/wallet/google-pass-url',
        params: {'tenantId': tenantId},
      );
      final data = response.data as Map<String, dynamic>;
      final payload = data['data'] as Map<String, dynamic>;
      final saveUrl = payload['saveUrl'] as String?;
      if (saveUrl != null && saveUrl.contains('SIGNED_JWT_HERE') == false) {
        final uri = Uri.parse(saveUrl);
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
          return;
        }
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Google Wallet pass will be available soon!'),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Google Wallet not yet configured'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final memberId = authState.memberId ?? 'unknown';
    final memberName = authState.memberName ?? 'Member';
    const role = 'Member';

    final displayId = memberId.length >= 8
        ? memberId.substring(memberId.length - 8).toUpperCase()
        : memberId.toUpperCase();

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: Column(
              children: [
                // ── Header ──
                const Text(
                  'YOUR MEMBER ID',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                    letterSpacing: 1.5,
                  ),
                ),
                const SizedBox(height: 12),

                // ── Role badge ──
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: AppTheme.primary.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.shield_rounded,
                          color: AppTheme.primary, size: 14),
                      const SizedBox(width: 6),
                      Text(
                        role,
                        style: const TextStyle(
                          color: AppTheme.primary,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // ── Member name ──
                Text(
                  memberName.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 8),

                // ── Member ID hex ──
                Text(
                  displayId,
                  style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w900,
                    color: AppTheme.primary,
                    fontFamily: 'monospace',
                    letterSpacing: 4,
                  ),
                ),
                const SizedBox(height: 28),

                // ── QR Code card ──
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: AppTheme.primary.withValues(alpha: 0.2),
                        blurRadius: 40,
                        spreadRadius: 4,
                      ),
                    ],
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          width: 280,
                          height: 280,
                          child: Center(
                            child: CircularProgressIndicator(),
                          ),
                        )
                      : _qrData != null
                          ? QrImageView(
                              data: _qrData!,
                              version: QrVersions.auto,
                              size: 280,
                              backgroundColor: Colors.white,
                              eyeStyle: const QrEyeStyle(
                                eyeShape: QrEyeShape.square,
                                color: Color(0xFF0B0B0F),
                              ),
                              dataModuleStyle: const QrDataModuleStyle(
                                dataModuleShape: QrDataModuleShape.square,
                                color: Color(0xFF0B0B0F),
                              ),
                            )
                          : SizedBox(
                              width: 280,
                              height: 280,
                              child: Center(
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(
                                      Icons.error_outline,
                                      color: Colors.red,
                                      size: 48,
                                    ),
                                    const SizedBox(height: 12),
                                    Text(
                                      _errorMessage ?? 'Unable to load QR',
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(
                                        color: Colors.black54,
                                        fontSize: 14,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                ),
                const SizedBox(height: 24),

                // ── Countdown indicator ──
                SizedBox(
                  width: 48,
                  height: 48,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      CircularProgressIndicator(
                        value: _countdown / 30,
                        strokeWidth: 3,
                        backgroundColor: AppTheme.surfaceVariant,
                        valueColor: AlwaysStoppedAnimation<Color>(
                          _countdown <= 5
                              ? AppTheme.warning
                              : AppTheme.primary,
                        ),
                      ),
                      Text(
                        '$_countdown',
                        style: TextStyle(
                          color: _countdown <= 5
                              ? AppTheme.warning
                              : Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // ── Footer info ──
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.shield_rounded,
                        color: AppTheme.primary.withValues(alpha: 0.6),
                        size: 14),
                    const SizedBox(width: 6),
                    Text(
                      'Secure Dynamic ID • Refreshes every 30s',
                      style: TextStyle(
                        color: AppTheme.onSurfaceMuted,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                const Text(
                  'Show this QR code at the gym entrance for quick access',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: AppTheme.onSurfaceMuted,
                    fontSize: 12,
                  ),
                ),

                // ── Wallet Buttons ──
                if (Platform.isIOS) ...[
                  const SizedBox(height: 24),
                  OutlinedButton.icon(
                    onPressed: _addToAppleWallet,
                    icon: const Icon(Icons.wallet, color: Colors.white),
                    label: const Text(
                      'Add to Apple Wallet',
                      style: TextStyle(color: Colors.white),
                    ),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.white30),
                      minimumSize: const Size(200, 48),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(24),
                      ),
                    ),
                  ),
                ] else ...[
                  const SizedBox(height: 24),
                  OutlinedButton.icon(
                    onPressed: _addToGoogleWallet,
                    icon: const Icon(
                      Icons.account_balance_wallet,
                      color: Colors.white,
                    ),
                    label: const Text(
                      'Save to Google Wallet',
                      style: TextStyle(color: Colors.white),
                    ),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.white30),
                      minimumSize: const Size(200, 48),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(24),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
