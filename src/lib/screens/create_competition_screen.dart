import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../app_state.dart';
import '../theme/design_system.dart';

class SubEventFormItem {
  final nameController = TextEditingController();
  String category = 'Sports'; // Sports or Cultural
  String type = 'WING_BASED'; // WING_BASED or INDIVIDUAL
  String format = 'ROUND_ROBIN'; // ROUND_ROBIN or KNOCKOUT
  int bracketSize = 8;
  final pointsController = TextEditingController(text: '10');
  final capController = TextEditingController(text: '50');

  void dispose() {
    nameController.dispose();
    pointsController.dispose();
    capController.dispose();
  }
}

class CreateCompetitionScreen extends StatefulWidget {
  const CreateCompetitionScreen({super.key});

  @override
  State<CreateCompetitionScreen> createState() => _CreateCompetitionScreenState();
}

class _CreateCompetitionScreenState extends State<CreateCompetitionScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isCreating = false;

  final _masterNameController = TextEditingController();
  final _masterDescController = TextEditingController();
  final List<SubEventFormItem> _subEventItems = [];

  @override
  void initState() {
    super.initState();
    // Start with 1 default sub-event
    _subEventItems.add(SubEventFormItem());
  }

  @override
  void dispose() {
    _masterNameController.dispose();
    _masterDescController.dispose();
    for (var item in _subEventItems) {
      item.dispose();
    }
    super.dispose();
  }

  void _addSubEventItem() {
    setState(() {
      _subEventItems.add(SubEventFormItem());
    });
  }

  void _removeSubEventItem(int index) {
    if (_subEventItems.length > 1) {
      setState(() {
        final removed = _subEventItems.removeAt(index);
        removed.dispose();
      });
    }
  }

  void _submitCompetition() async {
    if (!_formKey.currentState!.validate() || _subEventItems.isEmpty) return;

    setState(() => _isCreating = true);
    final appState = Provider.of<AppState>(context, listen: false);

    final masterName = _masterNameController.text.trim();
    final masterDesc = _masterDescController.text.trim();
    final String masterId = 'evt-${DateTime.now().millisecondsSinceEpoch}';

    // Prepare Master Event data for Demo Mode
    final Map<String, dynamic> demoMasterEvent = {
      'id': masterId,
      'name': masterName,
      'description': masterDesc,
      'start_date': DateTime.now().add(const Duration(days: 10)).toIso8601String().split('T')[0],
      'sub_events': []
    };

    if (appState.activeSeasonId == 'demo-season-id') {
      // Offline Demo: Simulate API delay
      await Future.delayed(const Duration(milliseconds: 1000));
      
      int subCounter = 1;
      for (var item in _subEventItems) {
        final subId = 'sub-dynamic-$masterId-$subCounter';
        subCounter++;

        (demoMasterEvent['sub_events'] as List).add({
          'id': subId,
          'name': item.nameController.text.trim(),
          'category': item.category,
          'type': item.type,
          'description': item.category == 'Sports'
              ? 'Sports Tournament. Format: ${item.format}. Points: ${item.pointsController.text}.'
              : 'Cultural Performance showcase. Upload soundtracks and upvote popularity!',
        });
      }
      
      appState.addEventInDemo(demoMasterEvent);
      setState(() => _isCreating = false);
      _showBracketGenerationSuccessDialog(masterName);
    } else {
      // Real Cloud: Write to Supabase & run bracket procedures
      try {
        final supabase = Supabase.instance.client;

        // 1. Insert Master Event
        final eventRes = await supabase.from('event').insert({
          'name': masterName,
          'description': masterDesc,
          'season_id': appState.activeSeasonId!,
          'start_date': DateTime.now().add(const Duration(days: 10)).toUtc().toIso8601String(),
          'end_date': DateTime.now().add(const Duration(days: 15)).toUtc().toIso8601String(),
          'venue': 'Main Ground',
        }).select('id').single();

        final String eventId = eventRes['id'];

        // 2. Loop and Insert Sub-Events
        for (var item in _subEventItems) {
          final subEventRes = await supabase.from('sub_event').insert({
            'umbrella_event_id': eventId,
            'name': item.nameController.text.trim(),
            'description': item.category == 'Sports'
                ? 'Sports tournament. Format: ${item.format}.'
                : 'Cultural performance. Roster uploads and popularity meter.',
            'start_date': DateTime.now().add(const Duration(days: 10)).toUtc().toIso8601String(),
            'end_date': DateTime.now().add(const Duration(days: 15)).toUtc().toIso8601String(),
            'venue': 'Main Ground',
            'category': item.category.toUpperCase(),
            'type': item.type.toUpperCase(),
          }).select('id').single();

          final String subEventId = subEventRes['id'];

          // 3. Create Competition & fixtures for Sports sub-events only
          if (item.category == 'Sports') {
            final double partPoints = double.tryParse(item.pointsController.text) ?? 10.0;
            final double partCap = double.tryParse(item.capController.text) ?? 50.0;
            
            final Map<String, dynamic> rulesJson = {
              'type': item.type.toUpperCase(),
              'format': item.format.toUpperCase(),
              'points_config': {
                'win': 100.0,
                'loss': 0.0,
                'draw': 50.0,
                'participation': partPoints,
                'participation_cap': partCap
              }
            };

            final compRes = await supabase.from('competition').insert({
              'sub_event_id': subEventId,
              'name': item.nameController.text.trim(),
              'type': item.type.toUpperCase(),
              'scoring_rule_json': rulesJson,
              'status': 'SCHEDULED',
            }).select('id').single();

            final String newCompId = compRes['id'];

            if (item.format == 'ROUND_ROBIN') {
              await supabase.rpc('generate_round_robin_fixtures', params: {
                'p_competition_id': newCompId,
              });
            } else {
              await supabase.from('fixture').insert({
                'competition_id': newCompId,
                'name': 'Round 1 Match 1',
                'scheduled_at': DateTime.now().add(const Duration(days: 2)).toUtc().toIso8601String(),
                'status': 'SCHEDULED',
              });
            }
          }
        }

        setState(() => _isCreating = false);
        _showBracketGenerationSuccessDialog(masterName);
      } catch (e) {
        setState(() => _isCreating = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to generate events: ${e.toString()}'),
            backgroundColor: DesignSystem.accentCoral,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _showBracketGenerationSuccessDialog(String name) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return AlertDialog(
          backgroundColor: DesignSystem.background,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 12),
              CircleAvatar(
                radius: 40,
                backgroundColor: DesignSystem.primary.withOpacity(0.1),
                child: const Icon(
                  Icons.verified_rounded,
                  color: DesignSystem.primary,
                  size: 48,
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'Event Generated!',
                style: DesignSystem.headingStyle(fontSize: 20, color: DesignSystem.textPrimary),
              ),
              const SizedBox(height: 12),
              Text(
                'The umbrella event "$name" has been successfully created. Brackets and notice feeds have been generated for all sports sub-events.',
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
                  'DONE',
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
      appBar: const ScotHeaderBar(
        title: 'Onboard Umbrella Event',
        showBackButton: true,
        primaryColor: DesignSystem.primary,
      ),
      body: Stack(
        children: [
          // Background sports photo with dark overlay
          Positioned.fill(
            child: Image.network(
              DesignSystem.imgGeneralSports,
              fit: BoxFit.cover,
            ),
          ),
          Positioned.fill(
            child: Container(
              color: const Color(0xFF0F172A).withOpacity(0.92),
            ),
          ),
          Positioned.fill(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Section 1: Master Event Details
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: DesignSystem.glassDecoration(borderAccentColor: DesignSystem.primary, fillOpacity: 0.12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            'MASTER (UMBRELLA) EVENT',
                            style: DesignSystem.headingStyle(fontSize: 14, color: Colors.white70),
                          ),
                          const SizedBox(height: 20),
                          TextFormField(
                            controller: _masterNameController,
                            style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold, color: Colors.white),
                            decoration: InputDecoration(
                              filled: true,
                              fillColor: Colors.white.withOpacity(0.08),
                              labelText: 'Master Event Name (e.g. Topaz Annual Meet 2026)',
                              labelStyle: DesignSystem.bodyStyle(color: Colors.white70, fontSize: 13),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                                borderSide: BorderSide(color: Colors.white.withOpacity(0.2)),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                                borderSide: const BorderSide(color: DesignSystem.primary, width: 2),
                              ),
                            ),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) return 'Enter master event name';
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),
                          TextFormField(
                            controller: _masterDescController,
                            style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold, color: Colors.white),
                            maxLines: 2,
                            decoration: InputDecoration(
                              filled: true,
                              fillColor: Colors.white.withOpacity(0.08),
                              labelText: 'Brief Description / Date Details',
                              labelStyle: DesignSystem.bodyStyle(color: Colors.white70, fontSize: 13),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                                borderSide: BorderSide(color: Colors.white.withOpacity(0.2)),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                                borderSide: const BorderSide(color: DesignSystem.primary, width: 2),
                              ),
                            ),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) return 'Enter description';
                              return null;
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Section 2: Sub-Events List
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'SUB-EVENTS CATALOG',
                          style: DesignSystem.headingStyle(fontSize: 12, color: Colors.white70).copyWith(letterSpacing: 1.5),
                        ),
                        TextButton.icon(
                          onPressed: _addSubEventItem,
                          icon: const Icon(Icons.add_rounded, size: 18),
                          label: Text('ADD SUB-EVENT', style: DesignSystem.headingStyle(fontSize: 11, color: DesignSystem.secondary)),
                          style: TextButton.styleFrom(foregroundColor: DesignSystem.secondary),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _subEventItems.length,
                      itemBuilder: (context, index) {
                        final item = _subEventItems[index];
                        return Container(
                          margin: const EdgeInsets.only(bottom: 16),
                          padding: const EdgeInsets.all(20),
                          decoration: DesignSystem.glassDecoration(
                            borderAccentColor: DesignSystem.secondary,
                            fillOpacity: 0.12,
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'SUB-EVENT #${index + 1}',
                                    style: DesignSystem.headingStyle(fontSize: 11, color: DesignSystem.secondary),
                                  ),
                                  if (_subEventItems.length > 1)
                                    IconButton(
                                      icon: const Icon(Icons.delete_outline_rounded, color: DesignSystem.accentCoral, size: 20),
                                      onPressed: () => _removeSubEventItem(index),
                                    ),
                                ],
                              ),
                              const SizedBox(height: 8),

                              // Sub-event Category (Sports vs Cultural)
                              DropdownButtonFormField<String>(
                                value: item.category,
                                dropdownColor: const Color(0xFF1E293B),
                                style: DesignSystem.bodyStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                decoration: InputDecoration(
                                  filled: true,
                                  fillColor: Colors.white.withOpacity(0.08),
                                  labelText: 'Category',
                                  labelStyle: DesignSystem.bodyStyle(color: Colors.white70, fontSize: 13),
                                  enabledBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(16),
                                    borderSide: BorderSide(color: Colors.white.withOpacity(0.2)),
                                  ),
                                  focusedBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(16),
                                    borderSide: const BorderSide(color: DesignSystem.secondary, width: 2),
                                  ),
                                ),
                                onChanged: (val) {
                                  if (val != null) {
                                    setState(() {
                                      item.category = val;
                                    });
                                  }
                                },
                                items: const [
                                  DropdownMenuItem(value: 'Sports', child: Text('Sports (Fixtures & Brackets)')),
                                  DropdownMenuItem(value: 'Cultural', child: Text('Cultural (Popularity Meter)')),
                                ],
                              ),
                              const SizedBox(height: 16),

                              // Sub-event Name
                              TextFormField(
                                controller: item.nameController,
                                style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold, color: Colors.white),
                                decoration: InputDecoration(
                                  filled: true,
                                  fillColor: Colors.white.withOpacity(0.08),
                                  labelText: 'Sub-Event Name (e.g. Volleyball League)',
                                  labelStyle: DesignSystem.bodyStyle(color: Colors.white70, fontSize: 13),
                                  enabledBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(16),
                                    borderSide: BorderSide(color: Colors.white.withOpacity(0.2)),
                                  ),
                                  focusedBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(16),
                                    borderSide: const BorderSide(color: DesignSystem.secondary, width: 2),
                                  ),
                                ),
                                validator: (value) {
                                  if (value == null || value.trim().isEmpty) return 'Enter sub-event name';
                                  return null;
                                },
                              ),
                              const SizedBox(height: 16),

                              // Scoring Category
                              DropdownButtonFormField<String>(
                                value: item.type,
                                dropdownColor: const Color(0xFF1E293B),
                                style: DesignSystem.bodyStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                decoration: InputDecoration(
                                  filled: true,
                                  fillColor: Colors.white.withOpacity(0.08),
                                  labelText: 'Participation Category',
                                  labelStyle: DesignSystem.bodyStyle(color: Colors.white70, fontSize: 13),
                                  enabledBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(16),
                                    borderSide: BorderSide(color: Colors.white.withOpacity(0.2)),
                                  ),
                                  focusedBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(16),
                                    borderSide: const BorderSide(color: DesignSystem.secondary, width: 2),
                                  ),
                                ),
                                onChanged: (val) {
                                  if (val != null) {
                                    setState(() {
                                      item.type = val;
                                    });
                                  }
                                },
                                items: const [
                                  DropdownMenuItem(value: 'WING_BASED', child: Text('Wing vs Wing (Society Standings)')),
                                  DropdownMenuItem(value: 'INDIVIDUAL', child: Text('Individual Resident Matches')),
                                ],
                              ),
                              const SizedBox(height: 16),

                              // Sports configurations
                              if (item.category == 'Sports') ...[
                                // Tournament Format
                                DropdownButtonFormField<String>(
                                  value: item.format,
                                  dropdownColor: const Color(0xFF1E293B),
                                  style: DesignSystem.bodyStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                  decoration: InputDecoration(
                                    filled: true,
                                    fillColor: Colors.white.withOpacity(0.08),
                                    labelText: 'Format',
                                    labelStyle: DesignSystem.bodyStyle(color: Colors.white70, fontSize: 13),
                                    enabledBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(16),
                                      borderSide: BorderSide(color: Colors.white.withOpacity(0.2)),
                                    ),
                                    focusedBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(16),
                                      borderSide: const BorderSide(color: DesignSystem.secondary, width: 2),
                                    ),
                                  ),
                                  onChanged: (val) {
                                    if (val != null) {
                                      setState(() {
                                        item.format = val;
                                      });
                                    }
                                  },
                                  items: const [
                                    DropdownMenuItem(value: 'ROUND_ROBIN', child: Text('Round Robin League (Circle Method)')),
                                    DropdownMenuItem(value: 'KNOCKOUT', child: Text('Single Elimination Knockout')),
                                  ],
                                ),
                                const SizedBox(height: 16),

                                if (item.format == 'KNOCKOUT') ...[
                                  DropdownButtonFormField<int>(
                                    value: item.bracketSize,
                                    dropdownColor: const Color(0xFF1E293B),
                                    style: DesignSystem.bodyStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                    decoration: InputDecoration(
                                      filled: true,
                                      fillColor: Colors.white.withOpacity(0.08),
                                      labelText: 'Bracket Size',
                                      labelStyle: DesignSystem.bodyStyle(color: Colors.white70, fontSize: 13),
                                      enabledBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(16),
                                        borderSide: BorderSide(color: Colors.white.withOpacity(0.2)),
                                      ),
                                      focusedBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(16),
                                        borderSide: const BorderSide(color: DesignSystem.secondary, width: 2),
                                      ),
                                    ),
                                    onChanged: (val) {
                                      if (val != null) {
                                        setState(() {
                                          item.bracketSize = val;
                                        });
                                      }
                                    },
                                    items: const [
                                      DropdownMenuItem(value: 4, child: Text('4 Teams (Semifinals)')),
                                      DropdownMenuItem(value: 8, child: Text('8 Teams (Quarterfinals)')),
                                      DropdownMenuItem(value: 16, child: Text('16 Teams (Round of 16)')),
                                    ],
                                  ),
                                  const SizedBox(height: 16),
                                ],

                                Row(
                                  children: [
                                    Expanded(
                                      child: TextFormField(
                                        controller: item.pointsController,
                                        keyboardType: TextInputType.number,
                                        style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold, color: Colors.white),
                                        decoration: InputDecoration(
                                          filled: true,
                                          fillColor: Colors.white.withOpacity(0.08),
                                          labelText: 'Participation Pts',
                                          labelStyle: DesignSystem.bodyStyle(color: Colors.white70, fontSize: 11),
                                          enabledBorder: OutlineInputBorder(
                                            borderRadius: BorderRadius.circular(16),
                                            borderSide: BorderSide(color: Colors.white.withOpacity(0.2)),
                                          ),
                                          focusedBorder: OutlineInputBorder(
                                            borderRadius: BorderRadius.circular(16),
                                            borderSide: const BorderSide(color: DesignSystem.secondary, width: 2),
                                          ),
                                        ),
                                        validator: (value) {
                                          if (value == null || double.tryParse(value) == null) return 'Enter number';
                                          return null;
                                        },
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: TextFormField(
                                        controller: item.capController,
                                        keyboardType: TextInputType.number,
                                        style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold, color: Colors.white),
                                        decoration: InputDecoration(
                                          filled: true,
                                          fillColor: Colors.white.withOpacity(0.08),
                                          labelText: 'Wing Pts Cap',
                                          labelStyle: DesignSystem.bodyStyle(color: Colors.white70, fontSize: 11),
                                          enabledBorder: OutlineInputBorder(
                                            borderRadius: BorderRadius.circular(16),
                                            borderSide: BorderSide(color: Colors.white.withOpacity(0.2)),
                                          ),
                                          focusedBorder: OutlineInputBorder(
                                            borderRadius: BorderRadius.circular(16),
                                            borderSide: const BorderSide(color: DesignSystem.secondary, width: 2),
                                          ),
                                        ),
                                        validator: (value) {
                                          if (value == null || double.tryParse(value) == null) return 'Enter number';
                                          return null;
                                        },
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ],
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: 20),

                    // Submit button
                    ElevatedButton(
                      onPressed: _isCreating ? null : _submitCompetition,
                      style: DesignSystem.buttonStyle(color: DesignSystem.primary),
                      child: _isCreating
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.5,
                                valueColor: AlwaysStoppedAnimation(Colors.white),
                              ),
                            )
                          : Text(
                              'GENERATE UMBRELLA EVENT',
                              style: DesignSystem.headingStyle(fontSize: 14, color: Colors.white),
                            ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
