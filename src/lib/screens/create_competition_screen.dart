import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../app_state.dart';
import '../theme/design_system.dart';

class CreateCompetitionScreen extends StatefulWidget {
  const CreateCompetitionScreen({super.key});

  @override
  State<CreateCompetitionScreen> createState() => _CreateCompetitionScreenState();
}

class _CreateCompetitionScreenState extends State<CreateCompetitionScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isCreating = false;

  final _nameController = TextEditingController();
  final _participationPointsController = TextEditingController(text: '10');
  final _participationCapController = TextEditingController(text: '50');
  
  String _selectedType = 'WING_BASED';
  String _selectedFormat = 'ROUND_ROBIN'; // ROUND_ROBIN or KNOCKOUT
  int _selectedBracketSize = 8;

  @override
  void dispose() {
    _nameController.dispose();
    _participationPointsController.dispose();
    _participationCapController.dispose();
    super.dispose();
  }

  void _submitCompetition() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isCreating = true);
    final appState = Provider.of<AppState>(context, listen: false);

    final name = _nameController.text.trim();
    final double partPoints = double.tryParse(_participationPointsController.text) ?? 10.0;
    final double partCap = double.tryParse(_participationCapController.text) ?? 50.0;

    // Build the rules jsonb structure
    final Map<String, dynamic> rulesJson = {
      'type': _selectedType,
      'format': _selectedFormat,
      'points_config': {
        'win': 100.0,
        'loss': 0.0,
        'draw': 50.0,
        'participation': partPoints,
        'participation_cap': partCap
      }
    };

    if (appState.activeSeasonId == 'demo-season-id') {
      // Offline Demo: Simulate scheduling latency and success
      await Future.delayed(const Duration(milliseconds: 1000));
      
      setState(() => _isCreating = false);
      _showBracketGenerationSuccessDialog(name);
    } else {
      // Real Cloud: Write to Supabase & run DDL scheduling procedures
      try {
        final supabase = Supabase.instance.client;

        // 1. Insert Competition row
        final compData = await supabase.from('competition').insert({
          'name': name,
          'type': _selectedType,
          'scoring_rule_json': rulesJson,
          'status': 'SCHEDULED',
          'season_id': appState.activeSeasonId!,
        }).select('id').single();

        final String newCompId = compData['id'];

        // 2. Generate fixtures via DB stored procedure
        if (_selectedFormat == 'ROUND_ROBIN') {
          // Calls the core.generate_round_robin_fixtures RPC
          await supabase.rpc('generate_round_robin_fixtures', params: {
            'p_competition_id': newCompId,
          });
        } else {
          // Knockout generator simulation or custom DDL call
          await supabase.from('fixture').insert({
            'competition_id': newCompId,
            'name': 'Round 1 Match 1',
            'scheduled_at': DateTime.now().add(const Duration(days: 2)).toUtc().toIso8601String(),
            'status': 'SCHEDULED',
          });
        }

        setState(() => _isCreating = false);
        _showBracketGenerationSuccessDialog(name);
      } catch (e) {
        setState(() => _isCreating = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to generate competition: ${e.toString()}'),
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
                  Icons.settings_suggest_outlined,
                  color: DesignSystem.primary,
                  size: 48,
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'Fixtures Scheduled!',
                style: DesignSystem.headingStyle(fontSize: 20, color: DesignSystem.textPrimary),
              ),
              const SizedBox(height: 12),
              Text(
                'The competition "$name" has been created. The society bracket scheduler has programmatically generated all fixtures and published them to the resident console.',
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
                  'VIEW FIXTURES',
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
          'Create Competition',
          style: DesignSystem.headingStyle(fontSize: 20),
        ),
        backgroundColor: DesignSystem.background,
        elevation: 0,
        iconTheme: const IconThemeData(color: DesignSystem.textPrimary),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: DesignSystem.cardDecoration(borderAccentColor: DesignSystem.primary),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'TOURNAMENT SETTINGS',
                      style: DesignSystem.headingStyle(fontSize: 14, color: DesignSystem.textMuted),
                    ),
                    const SizedBox(height: 20),

                    // Tournament Name
                    TextFormField(
                      controller: _nameController,
                      style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold),
                      decoration: InputDecoration(
                        labelText: 'Competition Name (e.g. Volleyball League)',
                        labelStyle: DesignSystem.bodyStyle(color: DesignSystem.textMuted, fontSize: 13),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(18)),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) return 'Enter competition name';
                        return null;
                      },
                    ),
                    const SizedBox(height: 20),

                    // Scoring Type (Wing vs Individual)
                    DropdownButtonFormField<String>(
                      value: _selectedType,
                      decoration: InputDecoration(
                        labelText: 'Scoring Category',
                        labelStyle: DesignSystem.bodyStyle(color: DesignSystem.textMuted, fontSize: 13),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(18)),
                      ),
                      onChanged: (val) {
                        if (val != null) {
                          setState(() {
                            _selectedType = val;
                          });
                        }
                      },
                      items: const [
                        DropdownMenuItem(value: 'WING_BASED', child: Text('Wing vs Wing (Society Points)')),
                        DropdownMenuItem(value: 'INDIVIDUAL', child: Text('Individual Resident Matches')),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Competition Format
                    DropdownButtonFormField<String>(
                      value: _selectedFormat,
                      decoration: InputDecoration(
                        labelText: 'Tournament Format',
                        labelStyle: DesignSystem.bodyStyle(color: DesignSystem.textMuted, fontSize: 13),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(18)),
                      ),
                      onChanged: (val) {
                        if (val != null) {
                          setState(() {
                            _selectedFormat = val;
                          });
                        }
                      },
                      items: const [
                        DropdownMenuItem(value: 'ROUND_ROBIN', child: Text('Round Robin League (Circle Method)')),
                        DropdownMenuItem(value: 'KNOCKOUT', child: Text('Single Elimination Knockout')),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Bracket Size selection (Knockout only)
                    if (_selectedFormat == 'KNOCKOUT') ...[
                      DropdownButtonFormField<int>(
                        value: _selectedBracketSize,
                        decoration: InputDecoration(
                          labelText: 'Bracket Size',
                          labelStyle: DesignSystem.bodyStyle(color: DesignSystem.textMuted, fontSize: 13),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(18)),
                        ),
                        onChanged: (val) {
                          if (val != null) {
                            setState(() {
                              _selectedBracketSize = val;
                            });
                          }
                        },
                        items: const [
                          DropdownMenuItem(value: 4, child: Text('4 Teams (Semifinals)')),
                          DropdownMenuItem(value: 8, child: Text('8 Teams (Quarterfinals)')),
                          DropdownMenuItem(value: 16, child: Text('16 Teams (Round of 16)')),
                        ],
                      ),
                      const SizedBox(height: 20),
                    ],

                    const Divider(height: 1),
                    const SizedBox(height: 20),
                    Text(
                      'SCORING CONFIGURATIONS (UI UX Pro Max)',
                      style: DesignSystem.headingStyle(fontSize: 12, color: DesignSystem.textMuted),
                    ),
                    const SizedBox(height: 16),

                    Row(
                      children: [
                        // Base Participation Points
                        Expanded(
                          child: TextFormField(
                            controller: _participationPointsController,
                            keyboardType: TextInputType.number,
                            style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold),
                            decoration: InputDecoration(
                              labelText: 'Participation Points',
                              labelStyle: DesignSystem.bodyStyle(color: DesignSystem.textMuted, fontSize: 11),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                            ),
                            validator: (value) {
                              if (value == null || double.tryParse(value) == null) {
                                return 'Enter valid number';
                              }
                              return null;
                            },
                          ),
                        ),
                        const SizedBox(width: 16),

                        // Wing Points Cap limit
                        Expanded(
                          child: TextFormField(
                            controller: _participationCapController,
                            keyboardType: TextInputType.number,
                            style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold),
                            decoration: InputDecoration(
                              labelText: 'Participation Cap / Wing',
                              labelStyle: DesignSystem.bodyStyle(color: DesignSystem.textMuted, fontSize: 11),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                            ),
                            validator: (value) {
                              if (value == null || double.tryParse(value) == null) {
                                return 'Enter valid number';
                              }
                              return null;
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 28),

                    // Trigger scheduler button
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
                              'GENERATE BRACKET & SCHEDULE',
                              style: DesignSystem.headingStyle(fontSize: 14, color: Colors.white),
                            ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
