import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class MyClientsScreen extends StatelessWidget {
  const MyClientsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.background,
        title: const Text(
          'My Clients',
          style: TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.people_outline_rounded,
              size: 64,
              color: AppTheme.onSurfaceMuted.withValues(alpha: 0.4),
            ),
            const SizedBox(height: 16),
            const Text(
              'No clients assigned yet',
              style: TextStyle(
                color: AppTheme.onSurfaceMuted,
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Your assigned clients will appear here.',
              style: TextStyle(
                color: AppTheme.onSurfaceMuted,
                fontSize: 13,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
