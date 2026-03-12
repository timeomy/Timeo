import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:timeo_flutter/app.dart';

void main() {
  testWidgets('App renders', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: TimeoApp()));
    // Just verify it renders without crashing
    expect(find.byType(TimeoApp), findsOneWidget);
  });
}
