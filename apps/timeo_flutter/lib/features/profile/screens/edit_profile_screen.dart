import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/providers/api_client_provider.dart';
import '../../../core/providers/user_provider.dart';
import '../../../core/theme/app_theme.dart';

class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  bool _loading = false;
  bool _prefilled = false;
  String? _currentAvatarUrl;

  File? _pickedImage;
  final ImagePicker _picker = ImagePicker();

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  void _prefillIfNeeded(AsyncValue<UserProfile?> userAsync) {
    if (_prefilled) return;
    userAsync.whenData((user) {
      if (user != null) {
        _nameController.text = user.name;
        _currentAvatarUrl = user.avatarUrl;
        _prefilled = true;
      }
    });
  }

  Future<void> _pickImage(ImageSource source) async {
    Navigator.of(context).pop(); // close bottom sheet
    final XFile? picked = await _picker.pickImage(
      source: source,
      maxWidth: 800,
      maxHeight: 800,
      imageQuality: 85,
    );
    if (picked != null) {
      setState(() => _pickedImage = File(picked.path));
    }
  }

  void _showImagePickerSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Update Profile Photo',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 20),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.camera_alt_rounded,
                      color: AppTheme.primary),
                ),
                title: const Text('Take Photo 📷',
                    style: TextStyle(color: Colors.white)),
                subtitle: const Text('Use your camera',
                    style: TextStyle(color: AppTheme.onSurfaceMuted, fontSize: 12)),
                onTap: () => _pickImage(ImageSource.camera),
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.photo_library_rounded,
                      color: AppTheme.primary),
                ),
                title: const Text('Choose from Gallery 🖼️',
                    style: TextStyle(color: Colors.white)),
                subtitle: const Text('Pick an existing photo',
                    style: TextStyle(color: AppTheme.onSurfaceMuted, fontSize: 12)),
                onTap: () => _pickImage(ImageSource.gallery),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<String?> _uploadPhoto(String userId) async {
    if (_pickedImage == null) return null;

    const storage = FlutterSecureStorage();
    final token = await storage.read(key: 'session_token') ?? '';

    final formData = FormData.fromMap({
      'avatar': await MultipartFile.fromFile(
        _pickedImage!.path,
        filename: '$userId.jpg',
        contentType: DioMediaType('image', 'jpeg'),
      ),
    });

    final dio = Dio(BaseOptions(baseUrl: 'https://api.timeo.my'));
    dio.options.headers['Authorization'] = 'Bearer $token';

    final response = await dio.post('/api/users/me/avatar', data: formData);
    final data = response.data as Map<String, dynamic>;
    final inner = data['data'] as Map<String, dynamic>? ?? {};
    return inner['avatar_url'] as String?;
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);

    try {
      final userAsync = ref.read(userProfileProvider);
      final user = userAsync.valueOrNull;

      // Upload photo first if changed
      String? newAvatarUrl;
      if (_pickedImage != null && user != null) {
        newAvatarUrl = await _uploadPhoto(user.id);
      }

      // Update profile fields
      final api = ref.read(apiClientProvider);
      await api.patch('/api/users/me', data: {
        'name': _nameController.text.trim(),
        'phone': _phoneController.text.trim(),
        if (newAvatarUrl != null) 'avatar_url': newAvatarUrl,
      });

      ref.invalidate(userProfileProvider);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profile updated successfully'),
            backgroundColor: AppTheme.success,
          ),
        );
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update profile: $e'),
            backgroundColor: AppTheme.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final userAsync = ref.watch(userProfileProvider);
    _prefillIfNeeded(userAsync);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.background,
        elevation: 0,
        title: const Text(
          'Edit Profile',
          style: TextStyle(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.w700,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // ── Profile Photo ──
              GestureDetector(
                onTap: _showImagePickerSheet,
                child: Stack(
                  children: [
                    Container(
                      width: 120,
                      height: 120,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: AppTheme.primary.withValues(alpha: 0.5),
                          width: 3,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: AppTheme.primary.withValues(alpha: 0.2),
                            blurRadius: 12,
                            spreadRadius: 2,
                          ),
                        ],
                      ),
                      child: ClipOval(
                        child: _buildAvatarContent(),
                      ),
                    ),
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppTheme.primary,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: AppTheme.background,
                            width: 3,
                          ),
                        ),
                        child: const Icon(
                          Icons.camera_alt_rounded,
                          color: Colors.white,
                          size: 18,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                'Tap to change photo',
                style: TextStyle(
                  color: AppTheme.onSurfaceMuted,
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 16),

              // ── Warning note ──
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.amber.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: Colors.amber.withValues(alpha: 0.3),
                  ),
                ),
                child: const Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('⚠️', style: TextStyle(fontSize: 16)),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Your photo is used for facial recognition at the gym entrance. Please use a clear front-facing photo.',
                        style: TextStyle(
                          color: Colors.amber,
                          fontSize: 12.5,
                          height: 1.4,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 28),

              // ── Name field ──
              const Align(
                alignment: Alignment.centerLeft,
                child: _FieldLabel('Full Name'),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _nameController,
                style: const TextStyle(color: Colors.white),
                decoration: _inputDecoration('Enter your full name'),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Name is required' : null,
              ),
              const SizedBox(height: 20),

              // ── Phone field ──
              const Align(
                alignment: Alignment.centerLeft,
                child: _FieldLabel('Phone Number'),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _phoneController,
                style: const TextStyle(color: Colors.white),
                keyboardType: TextInputType.phone,
                decoration: _inputDecoration('Enter your phone number'),
              ),
              const SizedBox(height: 20),

              // ── Email field (read-only) ──
              const Align(
                alignment: Alignment.centerLeft,
                child: _FieldLabel('Email'),
              ),
              const SizedBox(height: 8),
              userAsync.when(
                data: (user) => TextFormField(
                  initialValue: user?.email ?? '',
                  style: const TextStyle(color: Colors.white54),
                  readOnly: true,
                  decoration: _inputDecoration('Email').copyWith(
                    fillColor: AppTheme.surface.withValues(alpha: 0.5),
                  ),
                ),
                loading: () => const SizedBox.shrink(),
                error: (_, __) => const SizedBox.shrink(),
              ),
              const SizedBox(height: 32),

              // ── Save button ──
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _loading ? null : _save,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _loading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text(
                          'Save Changes',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
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

  Widget _buildAvatarContent() {
    if (_pickedImage != null) {
      return Image.file(
        _pickedImage!,
        width: 120,
        height: 120,
        fit: BoxFit.cover,
      );
    }
    if (_currentAvatarUrl != null && _currentAvatarUrl!.isNotEmpty) {
      return Image.network(
        _currentAvatarUrl!,
        width: 120,
        height: 120,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => _placeholderAvatar(),
      );
    }
    return _placeholderAvatar();
  }

  Widget _placeholderAvatar() {
    return Container(
      width: 120,
      height: 120,
      color: AppTheme.surfaceVariant,
      child: const Icon(
        Icons.person_rounded,
        color: Colors.white38,
        size: 56,
      ),
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
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
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppTheme.error),
      ),
      contentPadding:
          const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  final String text;
  const _FieldLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        color: AppTheme.onSurfaceMuted,
        fontSize: 13,
        fontWeight: FontWeight.w500,
      ),
    );
  }
}
