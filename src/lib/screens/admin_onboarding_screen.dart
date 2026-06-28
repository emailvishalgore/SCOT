import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../app_state.dart';
import '../theme/design_system.dart';

class AdminOnboardingScreen extends StatefulWidget {
  const AdminOnboardingScreen({super.key});

  @override
  State<AdminOnboardingScreen> createState() => _AdminOnboardingScreenState();
}

class _AdminOnboardingScreenState extends State<AdminOnboardingScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  
  String _selectedRole = 'WING_COMMANDER';
  String _selectedWing = 'N';
  bool _isLoading = false;

  final List<String> _roles = [
    'CORE_TEAM',
    'WING_COMMANDER',
    'WING_CAPTAIN',
    'EVENT_CHAMPION',
  ];

  final List<String> _wings = [
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W'
  ];

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  void _submitOnboarding() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    // Simulate network delay
    await Future.delayed(const Duration(milliseconds: 800));

    final name = _nameController.text.trim();
    final phone = _phoneController.text.trim();
    final role = _selectedRole;
    final wing = (role == 'WING_COMMANDER' || role == 'WING_CAPTAIN') ? _selectedWing : '';

    final appState = Provider.of<AppState>(context, listen: false);

    // Add to dynamic test accounts registry
    final newAccount = {
      'name': '$name (${role.replaceAll('_', ' ')})',
      'phone': phone.startsWith('+91') ? phone : '+91$phone',
      'role': role,
      'wing_id': wing,
    };

    appState.addCustomTestAccount(newAccount);

    if (mounted) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('$name onboarded successfully as ${role.replaceAll('_', ' ')}! Account added to Login deck.'),
          backgroundColor: DesignSystem.successGreen,
          behavior: SnackBarBehavior.floating,
        ),
      );
      Navigator.pop(context);
    }
  }

  @override
  @override
  Widget build(BuildContext context) {
    final showWingSelector = _selectedRole == 'WING_COMMANDER' || _selectedRole == 'WING_CAPTAIN';

    return Scaffold(
      backgroundColor: DesignSystem.background,
      appBar: const ScotHeaderBar(
        title: 'Onboard Organizer',
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
              color: const Color(0xFF0F172A).withOpacity(0.88),
            ),
          ),
          Positioned.fill(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Instructions Alert
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: DesignSystem.glassDecoration(
                      borderAccentColor: DesignSystem.primary,
                      fillOpacity: 0.1,
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.info_outline_rounded, color: DesignSystem.primary),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'Use this form to register members of the committee. Onboarded organizers will be appended to the Quick Test Accounts list on the login screen.',
                            style: DesignSystem.bodyStyle(
                              fontSize: 13,
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Form Card
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: DesignSystem.glassDecoration(borderAccentColor: DesignSystem.primary, fillOpacity: 0.12),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            'ORGANIZER DETAILS',
                            style: DesignSystem.headingStyle(fontSize: 14, color: Colors.white70),
                          ),
                          const SizedBox(height: 16),

                          // Full Name Input
                          TextFormField(
                            controller: _nameController,
                            style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold, color: Colors.white),
                            decoration: InputDecoration(
                              filled: true,
                              fillColor: Colors.white.withOpacity(0.08),
                              labelText: 'Full Name',
                              labelStyle: DesignSystem.bodyStyle(color: Colors.white70, fontSize: 13),
                              prefixIcon: const Icon(Icons.person_outline_rounded, color: DesignSystem.primary),
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
                              if (value == null || value.trim().isEmpty) {
                                return 'Please enter the full name';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),

                          // Phone Number Input
                          TextFormField(
                            controller: _phoneController,
                            keyboardType: TextInputType.phone,
                            style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold, color: Colors.white),
                            decoration: InputDecoration(
                              filled: true,
                              fillColor: Colors.white.withOpacity(0.08),
                              labelText: 'Phone Number',
                              labelStyle: DesignSystem.bodyStyle(color: Colors.white70, fontSize: 13),
                              prefixIcon: const Icon(Icons.phone_outlined, color: DesignSystem.primary),
                              hintText: '9999988888',
                              hintStyle: const TextStyle(color: Colors.white30),
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
                              if (value == null || value.trim().isEmpty) {
                                return 'Please enter the phone number';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 20),

                          // Role Dropdown
                          Text(
                            'COMMITTEE ROLE',
                            style: DesignSystem.headingStyle(fontSize: 12, color: Colors.white70),
                          ),
                          const SizedBox(height: 8),
                          DropdownButtonFormField<String>(
                            value: _selectedRole,
                            dropdownColor: const Color(0xFF1E293B),
                            style: DesignSystem.bodyStyle(color: Colors.white, fontWeight: FontWeight.bold),
                            decoration: InputDecoration(
                              filled: true,
                              fillColor: Colors.white.withOpacity(0.08),
                              labelText: 'Select Role',
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
                          const SizedBox(height: 20),

                          // Wing Selector (Conditionally shown)
                          if (showWingSelector) ...[
                            Text(
                              'ASSIGNED WING',
                              style: DesignSystem.headingStyle(fontSize: 12, color: Colors.white70),
                            ),
                            const SizedBox(height: 8),
                            DropdownButtonFormField<String>(
                              value: _selectedWing,
                              dropdownColor: const Color(0xFF1E293B),
                              style: DesignSystem.bodyStyle(color: Colors.white, fontWeight: FontWeight.bold),
                              decoration: InputDecoration(
                                filled: true,
                                fillColor: Colors.white.withOpacity(0.08),
                                labelText: 'Select Wing',
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
                              onChanged: (value) {
                                if (value != null) {
                                  setState(() => _selectedWing = value);
                                }
                              },
                              items: _wings.map((wing) {
                                return DropdownMenuItem<String>(
                                  value: wing,
                                  child: Text('Wing $wing'),
                                );
                              }).toList(),
                            ),
                            const SizedBox(height: 24),
                          ],

                          // Submit Button
                          ElevatedButton(
                            onPressed: _isLoading ? null : _submitOnboarding,
                            style: DesignSystem.buttonStyle(color: DesignSystem.primary),
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
                                    'ONBOARD ORGANIZER',
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
          ),
        ],
      ),
    );
  }
}
