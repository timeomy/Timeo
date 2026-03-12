import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/theme/app_theme.dart';

enum PaymentMethod { bankTransfer, cash, creditCard }

class PaymentScreen extends ConsumerStatefulWidget {
  final String planName;
  final double amount;
  final String currency;

  const PaymentScreen({
    super.key,
    this.planName = 'Membership Plan',
    this.amount = 0.0,
    this.currency = 'RM',
  });

  @override
  ConsumerState<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends ConsumerState<PaymentScreen> {
  PaymentMethod? _selectedMethod;
  final _formKey = GlobalKey<FormState>();
  final _payerNameController = TextEditingController();
  final _remarksController = TextEditingController();
  final _promoCodeController = TextEditingController();
  DateTime _paymentDate = DateTime.now();
  XFile? _receiptImage;
  bool _submitting = false;

  // Promo
  double _promoAmount = 0.0;
  bool _promoApplied = false;

  // Consent
  bool _agreedPrivacy = false;
  bool _agreedTerms = false;
  bool _agreedRefund = false;

  double get _grandTotal => widget.amount - _promoAmount;
  bool get _canSubmit => _agreedPrivacy && _agreedTerms && _agreedRefund;

  @override
  void dispose() {
    _payerNameController.dispose();
    _remarksController.dispose();
    _promoCodeController.dispose();
    super.dispose();
  }

  void _applyPromo() {
    final code = _promoCodeController.text.trim().toUpperCase();
    // TODO: validate promo code via API
    if (code == 'TIMEO10') {
      setState(() {
        _promoAmount = widget.amount * 0.1;
        _promoApplied = true;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Promo code applied! 10% discount'),
          backgroundColor: AppTheme.success,
        ),
      );
    } else if (code.isNotEmpty) {
      setState(() {
        _promoAmount = 0.0;
        _promoApplied = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Invalid promo code'),
          backgroundColor: AppTheme.error,
        ),
      );
    }
  }

  Future<void> _pickReceiptImage() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1200,
      imageQuality: 85,
    );
    if (picked != null) {
      setState(() => _receiptImage = picked);
    }
  }

  Future<void> _pickDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _paymentDate,
      firstDate: DateTime.now().subtract(const Duration(days: 30)),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.dark(
              primary: AppTheme.primary,
              surface: AppTheme.surface,
            ),
          ),
          child: child!,
        );
      },
    );
    if (date != null) {
      setState(() => _paymentDate = date);
    }
  }

  void _submit() {
    if (_selectedMethod == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a payment method')),
      );
      return;
    }
    if (!_formKey.currentState!.validate()) return;

    setState(() => _submitting = true);
    // TODO: submit payment to API
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() => _submitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Payment submitted for verification!'),
            backgroundColor: AppTheme.success,
          ),
        );
        Navigator.of(context).pop();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.background,
        title: const Text(
          'COMPLETE YOUR PAYMENT',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.8,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Plan summary ──
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.surfaceVariant),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.planName,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Selected plan',
                          style: TextStyle(
                            color: AppTheme.onSurfaceMuted,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                    Text(
                      '${widget.currency} ${widget.amount.toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        color: AppTheme.warning,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // ── Promo Code ──
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _promoCodeController,
                      style: const TextStyle(color: Colors.white),
                      textCapitalization: TextCapitalization.characters,
                      decoration: InputDecoration(
                        hintText: 'Promo Code',
                        hintStyle:
                            const TextStyle(color: AppTheme.onSurfaceMuted),
                        prefixIcon: const Icon(
                          Icons.local_offer_outlined,
                          color: AppTheme.onSurfaceMuted,
                          size: 20,
                        ),
                        suffixIcon: _promoApplied
                            ? const Icon(Icons.check_circle_rounded,
                                color: AppTheme.success, size: 20)
                            : null,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: _applyPromo,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primary,
                      minimumSize: const Size(80, 52),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text('Apply'),
                  ),
                ],
              ),
              const SizedBox(height: 28),

              // ── Step 1: Payment Method ──
              _SectionHeader(step: 1, title: 'Select Payment Method'),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _MethodCard(
                      icon: Icons.qr_code_rounded,
                      label: 'Bank\nTransfer',
                      selected: _selectedMethod == PaymentMethod.bankTransfer,
                      onTap: () => setState(
                          () => _selectedMethod = PaymentMethod.bankTransfer),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _MethodCard(
                      icon: Icons.payments_rounded,
                      label: 'Cash',
                      selected: _selectedMethod == PaymentMethod.cash,
                      onTap: () => setState(
                          () => _selectedMethod = PaymentMethod.cash),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _MethodCard(
                      icon: Icons.credit_card_rounded,
                      label: 'Credit\nCard',
                      selected: _selectedMethod == PaymentMethod.creditCard,
                      onTap: () => setState(
                          () => _selectedMethod = PaymentMethod.creditCard),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // ── Cost Breakdown (shown after method selected) ──
              if (_selectedMethod != null) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.surfaceVariant),
                  ),
                  child: Column(
                    children: [
                      _CostRow(
                        label: 'Sub Total',
                        value:
                            '${widget.currency} ${widget.amount.toStringAsFixed(2)}',
                      ),
                      const SizedBox(height: 8),
                      _CostRow(
                        label: 'Tax (0%)',
                        value: '${widget.currency} 0.00',
                      ),
                      const SizedBox(height: 8),
                      _CostRow(
                        label: 'Promo',
                        value: _promoAmount > 0
                            ? '- ${widget.currency} ${_promoAmount.toStringAsFixed(2)}'
                            : '- ${widget.currency} 0.00',
                        valueColor: _promoAmount > 0
                            ? AppTheme.success
                            : AppTheme.onSurfaceMuted,
                      ),
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 10),
                        child: Divider(color: AppTheme.surfaceVariant),
                      ),
                      _CostRow(
                        label: 'Grand Total',
                        value:
                            '${widget.currency} ${_grandTotal.toStringAsFixed(2)}',
                        bold: true,
                        large: true,
                        valueColor: AppTheme.warning,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
              ],

              // ── Step 2: DuitNow QR (shown when Bank Transfer) ──
              if (_selectedMethod == PaymentMethod.bankTransfer) ...[
                _SectionHeader(step: 2, title: 'Scan & Pay via DuitNow'),
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppTheme.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppTheme.surfaceVariant),
                  ),
                  child: Column(
                    children: [
                      Container(
                        width: 200,
                        height: 200,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Center(
                          child: Icon(Icons.qr_code_2_rounded,
                              size: 120, color: Colors.black87),
                        ),
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'Scan DuitNow QR to pay',
                        style: TextStyle(
                          color: AppTheme.onSurfaceMuted,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.surfaceVariant),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Or transfer manually:',
                        style: TextStyle(
                          color: AppTheme.onSurfaceMuted,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 12),
                      _BankDetailRow(label: 'Bank', value: 'Maybank'),
                      const SizedBox(height: 8),
                      _BankDetailRow(
                        label: 'Account No.',
                        value: '1234 5678 9012',
                        copyable: true,
                      ),
                      const SizedBox(height: 8),
                      _BankDetailRow(
                          label: 'Recipient', value: 'Timeo Fitness Sdn Bhd'),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
              ],

              // ── Step 3: Payment Details ──
              _SectionHeader(
                step: _selectedMethod == PaymentMethod.bankTransfer ? 3 : 2,
                title: 'Payment Details',
              ),
              const SizedBox(height: 12),

              // Payer name
              TextFormField(
                controller: _payerNameController,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Payer Name',
                  labelStyle: TextStyle(color: AppTheme.onSurfaceMuted),
                  prefixIcon:
                      Icon(Icons.person_outline, color: AppTheme.onSurfaceMuted),
                ),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Required' : null,
              ),
              const SizedBox(height: 14),

              // Payment date
              GestureDetector(
                onTap: _pickDate,
                child: AbsorbPointer(
                  child: TextFormField(
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: 'Payment Date',
                      labelStyle:
                          const TextStyle(color: AppTheme.onSurfaceMuted),
                      prefixIcon: const Icon(Icons.calendar_today_rounded,
                          color: AppTheme.onSurfaceMuted),
                      hintText: DateFormat('dd MMM yyyy').format(_paymentDate),
                      hintStyle: const TextStyle(color: Colors.white),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 14),

              // Receipt image upload
              GestureDetector(
                onTap: _pickReceiptImage,
                child: Container(
                  width: double.infinity,
                  height: 120,
                  decoration: BoxDecoration(
                    color: AppTheme.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: AppTheme.surfaceVariant,
                      style: BorderStyle.solid,
                    ),
                  ),
                  child: _receiptImage != null
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Stack(
                            fit: StackFit.expand,
                            children: [
                              const Icon(Icons.image_rounded,
                                  color: AppTheme.primary, size: 40),
                              Positioned(
                                bottom: 8,
                                left: 0,
                                right: 0,
                                child: Center(
                                  child: Text(
                                    _receiptImage!.name,
                                    style: const TextStyle(
                                      color: AppTheme.onSurfaceMuted,
                                      fontSize: 11,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        )
                      : Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: const [
                            Icon(Icons.cloud_upload_outlined,
                                color: AppTheme.onSurfaceMuted, size: 32),
                            SizedBox(height: 8),
                            Text(
                              'Tap to upload receipt image',
                              style: TextStyle(
                                color: AppTheme.onSurfaceMuted,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                ),
              ),
              const SizedBox(height: 14),

              // Remarks
              TextFormField(
                controller: _remarksController,
                style: const TextStyle(color: Colors.white),
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Remarks / Notes (optional)',
                  labelStyle: TextStyle(color: AppTheme.onSurfaceMuted),
                  prefixIcon:
                      Icon(Icons.notes_rounded, color: AppTheme.onSurfaceMuted),
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: 28),

              // ── Consent checkboxes ──
              const Text(
                'AGREEMENTS',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.onSurfaceMuted,
                  letterSpacing: 1.0,
                ),
              ),
              const SizedBox(height: 12),
              _ConsentCheckbox(
                text: 'I have read and agree to the ',
                linkText: 'Privacy Policy',
                url: 'https://timeo.my/privacy',
                value: _agreedPrivacy,
                onChanged: (v) => setState(() => _agreedPrivacy = v ?? false),
              ),
              const SizedBox(height: 10),
              _ConsentCheckbox(
                text: 'I agree to the ',
                linkText: 'Terms & Conditions',
                url: 'https://timeo.my/terms',
                value: _agreedTerms,
                onChanged: (v) => setState(() => _agreedTerms = v ?? false),
              ),
              const SizedBox(height: 10),
              _ConsentCheckbox(
                text: 'I understand the ',
                linkText: 'Refund Policy',
                url: 'https://timeo.my/refund',
                suffixText: ' (all sales are final)',
                value: _agreedRefund,
                onChanged: (v) => setState(() => _agreedRefund = v ?? false),
              ),
              const SizedBox(height: 24),

              // ── Buttons ──
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AppTheme.surfaceVariant),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text(
                        'Cancel',
                        style: TextStyle(
                          color: AppTheme.onSurfaceMuted,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton(
                      onPressed: (_submitting || !_canSubmit) ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primary,
                        disabledBackgroundColor:
                            AppTheme.primary.withValues(alpha: 0.4),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: _submitting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Text(
                              'Submit for Verification',
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 14,
                              ),
                            ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Section header ──
class _SectionHeader extends StatelessWidget {
  final int step;
  final String title;
  const _SectionHeader({required this.step, required this.title});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 28,
          height: 28,
          decoration: const BoxDecoration(
            color: AppTheme.primary,
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(
              '$step',
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: 13,
              ),
            ),
          ),
        ),
        const SizedBox(width: 10),
        Text(
          'Step $step: $title',
          style: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: Colors.white,
          ),
        ),
      ],
    );
  }
}

// ── Payment method card ──
class _MethodCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _MethodCard({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? AppTheme.primary : AppTheme.surfaceVariant,
            width: selected ? 2 : 1,
          ),
        ),
        child: Column(
          children: [
            Icon(icon,
                color: selected ? AppTheme.primary : AppTheme.onSurfaceMuted,
                size: 28),
            const SizedBox(height: 8),
            Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: selected ? Colors.white : AppTheme.onSurfaceMuted,
                fontSize: 11,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Bank detail row ──
class _BankDetailRow extends StatelessWidget {
  final String label;
  final String value;
  final bool copyable;

  const _BankDetailRow({
    required this.label,
    required this.value,
    this.copyable = false,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: AppTheme.onSurfaceMuted,
            fontSize: 12,
          ),
        ),
        Row(
          children: [
            Text(
              value,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
            if (copyable) ...[
              const SizedBox(width: 8),
              GestureDetector(
                onTap: () {
                  Clipboard.setData(
                      ClipboardData(text: value.replaceAll(' ', '')));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Account number copied'),
                      duration: Duration(seconds: 1),
                    ),
                  );
                },
                child: const Icon(Icons.copy_rounded,
                    color: AppTheme.primary, size: 16),
              ),
            ],
          ],
        ),
      ],
    );
  }
}

// ── Cost row ──
class _CostRow extends StatelessWidget {
  final String label;
  final String value;
  final bool bold;
  final bool large;
  final Color? valueColor;

  const _CostRow({
    required this.label,
    required this.value,
    this.bold = false,
    this.large = false,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            color: bold ? Colors.white : AppTheme.onSurfaceMuted,
            fontSize: large ? 15 : 13,
            fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            color: valueColor ?? (bold ? Colors.white : AppTheme.onSurfaceMuted),
            fontSize: large ? 15 : 13,
            fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

// ── Consent checkbox ──
class _ConsentCheckbox extends StatelessWidget {
  final String text;
  final String linkText;
  final String url;
  final String? suffixText;
  final bool value;
  final ValueChanged<bool?> onChanged;

  const _ConsentCheckbox({
    required this.text,
    required this.linkText,
    required this.url,
    required this.value,
    required this.onChanged,
    this.suffixText,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 24,
          height: 24,
          child: Checkbox(
            value: value,
            onChanged: onChanged,
            activeColor: AppTheme.primary,
            side: const BorderSide(color: AppTheme.onSurfaceMuted, width: 1.5),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(4),
            ),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Wrap(
              children: [
                Text(
                  text,
                  style: const TextStyle(
                    color: AppTheme.onSurfaceMuted,
                    fontSize: 13,
                  ),
                ),
                GestureDetector(
                  onTap: () async {
                    final uri = Uri.parse(url);
                    if (await canLaunchUrl(uri)) {
                      await launchUrl(uri,
                          mode: LaunchMode.externalApplication);
                    }
                  },
                  child: Text(
                    linkText,
                    style: const TextStyle(
                      color: AppTheme.primary,
                      fontSize: 13,
                      decoration: TextDecoration.underline,
                      decorationColor: AppTheme.primary,
                    ),
                  ),
                ),
                if (suffixText != null)
                  Text(
                    suffixText!,
                    style: const TextStyle(
                      color: AppTheme.onSurfaceMuted,
                      fontSize: 13,
                    ),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
