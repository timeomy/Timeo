import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class LogSessionScreen extends StatefulWidget {
  const LogSessionScreen({super.key});

  @override
  State<LogSessionScreen> createState() => _LogSessionScreenState();
}

class _LogSessionScreenState extends State<LogSessionScreen> {
  final _formKey = GlobalKey<FormState>();
  final _clientController = TextEditingController();
  final _notesController = TextEditingController();
  String _selectedType = 'Strength Training';
  int _durationMinutes = 45;

  static const _sessionTypes = [
    'Strength Training',
    'HIIT',
    'Cardio',
    'Yoga',
    'Mobility',
    'Sport-Specific',
    'Other',
  ];

  @override
  void dispose() {
    _clientController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  void _submit() {
    if (_formKey.currentState?.validate() ?? false) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Session logged successfully!'),
          backgroundColor: Color(0xFF22C55E),
        ),
      );
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.background,
        title: const Text(
          'Log Session',
          style: TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Client name
              const Text(
                'CLIENT NAME',
                style: TextStyle(
                  color: AppTheme.onSurfaceMuted,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _clientController,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  hintText: 'Enter client name',
                  hintStyle: const TextStyle(color: AppTheme.onSurfaceMuted),
                  filled: true,
                  fillColor: AppTheme.surface,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppTheme.surfaceVariant),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppTheme.surfaceVariant),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppTheme.primary),
                  ),
                ),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Client name required' : null,
              ),

              const SizedBox(height: 20),

              // Session type
              const Text(
                'SESSION TYPE',
                style: TextStyle(
                  color: AppTheme.onSurfaceMuted,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: AppTheme.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.surfaceVariant),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedType,
                    dropdownColor: AppTheme.surface,
                    style: const TextStyle(color: Colors.white, fontSize: 14),
                    isExpanded: true,
                    items: _sessionTypes
                        .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                        .toList(),
                    onChanged: (v) => setState(() => _selectedType = v!),
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // Duration
              const Text(
                'DURATION (MINUTES)',
                style: TextStyle(
                  color: AppTheme.onSurfaceMuted,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  IconButton(
                    onPressed: () {
                      if (_durationMinutes > 15) {
                        setState(() => _durationMinutes -= 15);
                      }
                    },
                    icon: const Icon(Icons.remove_circle_outline,
                        color: AppTheme.primary),
                  ),
                  Expanded(
                    child: Center(
                      child: Text(
                        '$_durationMinutes min',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () {
                      if (_durationMinutes < 180) {
                        setState(() => _durationMinutes += 15);
                      }
                    },
                    icon: const Icon(Icons.add_circle_outline,
                        color: AppTheme.primary),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // Notes
              const Text(
                'SESSION NOTES',
                style: TextStyle(
                  color: AppTheme.onSurfaceMuted,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _notesController,
                style: const TextStyle(color: Colors.white),
                maxLines: 4,
                decoration: InputDecoration(
                  hintText: 'Notes about the session...',
                  hintStyle: const TextStyle(color: AppTheme.onSurfaceMuted),
                  filled: true,
                  fillColor: AppTheme.surface,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppTheme.surfaceVariant),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppTheme.surfaceVariant),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppTheme.primary),
                  ),
                ),
              ),

              const SizedBox(height: 32),

              // Submit button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: const Text(
                    'Log Session',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }
}
