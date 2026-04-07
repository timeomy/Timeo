import 'package:flutter/material.dart';

class TimeoLogo extends StatelessWidget {
  final double size;
  const TimeoLogo({super.key, this.size = 80});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: const Color(0xFF0A0F1E),
        borderRadius: BorderRadius.circular(size * 0.22),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0066FF).withValues(alpha: 0.3),
            blurRadius: 24,
            spreadRadius: 2,
          ),
        ],
      ),
      child: Center(
        child: Text.rich(
          TextSpan(
            children: [
              TextSpan(
                text: 't',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: size * 0.5,
                  fontWeight: FontWeight.w800,
                ),
              ),
              TextSpan(
                text: '.',
                style: TextStyle(
                  color: const Color(0xFF0066FF),
                  fontSize: size * 0.5,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}

class TimeoWordmark extends StatelessWidget {
  final double fontSize;
  const TimeoWordmark({super.key, this.fontSize = 32});

  @override
  Widget build(BuildContext context) {
    return Text.rich(
      TextSpan(
        children: [
          TextSpan(
            text: 'timeo',
            style: TextStyle(
              color: Colors.white,
              fontSize: fontSize,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.5,
            ),
          ),
          TextSpan(
            text: '.',
            style: TextStyle(
              color: const Color(0xFF0066FF),
              fontSize: fontSize,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}
