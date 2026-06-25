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

  // Maps subEventId -> isLike (for cloud mode)
  final Map<String, bool> _cloudCulturalVotes = {};
  // Maps subEventId -> Map of {likes: int, dislikes: int, percentage: double}
  final Map<String, Map<String, dynamic>> _cloudPopularity = {};

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
        _events = appState.demoEvents;
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
            .select('id, name, description, start_date, sub_event(id, name, type, category, description)')
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
                'category': s['category']?.toString() ?? 'Sports',
                'description': s['description']?.toString() ?? '',
              }).toList(),
            });
          }

          // Load feedback votes for current user
          final feedbackRes = await supabase
              .from('cultural_feedback')
              .select('sub_event_id, is_like')
              .eq('resident_id', appState.userResidentId!);
              
          if (feedbackRes != null) {
            _cloudCulturalVotes.clear();
            for (var f in feedbackRes) {
              _cloudCulturalVotes[f['sub_event_id']] = f['is_like'];
            }
          }

          // Load all feedback counts to aggregate popularity
          final allFeedback = await supabase
              .from('cultural_feedback')
              .select('sub_event_id, is_like');
              
          if (allFeedback != null) {
            _cloudPopularity.clear();
            for (var f in allFeedback) {
              final subId = f['sub_event_id'] as String;
              final isLike = f['is_like'] as bool;
              if (!_cloudPopularity.containsKey(subId)) {
                _cloudPopularity[subId] = {'likes': 0, 'dislikes': 0};
              }
              if (isLike) {
                _cloudPopularity[subId]!['likes'] = (_cloudPopularity[subId]!['likes'] ?? 0) + 1;
              } else {
                _cloudPopularity[subId]!['dislikes'] = (_cloudPopularity[subId]!['dislikes'] ?? 0) + 1;
              }
            }
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

  void _registerForSubEvent(String subEventId, String subEventName, {String? trackUrl}) async {
    setState(() => _isRegistering = true);
    final appState = Provider.of<AppState>(context, listen: false);

    if (appState.activeSeasonId == 'demo-season-id') {
      // Offline Demo: Simulate registration API delay
      await Future.delayed(const Duration(milliseconds: 600));
      appState.registerForEventInDemo(subEventId, trackUrl: trackUrl, residentId: appState.userResidentId ?? 'demo-resident-id');
      
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
          'track_url': trackUrl,
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

  String _getEventBannerImage(List<dynamic> subEvents) {
    bool hasSports = subEvents.any((s) => (s['category']?.toString().toLowerCase() ?? 'sports') == 'sports');
    bool hasCultural = subEvents.any((s) => (s['category']?.toString().toLowerCase() ?? 'sports') == 'cultural');
    
    if (hasSports && hasCultural) {
      return 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&auto=format&fit=crop&q=80';
    } else if (hasCultural) {
      return 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=600&auto=format&fit=crop&q=80'; // stage/singing/dancing
    } else {
      return 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&auto=format&fit=crop&q=80'; // sports
    }
  }

  void _showTrackSelectionDialog(String subId, String subName) {
    String? chosenTrack;
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: DesignSystem.background,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
              title: Text('Upload Soundtrack', style: DesignSystem.headingStyle(fontSize: 18)),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'If you are participating in a Dance or Karaoke event, upload your backing audio track.',
                    style: DesignSystem.bodyStyle(fontSize: 13, color: DesignSystem.textMuted),
                  ),
                  const SizedBox(height: 20),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: DesignSystem.secondary.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: DesignSystem.secondary.withOpacity(0.1)),
                    ),
                    child: Column(
                      children: [
                        const Icon(Icons.audiotrack_rounded, size: 36, color: DesignSystem.secondary),
                        const SizedBox(height: 8),
                        Text(
                          chosenTrack ?? 'No track selected (Optional)',
                          textAlign: TextAlign.center,
                          style: DesignSystem.bodyStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: chosenTrack != null ? DesignSystem.successGreen : DesignSystem.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: () {
                      final List<String> mockTracks = [
                        'dance_remix_2026.mp3',
                        'karaoke_backing_track.mp3',
                        'instrumental_melody.wav',
                        'group_dance_vocals.mp3'
                      ];
                      final nextIndex = chosenTrack == null
                          ? 0
                          : (mockTracks.indexOf(chosenTrack!) + 1) % mockTracks.length;
                      setDialogState(() {
                        chosenTrack = mockTracks[nextIndex];
                      });
                    },
                    icon: const Icon(Icons.file_upload_outlined, size: 16),
                    label: Text('CHOOSE FILE', style: DesignSystem.headingStyle(fontSize: 12)),
                    style: DesignSystem.buttonStyle(color: DesignSystem.secondary),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text('CANCEL', style: DesignSystem.headingStyle(fontSize: 13, color: DesignSystem.textMuted)),
                ),
                ElevatedButton(
                  onPressed: () {
                    Navigator.pop(context);
                    _registerForSubEvent(subId, subName, trackUrl: chosenTrack);
                  },
                  style: DesignSystem.buttonStyle(color: DesignSystem.primary),
                  child: Text('REGISTER', style: DesignSystem.headingStyle(fontSize: 13, color: Colors.white)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _toggleCulturalVote(String subId, bool isLike) async {
    final appState = Provider.of<AppState>(context, listen: false);
    final residentId = appState.userResidentId ?? 'demo-resident-id';

    if (appState.activeSeasonId == 'demo-season-id') {
      appState.toggleCulturalVoteInDemo(subId, residentId, isLike);
    } else {
      try {
        final supabase = Supabase.instance.client;
        final currentVote = _cloudCulturalVotes[subId];
        
        if (currentVote == isLike) {
          await supabase
              .from('cultural_feedback')
              .delete()
              .eq('resident_id', residentId)
              .eq('sub_event_id', subId);
        } else {
          await supabase.from('cultural_feedback').upsert({
            'resident_id': residentId,
            'sub_event_id': subId,
            'is_like': isLike,
          });
        }
        _loadDuesAndEvents();
      } catch (e) {
        debugPrint('Error voting: $e');
      }
    }
  }

  Widget _buildPopularityMeter(BuildContext context, AppState appState, String subId) {
    int likes = 0;
    int dislikes = 0;
    double pct = 0.0;
    bool? userVote;

    if (appState.activeSeasonId == 'demo-season-id') {
      final popInfo = appState.getCulturalPopularity(subId);
      likes = popInfo['likes'];
      dislikes = popInfo['dislikes'];
      pct = popInfo['percentage'];
      userVote = appState.getResidentCulturalVote(subId, appState.userResidentId ?? 'demo-resident-id');
    } else {
      final pop = _cloudPopularity[subId] ?? {'likes': 0, 'dislikes': 0};
      likes = pop['likes'];
      dislikes = pop['dislikes'];
      final total = likes + dislikes;
      pct = total == 0 ? 0.0 : (likes / total) * 100.0;
      userVote = _cloudCulturalVotes[subId];
    }
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Popularity: ${pct.toStringAsFixed(0)}%',
              style: DesignSystem.headingStyle(fontSize: 12, color: DesignSystem.textPrimary),
            ),
            Text(
              '$likes Likes • $dislikes Dislikes',
              style: DesignSystem.bodyStyle(fontSize: 11, color: DesignSystem.textMuted),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Container(
          height: 6,
          decoration: BoxDecoration(
            color: Colors.grey.shade200,
            borderRadius: BorderRadius.circular(3),
          ),
          clipBehavior: Clip.antiAlias,
          child: Row(
            children: [
              if (likes > 0)
                Expanded(
                  flex: (pct * 100).toInt(),
                  child: Container(color: DesignSystem.successGreen),
                ),
              if (dislikes > 0)
                Expanded(
                  flex: ((100 - pct) * 100).toInt(),
                  child: Container(color: DesignSystem.accentCoral),
                ),
              if (likes == 0 && dislikes == 0)
                Expanded(child: Container(color: Colors.grey.shade300)),
            ],
          ),
        ),
        const SizedBox(height: 6),
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            IconButton(
              icon: Icon(
                userVote == true ? Icons.thumb_up_rounded : Icons.thumb_up_outlined,
                size: 20,
                color: userVote == true ? DesignSystem.successGreen : DesignSystem.textMuted,
              ),
              onPressed: () {
                _toggleCulturalVote(subId, true);
              },
            ),
            IconButton(
              icon: Icon(
                userVote == false ? Icons.thumb_down_rounded : Icons.thumb_down_outlined,
                size: 20,
                color: userVote == false ? DesignSystem.accentCoral : DesignSystem.textMuted,
              ),
              onPressed: () {
                _toggleCulturalVote(subId, false);
              },
            ),
          ],
        ),
      ],
    );
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
                            final bannerImg = _getEventBannerImage(subs);

                            return Container(
                              margin: const EdgeInsets.only(bottom: 24),
                              decoration: DesignSystem.cardDecoration(borderAccentColor: DesignSystem.secondary),
                              clipBehavior: Clip.antiAlias,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  Image.network(
                                    bannerImg,
                                    height: 140,
                                    fit: BoxFit.cover,
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.all(22),
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
                                          final String cat = sub['category'] ?? 'Sports';

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
                                                      child: Row(
                                                        children: [
                                                          Icon(
                                                            cat.toLowerCase() == 'cultural'
                                                                ? Icons.palette_rounded
                                                                : Icons.sports_soccer_rounded,
                                                            size: 18,
                                                            color: cat.toLowerCase() == 'cultural'
                                                                ? DesignSystem.accentCoral
                                                                : DesignSystem.primary,
                                                          ),
                                                          const SizedBox(width: 8),
                                                          Expanded(
                                                            child: Text(
                                                              name,
                                                              style: DesignSystem.headingStyle(fontSize: 14, color: DesignSystem.textPrimary),
                                                            ),
                                                          ),
                                                        ],
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
                                                const SizedBox(height: 8),
                                                Text(
                                                  desc,
                                                  style: DesignSystem.bodyStyle(fontSize: 12, color: DesignSystem.textMuted),
                                                ),
                                                const SizedBox(height: 14),
                                                
                                                // Sign Up trigger button
                                                ElevatedButton(
                                                  onPressed: (!_isPaid || isRegistered || _isRegistering)
                                                      ? null
                                                      : () {
                                                          if (cat.toLowerCase() == 'cultural') {
                                                            _showTrackSelectionDialog(subId, name);
                                                          } else {
                                                            _registerForSubEvent(subId, name);
                                                          }
                                                        },
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
                                                if (cat.toLowerCase() == 'cultural') ...[
                                                  const SizedBox(height: 14),
                                                  const Divider(height: 1),
                                                  const SizedBox(height: 12),
                                                  _buildPopularityMeter(context, appState, subId),
                                                ]
                                              ],
                                            ),
                                          );
                                        }).toList(),
                                      ],
                                    ),
                                  ),
                                ],
                              );
                            },
                          ),
                ],
              ),
            ),
    );
  }
}
