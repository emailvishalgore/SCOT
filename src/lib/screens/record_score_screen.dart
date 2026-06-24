import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../app_state.dart';
import '../theme/design_system.dart';

class RecordScoreScreen extends StatefulWidget {
  const RecordScoreScreen({super.key});

  @override
  State<RecordScoreScreen> createState() => _RecordScoreScreenState();
}

class _RecordScoreScreenState extends State<RecordScoreScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = true;
  bool _isSaving = false;

  List<Map<String, dynamic>> _fixtures = [];
  Map<String, dynamic>? _selectedFixture;
  List<Map<String, dynamic>> _participants = [];

  // Input states
  final Map<String, TextEditingController> _scoreControllers = {};
  final Map<String, int?> _selectedPlacements = {};
  final Map<String, String> _attendanceStatuses = {};
  bool _isWalkover = false;
  String? _walkoverAbsentParticipantId;

  // Mock Fixtures for Offline Demo Mode
  final List<Map<String, dynamic>> _mockFixtures = [
    {
      'id': 'demo-fix-1',
      'name': 'Inter-Wing Football Finals',
      'competition_name': 'Inter-Wing Football Season 1',
      'type': 'WING_BASED',
      'participants': [
        {
          'id': 'cp-demo-1',
          'name': 'Wing N',
          'type': 'WING',
          'score': 2.0,
          'placement': 1,
          'attendance_status': 'PRESENT',
        },
        {
          'id': 'cp-demo-2',
          'name': 'Wing O',
          'type': 'WING',
          'score': 1.0,
          'placement': 2,
          'attendance_status': 'PRESENT',
        }
      ]
    },
    {
      'id': 'demo-fix-2',
      'name': 'Men\'s Singles Badminton Finals',
      'competition_name': 'Topaz Badminton Championship',
      'type': 'INDIVIDUAL',
      'participants': [
        {
          'id': 'cp-demo-3',
          'name': 'John Doe',
          'type': 'RESIDENT',
          'score': 21.0,
          'placement': 1,
          'attendance_status': 'PRESENT',
        },
        {
          'id': 'cp-demo-4',
          'name': 'Bob Smith',
          'type': 'RESIDENT',
          'score': 18.0,
          'placement': 2,
          'attendance_status': 'PRESENT',
        }
      ]
    },
    {
      'id': 'demo-fix-3',
      'name': 'Inter-Wing Carrom Semifinals',
      'competition_name': 'Carrom Tournament',
      'type': 'WING_BASED',
      'participants': [
        {
          'id': 'cp-demo-5',
          'name': 'Wing P',
          'type': 'WING',
          'score': 0.0,
          'placement': null,
          'attendance_status': 'PENDING',
        },
        {
          'id': 'cp-demo-6',
          'name': 'Wing Q',
          'type': 'WING',
          'score': 0.0,
          'placement': null,
          'attendance_status': 'PENDING',
        }
      ]
    }
  ];

  @override
  void initState() {
    super.initState();
    _loadFixtures();
  }

  @override
  void dispose() {
    for (var controller in _scoreControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _loadFixtures() async {
    final appState = Provider.of<AppState>(context, listen: false);

    if (appState.activeSeasonId == 'demo-season-id') {
      // Offline Demo Mode: Load mock fixtures
      setState(() {
        _fixtures = _mockFixtures;
        if (_fixtures.isNotEmpty) {
          _selectFixture(_fixtures.first);
        }
        _isLoading = false;
      });
    } else {
      // Real Cloud Mode: Query Supabase
      try {
        final supabase = Supabase.instance.client;
        final response = await supabase
            .from('fixture')
            .select('id, name, status, competition_id, competition:competition_id(name, type)')
            .neq('status', 'COMPLETED')
            .order('scheduled_at', ascending: true);

        if (response != null) {
          final List<Map<String, dynamic>> loaded = [];
          for (var item in response) {
            final comp = item['competition'] as Map<String, dynamic>?;
            loaded.add({
              'id': item['id']?.toString() ?? '',
              'name': item['name']?.toString() ?? 'Fixture',
              'competition_name': comp?['name']?.toString() ?? 'Competition',
              'type': comp?['type']?.toString() ?? 'INDIVIDUAL',
            });
          }
          setState(() {
            _fixtures = loaded;
            if (_fixtures.isNotEmpty) {
              _loadCloudParticipants(_fixtures.first);
            } else {
              _isLoading = false;
            }
          });
        } else {
          setState(() => _isLoading = false);
        }
      } catch (e) {
        debugPrint('Error fetching fixtures: $e');
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _loadCloudParticipants(Map<String, dynamic> fixture) async {
    setState(() => _isLoading = true);
    final fixtureId = fixture['id'];

    try {
      final supabase = Supabase.instance.client;
      final response = await supabase
          .from('competition_participant')
          .select('id, resident:resident_id(name), wing:wing_id(name)')
          .eq('fixture_id', fixtureId);

      if (response != null) {
        final List<Map<String, dynamic>> loadedParts = [];
        for (var item in response) {
          final res = item['resident'] as Map<String, dynamic>?;
          final wing = item['wing'] as Map<String, dynamic>?;
          final displayName = res != null ? res['name']?.toString() ?? '' : 'Wing ${wing?['name']?.toString() ?? ''}';
          loadedParts.add({
            'id': item['id']?.toString() ?? '',
            'name': displayName,
            'type': res != null ? 'RESIDENT' : 'WING',
          });
        }

        setState(() {
          _selectedFixture = fixture;
          _participants = loadedParts;
          _setupInputFields();
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Error fetching participants: $e');
      setState(() => _isLoading = false);
    }
  }

  void _selectFixture(Map<String, dynamic> fixture) {
    final appState = Provider.of<AppState>(context, listen: false);

    if (appState.activeSeasonId == 'demo-season-id') {
      setState(() {
        _selectedFixture = fixture;
        _participants = List<Map<String, dynamic>>.from(fixture['participants']);
        _setupInputFields();
      });
    } else {
      _loadCloudParticipants(fixture);
    }
  }

  void _setupInputFields() {
    // Clear old controllers
    for (var ctrl in _scoreControllers.values) {
      ctrl.dispose();
    }
    _scoreControllers.clear();
    _selectedPlacements.clear();
    _attendanceStatuses.clear();
    _walkoverAbsentParticipantId = null;
    _isWalkover = false;

    int defaultPlacement = 1;
    for (var part in _participants) {
      final pid = part['id'] as String;
      final scoreVal = part['score']?.toString() ?? '0';
      _scoreControllers[pid] = TextEditingController(text: scoreVal);
      _selectedPlacements[pid] = defaultPlacement++;
      _attendanceStatuses[pid] = 'PRESENT';
    }

    if (_participants.isNotEmpty) {
      _walkoverAbsentParticipantId = _participants.first['id'];
    }
  }

  void _submitScore() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);
    final appState = Provider.of<AppState>(context, listen: false);

    // Prepare JSON scores payload
    final List<Map<String, dynamic>> scoreList = [];
    for (var part in _participants) {
      final pid = part['id'] as String;
      final scoreText = _scoreControllers[pid]?.text.trim() ?? '0';
      final scoreDouble = double.tryParse(scoreText) ?? 0.0;
      final placementVal = _selectedPlacements[pid] ?? 1;
      
      final attendanceVal = _isWalkover 
          ? (pid == _walkoverAbsentParticipantId ? 'ABSENT' : 'PRESENT')
          : _attendanceStatuses[pid] ?? 'PRESENT';

      scoreList.add({
        'participant_id': pid,
        'score': scoreDouble,
        'placement': placementVal,
        'attendance_status': attendanceVal,
      });
    }

    if (appState.activeSeasonId == 'demo-season-id') {
      // Offline Demo Mode: Simulate API latency and show success
      await Future.delayed(const Duration(milliseconds: 700));
      
      if (mounted) {
        setState(() => _isSaving = false);
        _showSuccessDialog();
      }
    } else {
      // Real Cloud Mode: Execute Supabase RPC
      try {
        final supabase = Supabase.instance.client;
        await supabase.rpc('record_fixture_score', params: {
          'p_fixture_id': _selectedFixture!['id'],
          'p_scores': scoreList,
          'p_is_walkover': _isWalkover,
          'p_walkover_absent_participant_id': _isWalkover ? _walkoverAbsentParticipantId : null,
        });

        if (mounted) {
          setState(() => _isSaving = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Score recorded and leaderboard updated successfully!'),
              backgroundColor: DesignSystem.successGreen,
              behavior: SnackBarBehavior.floating,
            ),
          );
          Navigator.pop(context);
        }
      } catch (e) {
        if (mounted) {
          setState(() => _isSaving = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to record score: ${e.toString()}'),
              backgroundColor: DesignSystem.accentCoral,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }
    }
  }

  void _showSuccessDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return AlertDialog(
          backgroundColor: DesignSystem.background,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 12),
              CircleAvatar(
                radius: 40,
                backgroundColor: DesignSystem.successGreen.withOpacity(0.1),
                child: const Icon(
                  Icons.emoji_events_rounded,
                  color: Color(0xFFD4AF37), // Golden Trophy color
                  size: 48,
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'Score Recorded!',
                style: DesignSystem.headingStyle(fontSize: 22, color: DesignSystem.textPrimary),
              ),
              const SizedBox(height: 12),
              Text(
                'The match results have been computed. Points have been credited, and the SCOT TOPAZ Leaderboard has been recalculated successfully.',
                textAlign: TextAlign.center,
                style: DesignSystem.bodyStyle(fontSize: 14, color: DesignSystem.textMuted),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () {
                  Navigator.pop(context); // Close dialog
                  Navigator.pop(context); // Close screen
                },
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
    return Scaffold(
      backgroundColor: DesignSystem.background,
      appBar: AppBar(
        title: Text(
          'Record Match Score',
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
          : _fixtures.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.sports_score_rounded,
                        size: 64,
                        color: DesignSystem.textMuted.withOpacity(0.3),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'No fixtures scheduled at the moment.',
                        style: DesignSystem.headingStyle(fontSize: 16, color: DesignSystem.textMuted),
                      ),
                    ],
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Header Card
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: DesignSystem.cardDecoration(borderAccentColor: DesignSystem.accentYellow),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'SELECT ACTIVE FIXTURE',
                              style: DesignSystem.headingStyle(fontSize: 12, color: DesignSystem.textMuted),
                            ),
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: DesignSystem.accentYellow.withOpacity(0.5), width: 1.5),
                              ),
                              child: DropdownButtonHideUnderline(
                                child: DropdownButton<Map<String, dynamic>>(
                                  value: _selectedFixture,
                                  isExpanded: true,
                                  style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold),
                                  onChanged: (value) {
                                    if (value != null) {
                                      _selectFixture(value);
                                    }
                                  },
                                  items: _fixtures.map((fix) {
                                    return DropdownMenuItem<Map<String, dynamic>>(
                                      value: fix,
                                      child: Text(
                                        '${fix['name']} (${fix['competition_name']})',
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    );
                                  }).toList(),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Score Entry Card
                      if (_selectedFixture != null && _participants.isNotEmpty) ...[
                        Form(
                          key: _formKey,
                          child: Container(
                            padding: const EdgeInsets.all(24),
                            decoration: DesignSystem.cardDecoration(borderAccentColor: DesignSystem.primary),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      'MATCH SCOREBOARD',
                                      style: DesignSystem.headingStyle(fontSize: 14, color: DesignSystem.textMuted),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: DesignSystem.primary.withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Text(
                                        _selectedFixture!['type'] == 'WING_BASED' ? 'WING VS WING' : 'INDIVIDUALS',
                                        style: DesignSystem.headingStyle(fontSize: 9, color: DesignSystem.primary),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 24),

                                // Walkover Switch Row
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Row(
                                      children: [
                                        const Icon(Icons.outlined_flag_rounded, color: DesignSystem.accentCoral),
                                        const SizedBox(width: 8),
                                        Text(
                                          'Walkover Match?',
                                          style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold),
                                        ),
                                      ],
                                    ),
                                    Switch(
                                      value: _isWalkover,
                                      activeColor: DesignSystem.accentCoral,
                                      onChanged: (val) {
                                        setState(() {
                                          _isWalkover = val;
                                        });
                                      },
                                    ),
                                  ],
                                ),

                                if (_isWalkover) ...[
                                  const SizedBox(height: 16),
                                  Text(
                                    'SELECT ABSENT (FORFEITING) PARTY',
                                    style: DesignSystem.headingStyle(fontSize: 11, color: DesignSystem.textMuted),
                                  ),
                                  const SizedBox(height: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(20),
                                      border: Border.all(color: DesignSystem.accentCoral.withOpacity(0.4), width: 1.5),
                                    ),
                                    child: DropdownButtonHideUnderline(
                                      child: DropdownButton<String>(
                                        value: _walkoverAbsentParticipantId,
                                        isExpanded: true,
                                        style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold),
                                        onChanged: (value) {
                                          if (value != null) {
                                            setState(() {
                                              _walkoverAbsentParticipantId = value;
                                            });
                                          }
                                        },
                                        items: _participants.map((part) {
                                          return DropdownMenuItem<String>(
                                            value: part['id'] as String,
                                            child: Text(part['name'] as String),
                                          );
                                        }).toList(),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    'The selected absent participant will score 0, and their attendance will be logged as ABSENT. The present participant will win the points.',
                                    style: DesignSystem.bodyStyle(fontSize: 12, color: DesignSystem.textMuted),
                                  ),
                                ],

                                const SizedBox(height: 24),
                                const Divider(height: 1),
                                const SizedBox(height: 24),

                                // Score & placement fields for each participant
                                ListView.builder(
                                  shrinkWrap: true,
                                  physics: const NeverScrollableScrollPhysics(),
                                  itemCount: _participants.length,
                                  itemBuilder: (context, index) {
                                    final part = _participants[index];
                                    final pid = part['id'] as String;
                                    final name = part['name'] as String;

                                    final isAbsentInWalkover = _isWalkover && pid == _walkoverAbsentParticipantId;

                                    return Container(
                                      margin: const EdgeInsets.only(bottom: 20),
                                      padding: const EdgeInsets.all(16),
                                      decoration: BoxDecoration(
                                        color: isAbsentInWalkover ? Colors.red.withOpacity(0.02) : Colors.white,
                                        borderRadius: BorderRadius.circular(20),
                                        border: Border.all(
                                          color: isAbsentInWalkover 
                                              ? DesignSystem.accentCoral.withOpacity(0.3) 
                                              : DesignSystem.primary.withOpacity(0.15),
                                          width: 1.5,
                                        ),
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
                                                  style: DesignSystem.headingStyle(fontSize: 16, color: DesignSystem.textPrimary),
                                                ),
                                              ),
                                              if (isAbsentInWalkover)
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                                  decoration: BoxDecoration(
                                                    color: DesignSystem.accentCoral.withOpacity(0.1),
                                                    borderRadius: BorderRadius.circular(10),
                                                  ),
                                                  child: Text(
                                                    'FORFEIT (ABSENT)',
                                                    style: DesignSystem.headingStyle(fontSize: 8, color: DesignSystem.accentCoral),
                                                  ),
                                                ),
                                            ],
                                          ),
                                          const SizedBox(height: 16),
                                          Row(
                                            children: [
                                              // Score Input
                                              Expanded(
                                                flex: 2,
                                                child: TextFormField(
                                                  controller: _scoreControllers[pid],
                                                  enabled: !isAbsentInWalkover,
                                                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                                  style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold),
                                                  decoration: InputDecoration(
                                                    labelText: 'Score',
                                                    labelStyle: DesignSystem.bodyStyle(color: DesignSystem.textMuted, fontSize: 13),
                                                    border: OutlineInputBorder(
                                                      borderRadius: BorderRadius.circular(16),
                                                    ),
                                                    filled: true,
                                                    fillColor: isAbsentInWalkover ? Colors.grey.withOpacity(0.1) : Colors.white,
                                                  ),
                                                  validator: (value) {
                                                    if (isAbsentInWalkover) return null;
                                                    if (value == null || value.trim().isEmpty) {
                                                      return 'Enter score';
                                                    }
                                                    if (double.tryParse(value) == null) {
                                                      return 'Invalid number';
                                                    }
                                                    return null;
                                                  },
                                                ),
                                              ),
                                              const SizedBox(width: 16),

                                              // Placement Dropdown
                                              Expanded(
                                                flex: 2,
                                                child: DropdownButtonFormField<int>(
                                                  value: isAbsentInWalkover ? 2 : (_selectedPlacements[pid] ?? 1),
                                                  decoration: InputDecoration(
                                                    labelText: 'Placement',
                                                    labelStyle: DesignSystem.bodyStyle(color: DesignSystem.textMuted, fontSize: 13),
                                                    border: OutlineInputBorder(
                                                      borderRadius: BorderRadius.circular(16),
                                                    ),
                                                  ),
                                                  onChanged: isAbsentInWalkover
                                                      ? null
                                                      : (val) {
                                                          if (val != null) {
                                                            setState(() {
                                                              _selectedPlacements[pid] = val;
                                                            });
                                                          }
                                                        },
                                                  items: const [
                                                    DropdownMenuItem(value: 1, child: Text('1st Place')),
                                                    DropdownMenuItem(value: 2, child: Text('2nd Place')),
                                                    DropdownMenuItem(value: 3, child: Text('3rd Place')),
                                                    DropdownMenuItem(value: 4, child: Text('4th Place')),
                                                  ],
                                                ),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    );
                                  },
                                ),
                                const SizedBox(height: 16),

                                // Action Button
                                ElevatedButton(
                                  onPressed: _isSaving ? null : _submitScore,
                                  style: DesignSystem.buttonStyle(color: DesignSystem.primary),
                                  child: _isSaving
                                      ? const SizedBox(
                                          height: 20,
                                          width: 20,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2.5,
                                            valueColor: AlwaysStoppedAnimation(Colors.white),
                                          ),
                                        )
                                      : Text(
                                          'RECORD MATCH RESULTS',
                                          style: DesignSystem.headingStyle(fontSize: 16, color: Colors.white),
                                        ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
    );
  }
}
