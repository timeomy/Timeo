import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Animated shimmer placeholder for dark theme.
/// Pulses between surface → surfaceVariant.
class ShimmerBox extends StatefulWidget {
  final double width;
  final double height;
  final BorderRadius borderRadius;

  const ShimmerBox({
    super.key,
    this.width = double.infinity,
    this.height = 16,
    this.borderRadius = const BorderRadius.all(Radius.circular(8)),
  });

  @override
  State<ShimmerBox> createState() => _ShimmerBoxState();
}

class _ShimmerBoxState extends State<ShimmerBox>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    _animation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            borderRadius: widget.borderRadius,
            color: Color.lerp(
              AppTheme.surface,
              AppTheme.surfaceVariant,
              _animation.value,
            ),
          ),
        );
      },
    );
  }
}

/// Vertical list of shimmer boxes — list loading placeholder.
class ShimmerList extends StatelessWidget {
  final int count;
  final double itemHeight;
  final double spacing;

  const ShimmerList({
    super.key,
    this.count = 4,
    this.itemHeight = 72,
    this.spacing = 10,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(count, (i) {
        return Padding(
          padding: EdgeInsets.only(bottom: i < count - 1 ? spacing : 0),
          child: ShimmerBox(
            height: itemHeight,
            borderRadius: const BorderRadius.all(Radius.circular(14)),
          ),
        );
      }),
    );
  }
}

/// 2-column grid of shimmer cards — grid loading placeholder.
class ShimmerGrid extends StatelessWidget {
  final int rows;
  final double cardHeight;
  final double spacing;

  const ShimmerGrid({
    super.key,
    this.rows = 2,
    this.cardHeight = 120,
    this.spacing = 12,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(rows, (row) {
        return Padding(
          padding: EdgeInsets.only(bottom: row < rows - 1 ? spacing : 0),
          child: Row(
            children: [
              Expanded(
                child: ShimmerBox(
                  height: cardHeight,
                  borderRadius: const BorderRadius.all(Radius.circular(14)),
                ),
              ),
              SizedBox(width: spacing),
              Expanded(
                child: ShimmerBox(
                  height: cardHeight,
                  borderRadius: const BorderRadius.all(Radius.circular(14)),
                ),
              ),
            ],
          ),
        );
      }),
    );
  }
}

/// Shimmer placeholder for a stat card row.
class ShimmerStatRow extends StatelessWidget {
  const ShimmerStatRow({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: const [
        Expanded(
          child: ShimmerBox(
            height: 110,
            borderRadius: BorderRadius.all(Radius.circular(16)),
          ),
        ),
        SizedBox(width: 12),
        Expanded(
          child: ShimmerBox(
            height: 110,
            borderRadius: BorderRadius.all(Radius.circular(16)),
          ),
        ),
      ],
    );
  }
}
