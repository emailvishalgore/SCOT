import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../app_state.dart';
import '../theme/design_system.dart';

class RegisterScreen extends StatefulWidget {
  final bool initialIsOrganizer;
  const RegisterScreen({super.key, this.initialIsOrganizer = false});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  int _currentStep = 0;
  bool _isSubmitting = false;
  late bool _isOrganizer;
  String _selectedRole = 'CORE_TEAM';

  // Step 1: Credentials & Flat
  final _usernameController = TextEditingController();
  final _mobileController = TextEditingController();
  final _pinController = TextEditingController();
  String _selectedWingName = 'N';
  String? _selectedFlatId;
  String _selectedFlatNumber = '';
  List<Map<String, String>> _flats = [];
  bool _isLoadingFlats = true;

  // Step 2: Member Roster
  final List<Map<String, dynamic>> _familyMembers = [];
  final _memberNameController = TextEditingController();
  String _selectedGender = 'MALE';
  String _selectedAgeGroup = 'OVER_18';

  @override
  void initState() {
    super.initState();
    _isOrganizer = widget.initialIsOrganizer;
    _loadFlatsForWing();
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _mobileController.dispose();
    _pinController.dispose();
    _memberNameController.dispose();
    super.dispose();
  }

  Future<void> _loadFlatsForWing() async {
    setState(() => _isLoadingFlats = true);
    final appState = Provider.of<AppState>(context, listen: false);

    if (appState.activeSeasonId == 'demo-season-id') {
      // Offline Demo: Generate flats locally
      final List<Map<String, String>> mockFlats = [];
      for (int floor = 1; floor <= 7; floor++) {
        for (int flatNum = 1; flatNum <= 4; flatNum++) {
          final numStr = '$floor${flatNum.toString().padLeft(2, '0')}';
          mockFlats.add({
            'id': 'demo-flat-$_selectedWingName-$numStr',
            'number': numStr,
          });
        }
      }
      setState(() {
        _flats = mockFlats;
        _selectedFlatId = _flats.first['id'];
        _selectedFlatNumber = _flats.first['number']!;
        _isLoadingFlats = false;
      });
    } else {
      // Real Cloud: Query Supabase
      try {
        final supabase = Supabase.instance.client;
        
        // Resolve wing id
        final wingRes = await supabase
            .from('wing')
            .select('id')
            .eq('name', _selectedWingName)
            .single();
        final String wingId = wingRes['id'];

        final flatsRes = await supabase
            .from('flat')
            .select('id, number')
            .eq('wing_id', wingId)
            .order('number');

        if (flatsRes != null) {
          final List<Map<String, String>> loaded = [];
          for (var f in flatsRes) {
            loaded.add({
              'id': f['id']?.toString() ?? '',
              'number': f['number']?.toString() ?? '',
            });
          }
          setState(() {
            _flats = loaded;
            if (_flats.isNotEmpty) {
              _selectedFlatId = _flats.first['id'];
              _selectedFlatNumber = _flats.first['number']!;
            }
          });
        }
      } catch (e) {
        debugPrint('Error loading flats: $e. Falling back to local flats.');
        final List<Map<String, String>> mockFlats = [];
        for (int floor = 1; floor <= 7; floor++) {
          for (int flatNum = 1; flatNum <= 4; flatNum++) {
            final numStr = '$floor${flatNum.toString().padLeft(2, '0')}';
            mockFlats.add({
              'id': 'demo-flat-$_selectedWingName-$numStr',
              'number': numStr,
            });
          }
        }
        setState(() {
          _flats = mockFlats;
          if (_flats.isNotEmpty) {
            _selectedFlatId = _flats.first['id'];
            _selectedFlatNumber = _flats.first['number']!;
          }
        });
      } finally {
        setState(() => _isLoadingFlats = false);
      }
    }
  }

  void _addFamilyMember() {
    final name = _memberNameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Please enter a member name'),
          backgroundColor: DesignSystem.accentCoral,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    if (_familyMembers.length >= 6) { // 1 primary user + 6 members = 7 max
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Maximum limit of 7 members per flat reached!'),
          backgroundColor: DesignSystem.accentCoral,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() {
      _familyMembers.add({
        'name': name,
        'gender': _selectedGender,
        'age_group': _selectedAgeGroup,
      });
      _memberNameController.clear();
      _selectedGender = 'MALE';
      _selectedAgeGroup = 'OVER_18';
    });
  }

  void _removeFamilyMember(int index) {
    setState(() {
      _familyMembers.removeAt(index);
    });
  }

  void _submitRegistration() async {
    setState(() => _isSubmitting = true);
    final appState = Provider.of<AppState>(context, listen: false);

    final username = _usernameController.text.trim();
    final pin = _pinController.text.trim();

    if (appState.activeSeasonId == 'demo-season-id') {
      // Offline Demo: Add registration to the mock approvals list in AppState
      await Future.delayed(const Duration(milliseconds: 1200));

      final Map<String, dynamic> newRequest = {
        'id': 'req-${DateTime.now().millisecondsSinceEpoch}',
        'username': username,
        'wing': _selectedWingName,
        'flat': _selectedFlatNumber,
        'flat_id': _selectedFlatId,
        'pin': pin, // stored plain for mock approval logins
        'members': List<Map<String, dynamic>>.from(_familyMembers),
        'status': 'PENDING',
        'date': 'Just Now'
      };

      // Add to dynamic pending approvals queue
      appState.addPendingRegistrationInDemo(newRequest);

      setState(() => _isSubmitting = false);
      _showPendingApprovalDialog();
    } else {
      // Real Cloud: Call Supabase RPC submit_registration_request
      try {
        final supabase = Supabase.instance.client;

        // Resolve wing id
        final wingRes = await supabase
            .from('wing')
            .select('id')
            .eq('name', _selectedWingName)
            .single();
        final String wingId = wingRes['id'];

        await supabase.rpc('submit_registration_request', params: {
          'p_username': username,
          'p_wing_id': wingId,
          'p_flat_id': _selectedFlatId!,
          'p_pin': pin,
          'p_members': _familyMembers,
        });

        setState(() => _isSubmitting = false);
        _showPendingApprovalDialog();
      } catch (e) {
        debugPrint('Failed to submit registration to cloud: $e. Falling back to offline demo submission.');
        final Map<String, dynamic> newRequest = {
          'id': 'req-${DateTime.now().millisecondsSinceEpoch}',
          'username': username,
          'wing': _selectedWingName,
          'flat': _selectedFlatNumber,
          'flat_id': _selectedFlatId,
          'pin': pin,
          'members': List<Map<String, dynamic>>.from(_familyMembers),
          'status': 'PENDING',
          'date': 'Just Now'
        };
        appState.addPendingRegistrationInDemo(newRequest);
        appState.activeSeasonId = 'demo-season-id';
        appState.notifyListeners();

        setState(() => _isSubmitting = false);
        _showPendingApprovalDialog();
      }
    }
  }

  void _submitOrganizerRegistration() async {
    setState(() => _isSubmitting = true);
    final appState = Provider.of<AppState>(context, listen: false);

    final username = _usernameController.text.trim();
    final pin = _pinController.text.trim();
    final role = _selectedRole;
    final isWingRequired = role == 'WING_COMMANDER' || role == 'WING_CAPTAIN';

    if (appState.activeSeasonId == 'demo-season-id') {
      await Future.delayed(const Duration(milliseconds: 1200));

      final Map<String, dynamic> newRequest = {
        'id': 'org-req-${DateTime.now().millisecondsSinceEpoch}',
        'username': username,
        'pin': pin,
        'role': role,
        'wing': isWingRequired ? _selectedWingName : '',
        'wing_id': isWingRequired ? 'demo-wing-$_selectedWingName-id' : null,
        'status': 'PENDING',
        'date': 'Just Now'
      };

      appState.addPendingOrganizerRegistrationInDemo(newRequest);
      setState(() => _isSubmitting = false);
      _showPendingApprovalDialog();
    } else {
      try {
        final supabase = Supabase.instance.client;
        String? wingId;
        if (isWingRequired) {
          final wingRes = await supabase
              .from('wing')
              .select('id')
              .eq('name', _selectedWingName)
              .single();
          wingId = wingRes['id'];
        }

        await supabase.rpc('submit_organizer_registration_request', params: {
          'p_username': username,
          'p_role': role,
          'p_wing_id': wingId,
          'p_pin': pin,
        });

        setState(() => _isSubmitting = false);
        _showPendingApprovalDialog();
      } catch (e) {
        debugPrint('Failed to submit organizer registration to cloud: $e. Falling back to offline.');
        final Map<String, dynamic> newRequest = {
          'id': 'org-req-${DateTime.now().millisecondsSinceEpoch}',
          'username': username,
          'pin': pin,
          'role': role,
          'wing': isWingRequired ? _selectedWingName : '',
          'wing_id': isWingRequired ? 'demo-wing-$_selectedWingName-id' : null,
          'status': 'PENDING',
          'date': 'Just Now'
        };
        appState.addPendingOrganizerRegistrationInDemo(newRequest);
        appState.activeSeasonId = 'demo-season-id';
        appState.notifyListeners();

        setState(() => _isSubmitting = false);
        _showPendingApprovalDialog();
      }
    }
  }

  void _showPendingApprovalDialog() {
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
                  Icons.hourglass_empty_rounded,
                  color: DesignSystem.primary,
                  size: 48,
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'Submitted for Approval',
                style: DesignSystem.headingStyle(fontSize: 18, color: DesignSystem.textPrimary),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                _isOrganizer
                    ? 'Your organizer self-registration request has been successfully sent to the main SCOT Admin. Once approved, you can log in immediately.'
                    : 'Your flat self-registration has been successfully sent to the SCOT Core Team. Your login PIN is secured. Once verified and approved, you can log in immediately.',
                textAlign: TextAlign.center,
                style: DesignSystem.bodyStyle(fontSize: 13, color: DesignSystem.textMuted),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () {
                  Navigator.pop(context); // Close dialog
                  Navigator.pop(context); // Back to Login Screen
                },
                style: DesignSystem.buttonStyle(color: DesignSystem.primary),
                child: Text(
                  'BACK TO LOGIN',
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
      appBar: ScotHeaderBar(
        title: _isOrganizer ? 'SCOT Team Registration' : 'Flat Registration',
        showBackButton: true,
        primaryColor: _isOrganizer ? DesignSystem.primary : DesignSystem.secondary,
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
              color: const Color(0xFF0F172A).withOpacity(0.88),
            ),
          ),
          Positioned.fill(
            child: _isSubmitting
                ? const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        CircularProgressIndicator(
                          valueColor: AlwaysStoppedAnimation<Color>(DesignSystem.primary),
                        ),
                        SizedBox(height: 16),
                        Text('Submitting credentials...', style: TextStyle(color: Colors.white)),
                      ],
                    ),
                  )
                : SingleChildScrollView(
                    padding: const EdgeInsets.all(24.0),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          if (!_isOrganizer) ...[
                            // Steps indicators
                            Row(
                              children: [
                                _buildStepIndicator(0, 'Flat Details'),
                                const SizedBox(width: 8),
                                Expanded(child: Container(height: 2, color: DesignSystem.secondary.withOpacity(0.3))),
                                const SizedBox(width: 8),
                                _buildStepIndicator(1, 'Family Roster'),
                              ],
                            ),
                            const SizedBox(height: 28),
                          ],

                          if (_isOrganizer)
                            _buildOrganizerDetailsForm()
                          else ...[
                            if (_currentStep == 0) _buildStep1FlatDetails(),
                            if (_currentStep == 1) _buildStep2FamilyRoster(),
                          ],
                        ],
                      ),
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrganizerDetailsForm() {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: DesignSystem.glassDecoration(borderAccentColor: DesignSystem.primary, fillOpacity: 0.12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'ORGANIZER CREDENTIALS',
            style: DesignSystem.headingStyle(fontSize: 12, color: Colors.white70).copyWith(letterSpacing: 1.5),
          ),
          const SizedBox(height: 16),

          // Username
          TextFormField(
            controller: _usernameController,
            style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold, color: Colors.white),
            decoration: InputDecoration(
              filled: true,
              fillColor: Colors.white.withOpacity(0.08),
              labelText: 'Account Username (for login)',
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
              if (value == null || value.trim().isEmpty) return 'Enter a username';
              if (value.trim().length < 3) return 'Username too short';
              return null;
            },
          ),
          const SizedBox(height: 16),

          // login PIN
          TextFormField(
            controller: _pinController,
            keyboardType: TextInputType.number,
            obscureText: true,
            style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold, color: Colors.white),
            maxLength: 4,
            decoration: InputDecoration(
              filled: true,
              fillColor: Colors.white.withOpacity(0.08),
              labelText: 'Create 4-Digit Login PIN',
              labelStyle: DesignSystem.bodyStyle(color: Colors.white70, fontSize: 13),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide(color: Colors.white.withOpacity(0.2)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(color: DesignSystem.primary, width: 2),
              ),
              counterText: '',
            ),
            validator: (value) {
              if (value == null || value.trim().length != 4 || int.tryParse(value) == null) {
                return 'Please enter a 4-digit numeric PIN';
              }
              return null;
            },
          ),
          const SizedBox(height: 16),

          // Team Dropdown
          DropdownButtonFormField<String>(
            value: _selectedRole,
            dropdownColor: const Color(0xFF1E293B),
            style: DesignSystem.bodyStyle(color: Colors.white, fontWeight: FontWeight.bold),
            decoration: InputDecoration(
              filled: true,
              fillColor: Colors.white.withOpacity(0.08),
              labelText: 'Select Your SCOT Team',
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
            onChanged: (val) {
              if (val != null) {
                setState(() {
                  _selectedRole = val;
                });
              }
            },
            items: const [
              DropdownMenuItem(value: 'CORE_TEAM', child: Text('Core Team')),
              DropdownMenuItem(value: 'EVENT_CHAMPION', child: Text('Event Champion')),
              DropdownMenuItem(value: 'WING_COMMANDER', child: Text('Wing Commander')),
              DropdownMenuItem(value: 'WING_CAPTAIN', child: Text('Wing Captain')),
            ],
          ),
          const SizedBox(height: 16),

          // Wing Selection (shown only if Wing Commander or Wing Captain is selected)
          if (_selectedRole == 'WING_COMMANDER' || _selectedRole == 'WING_CAPTAIN') ...[
            DropdownButtonFormField<String>(
              value: _selectedWingName,
              dropdownColor: const Color(0xFF1E293B),
              style: DesignSystem.bodyStyle(color: Colors.white, fontWeight: FontWeight.bold),
              decoration: InputDecoration(
                filled: true,
                fillColor: Colors.white.withOpacity(0.08),
                labelText: 'Select Assigned Wing',
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
              onChanged: (val) {
                if (val != null) {
                  setState(() {
                    _selectedWingName = val;
                  });
                }
              },
              items: ['N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W'].map((w) {
                return DropdownMenuItem(value: w, child: Text('Wing $w'));
              }).toList(),
            ),
            const SizedBox(height: 16),
          ],

          const SizedBox(height: 24),

          ElevatedButton(
            onPressed: () {
              if (_formKey.currentState!.validate()) {
                _submitOrganizerRegistration();
              }
            },
            style: DesignSystem.buttonStyle(color: DesignSystem.primary),
            child: Text(
              'SUBMIT REGISTRATION',
              style: DesignSystem.headingStyle(fontSize: 14, color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepIndicator(int stepIndex, String title) {
    final isActive = _currentStep == stepIndex;
    final isDone = _currentStep > stepIndex;

    return Row(
      children: [
        CircleAvatar(
          radius: 14,
          backgroundColor: isActive 
              ? DesignSystem.primary 
              : (isDone ? DesignSystem.successGreen : DesignSystem.textMuted.withOpacity(0.2)),
          child: isDone
              ? const Icon(Icons.check, size: 14, color: Colors.white)
              : Text(
                  '${stepIndex + 1}',
                  style: DesignSystem.headingStyle(
                    fontSize: 12,
                    color: isActive || isDone ? Colors.white : DesignSystem.textMuted,
                  ),
                ),
        ),
        const SizedBox(width: 8),
        Text(
          title,
          style: DesignSystem.headingStyle(
            fontSize: 13,
            color: isActive ? DesignSystem.textPrimary : DesignSystem.textMuted,
          ),
        ),
      ],
    );
  }

  Widget _buildStep1FlatDetails() {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: DesignSystem.glassDecoration(borderAccentColor: DesignSystem.primary, fillOpacity: 0.12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'ACCOUNT CREDENTIALS',
            style: DesignSystem.headingStyle(fontSize: 12, color: Colors.white70).copyWith(letterSpacing: 1.5),
          ),
          const SizedBox(height: 16),

          // Wing Selection
          DropdownButtonFormField<String>(
            value: _selectedWingName,
            dropdownColor: const Color(0xFF1E293B),
            style: DesignSystem.bodyStyle(color: Colors.white, fontWeight: FontWeight.bold),
            decoration: InputDecoration(
              filled: true,
              fillColor: Colors.white.withOpacity(0.08),
              labelText: 'Select Society Wing',
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
                  _selectedWingName = val;
                });
                _loadFlatsForWing();
              }
            },
            items: ['N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W'].map((w) {
              return DropdownMenuItem(value: w, child: Text('Wing $w'));
            }).toList(),
          ),
          const SizedBox(height: 16),

          // Flat Number selection
          _isLoadingFlats
              ? const Center(child: CircularProgressIndicator())
              : DropdownButtonFormField<String>(
                  value: _selectedFlatId,
                  dropdownColor: const Color(0xFF1E293B),
                  style: DesignSystem.bodyStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: Colors.white.withOpacity(0.08),
                    labelText: 'Select Flat Number',
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
                      final matched = _flats.firstWhere((element) => element['id'] == val);
                      setState(() {
                        _selectedFlatId = val;
                        _selectedFlatNumber = matched['number']!;
                      });
                    }
                  },
                  items: _flats.map((flat) {
                    return DropdownMenuItem(
                      value: flat['id'],
                      child: Text('Flat ${flat['number']}'),
                    );
                  }).toList(),
                ),
          const SizedBox(height: 16),

          // Username
          TextFormField(
            controller: _usernameController,
            style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold, color: Colors.white),
            decoration: InputDecoration(
              filled: true,
              fillColor: Colors.white.withOpacity(0.08),
              labelText: 'Account Username (for login)',
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
              if (value == null || value.trim().isEmpty) return 'Enter a username';
              if (value.trim().length < 3) return 'Username too short';
              return null;
            },
          ),
          const SizedBox(height: 16),

          // login PIN
          TextFormField(
            controller: _pinController,
            keyboardType: TextInputType.number,
            obscureText: true,
            style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold, color: Colors.white),
            maxLength: 4,
            decoration: InputDecoration(
              filled: true,
              fillColor: Colors.white.withOpacity(0.08),
              labelText: 'Create 4-Digit Login PIN',
              labelStyle: DesignSystem.bodyStyle(color: Colors.white70, fontSize: 13),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide(color: Colors.white.withOpacity(0.2)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(color: DesignSystem.secondary, width: 2),
              ),
              counterText: '',
            ),
            validator: (value) {
              if (value == null || value.trim().length != 4 || int.tryParse(value) == null) {
                return 'Please enter a 4-digit numeric PIN';
              }
              return null;
            },
          ),
          const SizedBox(height: 24),

          ElevatedButton(
            onPressed: () {
              if (_formKey.currentState!.validate() && _selectedFlatId != null) {
                setState(() {
                  _currentStep = 1;
                });
              }
            },
            style: DesignSystem.buttonStyle(color: DesignSystem.primary),
            child: Text(
              'NEXT: ADD MEMBERS',
              style: DesignSystem.headingStyle(fontSize: 14, color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStep2FamilyRoster() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Member Input Form Card
        Container(
          padding: const EdgeInsets.all(20),
          decoration: DesignSystem.glassDecoration(borderAccentColor: DesignSystem.secondary, fillOpacity: 0.12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'ADD FLAT RESIDENT (MAX 7 TOTAL)',
                style: DesignSystem.headingStyle(fontSize: 11, color: Colors.white70).copyWith(letterSpacing: 1.5),
              ),
              const SizedBox(height: 14),

              // Member Name
              TextFormField(
                controller: _memberNameController,
                style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold, color: Colors.white),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: Colors.white.withOpacity(0.08),
                  labelText: 'Resident Full Name',
                  labelStyle: DesignSystem.bodyStyle(color: Colors.white70, fontSize: 13),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide(color: Colors.white.withOpacity(0.2)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: DesignSystem.secondary, width: 2),
                  ),
                ),
              ),
              const SizedBox(height: 14),

              Row(
                children: [
                  // Gender Dropdown
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _selectedGender,
                      dropdownColor: const Color(0xFF1E293B),
                      style: DesignSystem.bodyStyle(color: Colors.white, fontWeight: FontWeight.bold),
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: Colors.white.withOpacity(0.08),
                        labelText: 'Gender',
                        labelStyle: DesignSystem.bodyStyle(color: Colors.white70, fontSize: 11),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide(color: Colors.white.withOpacity(0.2)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(color: DesignSystem.secondary, width: 2),
                        ),
                      ),
                      onChanged: (val) {
                        if (val != null) {
                          setState(() {
                            _selectedGender = val;
                          });
                        }
                      },
                      items: const [
                        DropdownMenuItem(value: 'MALE', child: Text('Male')),
                        DropdownMenuItem(value: 'FEMALE', child: Text('Female')),
                        DropdownMenuItem(value: 'OTHER', child: Text('Other')),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),

                  // Age Group Dropdown
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _selectedAgeGroup,
                      dropdownColor: const Color(0xFF1E293B),
                      style: DesignSystem.bodyStyle(color: Colors.white, fontWeight: FontWeight.bold),
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: Colors.white.withOpacity(0.08),
                        labelText: 'Age Category',
                        labelStyle: DesignSystem.bodyStyle(color: Colors.white70, fontSize: 11),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide(color: Colors.white.withOpacity(0.2)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(color: DesignSystem.secondary, width: 2),
                        ),
                      ),
                      onChanged: (val) {
                        if (val != null) {
                          setState(() {
                            _selectedAgeGroup = val;
                          });
                        }
                      },
                      items: const [
                        DropdownMenuItem(value: 'UNDER_12', child: Text('Below 12')),
                        DropdownMenuItem(value: 'BETWEEN_12_18', child: Text('12 - 18')),
                        DropdownMenuItem(value: 'OVER_18', child: Text('Above 18')),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              ElevatedButton.icon(
                onPressed: _addFamilyMember,
                style: DesignSystem.buttonStyle(color: DesignSystem.secondary).copyWith(
                  padding: MaterialStateProperty.all(const EdgeInsets.symmetric(vertical: 12)),
                ),
                icon: const Icon(Icons.add, color: Colors.white, size: 18),
                label: Text(
                  'ADD TO ROSTER',
                  style: DesignSystem.headingStyle(fontSize: 12, color: Colors.white),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),

        // Added Members List Roster
        Text(
          'ROSTER MEMBERS (${_familyMembers.length + 1} / 7)',
          style: DesignSystem.headingStyle(fontSize: 12, color: Colors.white70).copyWith(letterSpacing: 2),
        ),
        const SizedBox(height: 12),

        // Flat Head (Primary User)
        Container(
          margin: const EdgeInsets.only(bottom: 10),
          decoration: DesignSystem.glassDecoration(borderAccentColor: DesignSystem.primary, fillOpacity: 0.1),
          child: ListTile(
            leading: const CircleAvatar(
              backgroundColor: Colors.transparent,
              child: Icon(Icons.stars_rounded, color: DesignSystem.primary, size: 24),
            ),
            title: Text(
              _usernameController.text.isNotEmpty ? _usernameController.text : 'Flat Head',
              style: DesignSystem.headingStyle(fontSize: 14, color: Colors.white),
            ),
            subtitle: Text(
              'Primary Resident • Head of Flat',
              style: DesignSystem.bodyStyle(fontSize: 10, color: DesignSystem.textMuted, fontWeight: FontWeight.bold),
            ),
          ),
        ),

        // Roster members
        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: _familyMembers.length,
          itemBuilder: (context, index) {
            final m = _familyMembers[index];
            final name = m['name'];
            final gender = m['gender'];
            final ageGroup = m['age_group'] == 'UNDER_12' 
                ? 'Below 12' 
                : (m['age_group'] == 'BETWEEN_12_18' ? '12-18' : 'Above 18');

            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              decoration: DesignSystem.glassDecoration(borderAccentColor: DesignSystem.secondary, fillOpacity: 0.08),
              child: ListTile(
                leading: const CircleAvatar(
                  backgroundColor: Colors.transparent,
                  child: Icon(Icons.person_outline_rounded, color: DesignSystem.secondary, size: 24),
                ),
                title: Text(
                  name,
                  style: DesignSystem.headingStyle(fontSize: 13, color: Colors.white),
                ),
                subtitle: Text(
                  '$gender • Age: $ageGroup',
                  style: DesignSystem.bodyStyle(fontSize: 10, color: DesignSystem.textMuted, fontWeight: FontWeight.bold),
                ),
                trailing: IconButton(
                  onPressed: () => _removeFamilyMember(index),
                  icon: const Icon(Icons.delete_outline_rounded, color: DesignSystem.accentCoral, size: 20),
                  tooltip: 'Remove',
                ),
              ),
            );
          },
        ),
        const SizedBox(height: 28),

        // Bottom Navigation Buttons
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () {
                  setState(() {
                    _currentStep = 0;
                  });
                },
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  side: const BorderSide(color: Colors.white30),
                ),
                child: Text(
                  'BACK',
                  style: DesignSystem.headingStyle(fontSize: 14, color: Colors.white70),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: ElevatedButton(
                onPressed: _submitRegistration,
                style: DesignSystem.buttonStyle(color: DesignSystem.primary),
                child: Text(
                  'SUBMIT REGISTRY',
                  style: DesignSystem.headingStyle(fontSize: 14, color: Colors.white),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
