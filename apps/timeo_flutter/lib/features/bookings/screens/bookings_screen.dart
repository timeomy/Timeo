import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:table_calendar/table_calendar.dart';
import '../../../core/theme/app_theme.dart';

class BookingsScreen extends ConsumerStatefulWidget {
  const BookingsScreen({super.key});

  @override
  ConsumerState<BookingsScreen> createState() => _BookingsScreenState();
}

class _BookingsScreenState extends ConsumerState<BookingsScreen> {
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;

  // Mock events keyed by date (year-month-day only)
  late final Map<DateTime, List<String>> _mockEvents;

  @override
  void initState() {
    super.initState();
    _selectedDay = _focusedDay;

    final now = DateTime.now();
    _mockEvents = {
      _dateOnly(now.add(const Duration(days: 1))): [
        'Morning Yoga - 8:00 AM',
        'Spin Class - 6:00 PM',
      ],
      _dateOnly(now.add(const Duration(days: 2))): [
        'HIIT Training - 7:00 AM',
      ],
      _dateOnly(now.add(const Duration(days: 3))): [
        'Pilates - 10:00 AM',
        'Boxing - 5:30 PM',
      ],
    };
  }

  static DateTime _dateOnly(DateTime d) => DateTime(d.year, d.month, d.day);

  List<String> _getEventsForDay(DateTime day) {
    return _mockEvents[_dateOnly(day)] ?? [];
  }

  @override
  Widget build(BuildContext context) {
    final events = _selectedDay != null ? _getEventsForDay(_selectedDay!) : <String>[];

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.background,
        elevation: 0,
        title: const Text(
          'Bookings',
          style: TextStyle(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.w700,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
          onPressed: () {
            if (Navigator.canPop(context)) {
              Navigator.pop(context);
            } else {
              context.go('/home');
            }
          },
        ),
      ),
      body: Column(
        children: [
          // Calendar
          TableCalendar<String>(
            firstDay: DateTime.now().subtract(const Duration(days: 365)),
            lastDay: DateTime.now().add(const Duration(days: 365)),
            focusedDay: _focusedDay,
            selectedDayPredicate: (day) => isSameDay(day, _selectedDay),
            eventLoader: _getEventsForDay,
            onDaySelected: (selectedDay, focusedDay) {
              setState(() {
                _selectedDay = selectedDay;
                _focusedDay = focusedDay;
              });
            },
            onPageChanged: (focusedDay) {
              _focusedDay = focusedDay;
            },
            calendarStyle: CalendarStyle(
              // Background
              outsideDaysVisible: false,
              // Default text
              defaultTextStyle: const TextStyle(color: Colors.white),
              weekendTextStyle: const TextStyle(color: Colors.white70),
              // Today
              todayDecoration: BoxDecoration(
                color: AppTheme.primary.withValues(alpha: 0.3),
                shape: BoxShape.circle,
              ),
              todayTextStyle: const TextStyle(
                  color: Colors.white, fontWeight: FontWeight.bold),
              // Selected
              selectedDecoration: const BoxDecoration(
                color: Color(0xFF0066FF),
                shape: BoxShape.circle,
              ),
              selectedTextStyle: const TextStyle(
                  color: Colors.white, fontWeight: FontWeight.bold),
              // Markers (event dots)
              markerDecoration: const BoxDecoration(
                color: Color(0xFF0066FF),
                shape: BoxShape.circle,
              ),
              markerSize: 6,
              markersMaxCount: 3,
            ),
            headerStyle: HeaderStyle(
              formatButtonVisible: false,
              titleCentered: true,
              titleTextStyle:
                  const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600),
              leftChevronIcon:
                  const Icon(Icons.chevron_left_rounded, color: Color(0xFF0066FF)),
              rightChevronIcon:
                  const Icon(Icons.chevron_right_rounded, color: Color(0xFF0066FF)),
            ),
            daysOfWeekStyle: const DaysOfWeekStyle(
              weekdayStyle: TextStyle(color: Colors.white54, fontSize: 12),
              weekendStyle: TextStyle(color: Colors.white38, fontSize: 12),
            ),
          ),

          const SizedBox(height: 16),

          // Section header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'UPCOMING CLASSES',
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.6),
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.2,
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Events list or empty state
          Expanded(
            child: events.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.event_available_rounded,
                          size: 48,
                          color: AppTheme.primary.withValues(alpha: 0.4),
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          'No classes scheduled',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Book a class coming soon',
                          style: TextStyle(
                            color: AppTheme.onSurfaceMuted,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    itemCount: events.length,
                    itemBuilder: (context, index) {
                      final event = events[index];
                      // Split "Class Name - Time"
                      final parts = event.split(' - ');
                      final className = parts.first;
                      final time = parts.length > 1 ? parts.last : '';

                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppTheme.surface,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: AppTheme.primary.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(
                                Icons.fitness_center_rounded,
                                color: AppTheme.primary,
                                size: 20,
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    className,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 15,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  if (time.isNotEmpty) ...[
                                    const SizedBox(height: 2),
                                    Text(
                                      time,
                                      style: const TextStyle(
                                        color: AppTheme.onSurfaceMuted,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                            TextButton(
                              onPressed: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Booking coming soon'),
                                    duration: Duration(seconds: 2),
                                  ),
                                );
                              },
                              style: TextButton.styleFrom(
                                backgroundColor:
                                    AppTheme.primary.withValues(alpha: 0.15),
                                foregroundColor: AppTheme.primary,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 16, vertical: 8),
                              ),
                              child: const Text('Book',
                                  style: TextStyle(fontWeight: FontWeight.w600)),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
