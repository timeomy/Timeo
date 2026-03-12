import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';

class AdminCheckinsScreen extends ConsumerWidget {
  const AdminCheckinsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.background,
        title: const Text(
          'Check-ins',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: AppTheme.onSurface,
          ),
        ),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.fact_check_outlined,
                  color: AppTheme.onSurfaceMuted.withValues(alpha: 0.4),
                  size: 64),
              const SizedBox(height: 16),
              const Text(
                'No check-ins yet',
                style: TextStyle(
                  color: AppTheme.onSurface,
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Check-in data will appear here once members start checking in.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: AppTheme.onSurfaceMuted,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
