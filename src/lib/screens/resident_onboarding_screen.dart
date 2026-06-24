import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../app_state.dart';
import '../theme/design_system.dart';

class ResidentOnboardingScreen extends StatefulWidget {
  const ResidentOnboardingScreen({super.key});

  @override
  State<ResidentOnboardingScreen> createState() => _ResidentOnboardingScreenState();
}

class _ResidentOnboardingScreenState extends State<ResidentOnboardingScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();

  String _selectedRole = 'HOME_CHIEF';
  String _selectedOccupancy = 'OWNER';
  String? _selectedFlatId;
  String _selectedFlatNumber = '';
  
  List<Map<String, String>> _flats = [];
  bool _isLoading = false;
  bool _isFetchingFlats = true;

  final List<String> _roles = ['HOME_CHIEF', 'HOME_MEMBER'];
  final List<String> _occupancyTypes = ['OWNER', 'TENANT'];

  @override
  void initState() {
    super.initState();
    _loadFlats();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _loadFlats() async {
    final appState = Provider.of<AppState>(context, listen: false);
    final wingId = appState.userWingId ?? 'N';

    // 1. Check if we are in Offline Demo Mode or if wingId is not a UUID
    final isUuid = RegExp(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$').hasMatch(wingId);

    if (!isUuid) {
      // Offline Demo Mode: Generate 28 mock flats (numbered 101 to 704)
      final List<Map<String, String>> mockFlats = [];
      for (int floor = 1; floor <= 7; floor++) {
        for (int flatNum = 1; flatNum <= 4; flatNum++) {
          final number = '$floor${flatNum.toString().padLeft(2, '0')}';
          mockFlats.add({
            'id': 'demo-flat-$number',
            'number': number,
          });
        }
      }
      setState(() {
        _flats = mockFlats;
        if (_flats.isNotEmpty) {
          _selectedFlatId = _flats.first['id'];
          _selectedFlatNumber = _flats.first['number']!;
        }
        _isFetchingFlats = false;
      });
    } else {
      // Real Cloud Mode: Query Supabase flat table filtered by wing_id
      try {
        final supabase = Supabase.instance.client;
        final response = await supabase
            .from('flat')
            .select('id, number')
            .eq('wing_id', wingId)
            .order('number');

        if (response != null) {
          final List<Map<String, String>> loadedFlats = [];
          for (var item in response) {
            loadedFlats.add({
              'id': item['id']?.toString() ?? '',
              'number': item['number']?.toString() ?? '',
            });
          }
          setState(() {
            _flats = loadedFlats;
            if (_flats.isNotEmpty) {
              _selectedFlatId = _flats.first['id'];
              _selectedFlatNumber = _flats.first['number']!;
            }
          });
        }
      } catch (e) {
        debugPrint('Error loading flats: $e');
      } finally {
        setState(() => _isFetchingFlats = false);
      }
    }
  }

  void _submitOnboarding() async {
    if (!_formKey.currentState!.validate() || _selectedFlatId == null) return;

    setState(() => _isLoading = true);

    // Simulate network delay
    await Future.delayed(const Duration(milliseconds: 800));

    final name = _nameController.text.trim();
    final phone = _phoneController.text.trim();
    final role = _selectedRole;
    final occupancy = _selectedOccupancy;

    final appState = Provider.of<AppState>(context, listen: false);

    // Add to dynamic test accounts registry
    final newAccount = {
      'name': '$name ($role - Flat $_selectedFlatNumber)',
      'phone': phone.startsWith('+91') ? phone : '+91$phone',
      'role': role,
      'wing_id': appState.userWingId ?? 'N',
      'flat_id': _selectedFlatId!,
      'flat_number': _selectedFlatNumber,
    };

    appState.addCustomTestAccount(newAccount);

    if (mounted) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('$name registered in Flat $_selectedFlatNumber! Account added to Login deck.'),
          backgroundColor: DesignSystem.successGreen,
          behavior: SnackBarBehavior.floating,
        ),
      );
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final isDemo = !RegExp(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')
        .hasMatch(appState.userWingId ?? '');

    return Scaffold(
      backgroundColor: DesignSystem.background,
      appBar: AppBar(
        title: Text(
          'Onboard Resident',
          style: DesignSystem.headingStyle(fontSize: 20),
        ),
        backgroundColor: DesignSystem.background,
        elevation: 0,
        iconTheme: const IconThemeData(color: DesignSystem.textPrimary),
      ),
      body: _isFetchingFlats
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
                  // Information Header Banner
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: DesignSystem.cardDecoration(
                      borderAccentColor: DesignSystem.secondary,
                    ).copyWith(
                      color: DesignSystem.secondary.withOpacity(0.05),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.home_work_outlined, color: DesignSystem.secondary),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'Registering a resident to your Wing. In production, residents complete registration via secure phone OTP and are auto-assigned to their flats.',
                            style: DesignSystem.bodyStyle(
                              fontSize: 13,
                              color: DesignSystem.textPrimary,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Onboarding Form
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: DesignSystem.cardDecoration(borderAccentColor: DesignSystem.secondary),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            'RESIDENT PROFILE',
                            style: DesignSystem.headingStyle(fontSize: 14, color: DesignSystem.textMuted),
                          ),
                          const SizedBox(height: 16),

                          // Name Input
                          TextFormField(
                            controller: _nameController,
                            style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold),
                            decoration: InputDecoration(
                              labelText: 'Resident Name',
                              labelStyle: DesignSystem.bodyStyle(color: DesignSystem.textMuted),
                              prefixIcon: const Icon(Icons.person_outline_rounded, color: DesignSystem.secondary),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(20),
                                borderSide: const BorderSide(color: DesignSystem.secondary, width: 2),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(20),
                                borderSide: BorderSide(color: DesignSystem.secondary.withOpacity(0.3), width: 1.5),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(20),
                                borderSide: const BorderSide(color: DesignSystem.secondary, width: 2),
                              ),
                              filled: true,
                              fillColor: Colors.white,
                            ),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'Please enter the resident name';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),

                          // Phone Input
                          TextFormField(
                            controller: _phoneController,
                            keyboardType: TextInputType.phone,
                            style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold),
                            decoration: InputDecoration(
                              labelText: 'Phone Number',
                              labelStyle: DesignSystem.bodyStyle(color: DesignSystem.textMuted),
                              prefixIcon: const Icon(Icons.phone_outlined, color: DesignSystem.secondary),
                              hintText: '9999988887',
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(20),
                                borderSide: const BorderSide(color: DesignSystem.secondary, width: 2),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(20),
                                borderSide: BorderSide(color: DesignSystem.secondary.withOpacity(0.3), width: 1.5),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(20),
                                borderSide: const BorderSide(color: DesignSystem.secondary, width: 2),
                              ),
                              filled: true,
                              fillColor: Colors.white,
                            ),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'Please enter the phone number';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 20),

                          // Flat Selector
                          Text(
                            'ASSIGNED FLAT',
                            style: DesignSystem.headingStyle(fontSize: 12, color: DesignSystem.textMuted),
                          ),
                          const SizedBox(height: 8),
                          _flats.isEmpty
                              ? Text(
                                  'No flats found in your Wing.',
                                  style: DesignSystem.bodyStyle(color: DesignSystem.accentCoral, fontWeight: FontWeight.bold),
                                )
                              : Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(color: DesignSystem.secondary.withOpacity(0.3), width: 1.5),
                                  ),
                                  child: DropdownButtonHideUnderline(
                                    child: DropdownButton<String>(
                                      value: _selectedFlatId,
                                      isExpanded: true,
                                      style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold),
                                      onChanged: (value) {
                                        if (value != null) {
                                          final matched = _flats.firstWhere((element) => element['id'] == value);
                                          setState(() {
                                            _selectedFlatId = value;
                                            _selectedFlatNumber = matched['number']!;
                                          });
                                        }
                                      },
                                      items: _flats.map((flat) {
                                        return DropdownMenuItem<String>(
                                          value: flat['id'],
                                          child: Text('Flat ${flat['number']}'),
                                        );
                                      }).toList(),
                                    ),
                                  ),
                                ),
                          const SizedBox(height: 20),

                          // Role Dropdown
                          Text(
                            'FLAT OCCUPANCY ROLE',
                            style: DesignSystem.headingStyle(fontSize: 12, color: DesignSystem.textMuted),
                          ),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: DesignSystem.secondary.withOpacity(0.3), width: 1.5),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                value: _selectedRole,
                                isExpanded: true,
                                style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold),
                                onChanged: (value) {
                                  if (value != null) {
                                    setState(() => _selectedRole = value);
                                  }
                                },
                                items: _roles.map((role) {
                                  return DropdownMenuItem<String>(
                                    value: role,
                                    child: Text(role.replaceAll('_', ' ')),
                                  );
                                }).toList(),
                              ),
                            ),
                          ),
                          const SizedBox(height: 20),

                          // Occupancy Type Dropdown
                          Text(
                            'OCCUPANCY TYPE',
                            style: DesignSystem.headingStyle(fontSize: 12, color: DesignSystem.textMuted),
                          ),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: DesignSystem.secondary.withOpacity(0.3), width: 1.5),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                value: _selectedOccupancy,
                                isExpanded: true,
                                style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold),
                                onChanged: (value) {
                                  if (value != null) {
                                    setState(() => _selectedOccupancy = value);
                                  }
                                },
                                items: _occupancyTypes.map((type) {
                                  return DropdownMenuItem<String>(
                                    value: type,
                                    child: Text(type),
                                  );
                                }).toList(),
                              ),
                            ),
                          ),
                          const SizedBox(height: 24),

                          // Submit Button
                          ElevatedButton(
                            onPressed: (_isLoading || _selectedFlatId == null) ? null : _submitOnboarding,
                            style: DesignSystem.buttonStyle(color: DesignSystem.secondary),
                            child: _isLoading
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2.5,
                                      valueColor: AlwaysStoppedAnimation(Colors.white),
                                    ),
                                  )
                                : Text(
                                    'ONBOARD RESIDENT',
                                    style: DesignSystem.headingStyle(
                                      fontSize: 16,
                                      color: Colors.white,
                                    ),
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
