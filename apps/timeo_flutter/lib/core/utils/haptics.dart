import 'package:flutter/services.dart';

/// Haptic feedback utility for Timeo.
/// Wrap button taps and interactions with these calls
/// to give the app a polished, physical feel.
class Haptics {
  Haptics._();

  /// Light click — use for button taps, chip selections.
  static void light() => HapticFeedback.lightImpact();

  /// Medium thud — use for pull-to-refresh trigger, QR scan.
  static void medium() => HapticFeedback.mediumImpact();

  /// Selection tick — use for tab switches, toggle changes.
  static void selection() => HapticFeedback.selectionClick();
}
