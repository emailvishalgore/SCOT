import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../app_state.dart';
import '../theme/design_system.dart';

class EventsScreen extends StatefulWidget {
  const EventsScreen({super.key});

  @override
  State<EventsScreen> createState() => _EventsScreenState();
}

class _EventsScreenState extends State<EventsScreen> {
  bool _isLoading = true;
  bool _isRegistering = false;
  bool _isPaid = false;
  String _flatNumber = '';

  List<Map<String, dynamic>> _events = [];

  // Mock Events data for Offline Demo Mode
  final List<Map<String, dynamic>> _mockEvents = [
    {
      'id': 'evt-1',
      'name': 'Topaz Sports Fiesta 2026',
      'description': 'The annual society championship. Compete, represent your wing, and win the seasonal trophy!',
      'start_date': '2026-07-10',
      'sub_events': [
        {
          'id': 'sub-1',
          'name': 'Inter-Wing Football Match',
          'type': 'WING_BASED',
          'description': '7-a-side football tournament. Minimum 1 WING_CAPTAIN in roster.',
        },
        {
          'id': 'sub-2',
          'name': 'Men\'s Singles Badminton',
          'type': 'INDIVIDUAL',
          'description': 'Individual knockout brackets. Single elimination.',
        },
        {
          'id': 'sub-3',
          'name': 'Inter-Wing Carrom',
          'type': 'WING_BASED',
          'description': 'Doubles match. Points split equally between wing participants.',
        }
      ]
    },
    {
      'id': 'evt-2',
      'name': 'Independence Day Tournament',
      'description': 'Celebrating independence with friendly society games.',
      'start_date': '2026-08-15',
      'sub_events': [
        {
          'id': 'sub-4',
          'name': 'Women\'s Table Tennis',
          'type': 'INDIVIDUAL',
          'description': 'Best of 3 sets. Individual registration.',
        }
      ]
    }
  ];

  @override
  void initState() {
    super.initState();
    _loadDuesAndEvents();
  }

  Future<void> _loadDuesAndEvents() async {
    final appState = Provider.of<AppState>(context, listen: false);

    // 1. Resolve Dues Payment Eligibility Status
    if (appState.activeSeasonId == 'demo-season-id') {
      // Offline Demo: query AppState flat
      try {
        final supabase = Supabase.instance.client;
        if (appState.userFlatId != null && appState.userFlatId!.isNotEmpty) {
          final flatData = await supabase
              .from('flat')
              .select('number')
              .eq('id', appState.userFlatId!)
              .maybeSingle();
          if (flatData != null) {
            _flatNumber = flatData['number']?.toString() ?? '';
          }
        }
      } catch (_) {
        _flatNumber = '102'; // Fallback
      }
      _isPaid = appState.isFlatPaidInDemo(_flatNumber.isNotEmpty ? _flatNumber : '102');
      
      setState(() {
        _events = _mockEvents;
        _isLoading = false;
      });
    } else {
      // Real Cloud Mode: Query Supabase
      try {
        final supabase = Supabase.instance.client;
        
        // Load flat details
        if (appState.userFlatId != null) {
          final flatData = await supabase
              .from('flat')
              .select('number')
              .eq('id', appState.userFlatId!)
              .maybeSingle();
          if (flatData != null) {
            _flatNumber = flatData['number']?.toString() ?? '';
          }

          // Check dues in flat_annual_summary
          final summaryData = await supabase
              .from('flat_annual_summary')
              .select('is_paid')
              .eq('flat_id', appState.userFlatId!)
              .eq('season_id', appState.activeSeasonId!)
              .maybeSingle();
          if (summaryData != null) {
            _isPaid = summaryData['is_paid'] ?? false;
          }
        }

        // Load active events & sub-events
        final response = await supabase
            .from('event')
            .select('id, name, description, start_date, sub_event(id, name, type, description)')
            .eq('season_id', appState.activeSeasonId!)
            .order('start_date', ascending: true);

        if (response != null) {
          final List<Map<String, dynamic>> loadedEvents = [];
          for (var item in response) {
            final List<dynamic> subs = item['sub_event'] ?? [];
            loadedEvents.add({
              'id': item['id']?.toString() ?? '',
              'name': item['name']?.toString() ?? '',
              'description': item['description']?.toString() ?? '',
              'start_date': item['start_date']?.toString() ?? '',
              'sub_events': subs.map((s) => {
                'id': s['id']?.toString() ?? '',
                'name': s['name']?.toString() ?? '',
                'type': s['type']?.toString() ?? 'INDIVIDUAL',
                'description': s['description']?.toString() ?? '',
              }).toList(),
            });
          }
          setState(() {
            _events = loadedEvents;
          });
        }
      } catch (e) {
        debugPrint('Error loading events: $e');
      } finally {
        setState(() => _isLoading = false);
      }
    }
  }

  void _registerForSubEvent(String subEventId, String subEventName) async {
    setState(() => _isRegistering = true);
    final appState = Provider.of<AppState>(context, listen: false);

    if (appState.activeSeasonId == 'demo-season-id') {
      // Offline Demo: Simulate registration API delay
      await Future.delayed(const Duration(milliseconds: 600));
      appState.registerForEventInDemo(subEventId);
      
      setState(() => _isRegistering = false);
      _showSuccessRegistrationDialog(subEventName);
    } else {
      // Real Cloud: Submit row to core.registration
      try {
        final supabase = Supabase.instance.client;
        
        // Insert registration record
        await supabase.from('registration').insert({
          'sub_event_id': subEventId,
          'resident_id': appState.userResidentId!,
          'status': 'REGISTERED',
        });

        setState(() => _isRegistering = false);
        _showSuccessRegistrationDialog(subEventName);
      } catch (e) {
        setState(() => _isRegistering = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to register: ${e.toString()}'),
            backgroundColor: DesignSystem.accentCoral,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _showSuccessRegistrationDialog(String subEventName) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          backgroundColor: DesignSystem.background,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 12),
              CircleAvatar(
                radius: 36,
                backgroundColor: DesignSystem.successGreen.withOpacity(0.1),
                child: const Icon(Icons.check_circle_outline_rounded, color: DesignSystem.successGreen, size: 44),
              ),
              const SizedBox(height: 20),
              Text(
                'Registered!',
                style: DesignSystem.headingStyle(fontSize: 22, color: DesignSystem.textPrimary),
              ),
              const SizedBox(height: 12),
              Text(
                'You have successfully registered for "$subEventName". Get ready to show your skills!',
                textAlign: TextAlign.center,
                style: DesignSystem.bodyStyle(fontSize: 14, color: DesignSystem.textMuted),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: DesignSystem.buttonStyle(color: DesignSystem.primary),
                child: Text(
                  'AWESOME',
                  style: DesignSystem.headingStyle(fontSize: 14, color: Colors.white),
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);

    return Scaffold(
      backgroundColor: DesignSystem.background,
      appBar: AppBar(
        title: Text(
          'Register for Events',
          style: DesignSystem.headingStyle(fontSize: 20),
        ),
        backgroundColor: DesignSystem.background,
        elevation: 0,
        iconTheme: const IconThemeData(color: DesignSystem.textPrimary),
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(DesignSystem.primary),
              ),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Eligibility Gating Banner
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: DesignSystem.cardDecoration(
                      borderAccentColor: _isPaid ? DesignSystem.successGreen : DesignSystem.accentCoral,
                    ).copyWith(
                      color: _isPaid ? const Color(0xFFE8F5E9) : const Color(0xFFFFEBEE),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          _isPaid ? Icons.verified_user_rounded : Icons.gpp_bad_rounded,
                          color: _isPaid ? DesignSystem.successGreen : DesignSystem.accentCoral,
                          size: 28,
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _isPaid ? 'ELIGIBLE FOR EVENTS' : 'REGISTRATION GATED',
                                style: DesignSystem.headingStyle(
                                  fontSize: 12,
                                  color: _isPaid ? const Color(0xFF2E7D32) : const Color(0xFFC62828),
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                _isPaid
                                    ? 'Your Flat contribution is paid. Select a sport below to join!'
                                    : 'Flat $_flatNumber contribution is pending. Please pay to unlock registrations.',
                                style: DesignSystem.bodyStyle(
                                  fontSize: 12,
                                  color: _isPaid ? const Color(0xFF2E7D32) : const Color(0xFFC62828),
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 28),

                  Text(
                    'AVAILABLE COMPETITIONS',
                    style: DesignSystem.headingStyle(
                      fontSize: 12,
                      color: DesignSystem.textMuted,
                    ).copyWith(letterSpacing: 2),
                  ),
                  const SizedBox(height: 16),

                  // Events catalog
                  _events.isEmpty
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 40),
                            child: Text(
                              'No active events found for this season.',
                              style: DesignSystem.bodyStyle(color: DesignSystem.textMuted),
                            ),
                          ),
                        )
                      : ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: _events.length,
                          itemBuilder: (context, index) {
                            final event = _events[index];
                            final List<dynamic> subs = event['sub_events'] ?? [];
                            final startVal = event['start_date'];

                            return Container(
                              margin: const EdgeInsets.only(bottom: 24),
                              padding: const EdgeInsets.all(22),
                              decoration: DesignSystem.cardDecoration(borderAccentColor: DesignSystem.secondary),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          event['name'],
                                          style: DesignSystem.headingStyle(fontSize: 18, color: DesignSystem.textPrimary),
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: DesignSystem.secondary.withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(10),
                                        ),
                                        child: Text(
                                          'Starts: $startVal',
                                          style: DesignSystem.headingStyle(fontSize: 9, color: DesignSystem.secondary),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    event['description'],
                                    style: DesignSystem.bodyStyle(fontSize: 13, color: DesignSystem.textMuted),
                                  ),
                                  const SizedBox(height: 20),
                                  const Divider(height: 1),
                                  const SizedBox(height: 16),
                                  Text(
                                    'TOURNAMENT CATEGORIES',
                                    style: DesignSystem.headingStyle(fontSize: 11, color: DesignSystem.textMuted).copyWith(letterSpacing: 1),
                                  ),
                                  const SizedBox(height: 12),

                                  // Sub-events listings
                                  ...subs.map((sub) {
                                    final String subId = sub['id'];
                                    final String name = sub['name'];
                                    final String type = sub['type'];
                                    final String desc = sub['description'];

                                    final isRegistered = appState.activeSeasonId == 'demo-season-id'
                                        ? appState.isRegisteredInDemo(subId)
                                        : false; // In cloud mode we'd query core.registration

                                    return Container(
                                      margin: const EdgeInsets.only(bottom: 12),
                                      padding: const EdgeInsets.all(16),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(16),
                                        border: Border.all(color: DesignSystem.secondary.withOpacity(0.2), width: 1.2),
                                      ),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.stretch,
                                        children: [
                                          Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              Expanded(
                                                child: Text(
                                                  name,
                                                  style: DesignSystem.headingStyle(fontSize: 14, color: DesignSystem.textPrimary),
                                                ),
                                              ),
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                                decoration: BoxDecoration(
                                                  color: (type == 'WING_BASED' ? DesignSystem.primary : DesignSystem.accentPurple).withOpacity(0.1),
                                                  borderRadius: BorderRadius.circular(8),
                                                ),
                                                child: Text(
                                                  type == 'WING_BASED' ? 'WING TEAM' : 'INDIVIDUAL',
                                                  style: DesignSystem.headingStyle(
                                                    fontSize: 8,
                                                    color: type == 'WING_BASED' ? DesignSystem.primary : DesignSystem.accentPurple,
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 6),
                                          Text(
                                            desc,
                                            style: DesignSystem.bodyStyle(fontSize: 12, color: DesignSystem.textMuted),
                                          ),
                                          const SizedBox(height: 14),
                                          
                                          // Sign Up trigger button
                                          ElevatedButton(
                                            onPressed: (!_isPaid || isRegistered || _isRegistering)
                                                ? null
                                                : () => _registerForSubEvent(subId, name),
                                            style: DesignSystem.buttonStyle(
                                              color: isRegistered ? DesignSystem.successGreen : DesignSystem.primary,
                                            ).copyWith(
                                              padding: MaterialStateProperty.all(
                                                const EdgeInsets.symmetric(vertical: 10),
                                              ),
                                              shape: MaterialStateProperty.all(
                                                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                              ),
                                            ),
                                            child: _isRegistering
                                                ? const SizedBox(
                                                    height: 16,
                                                    width: 16,
                                                    child: CircularProgressIndicator(
                                                      strokeWidth: 2,
                                                      valueColor: AlwaysStoppedAnimation(Colors.white),
                                                    ),
                                                  )
                                                : Text(
                                                    isRegistered 
                                                        ? '✓ REGISTERED' 
                                                        : (!_isPaid ? 'GATED (UNPAID)' : 'REGISTER NOW'),
                                                    style: DesignSystem.headingStyle(
                                                      fontSize: 12,
                                                      color: Colors.white,
                                                    ),
                                                  ),
                                          ),
                                        ],
                                      ),
                                    );
                                  }).toList(),
                                ],
                              ),
                            );
                          },
                        ),
                ],
              ),
            ),
    );
  }
}
