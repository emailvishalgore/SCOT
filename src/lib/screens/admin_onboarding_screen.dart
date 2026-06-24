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
  Widget build(BuildContext context) {
    final showWingSelector = _selectedRole == 'WING_COMMANDER' || _selectedRole == 'WING_CAPTAIN';

    return Scaffold(
      backgroundColor: DesignSystem.background,
      appBar: AppBar(
        title: Text(
          'Onboard Organizer',
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
            // Instructions Alert
            Container(
              padding: const EdgeInsets.all(16),
              decoration: DesignSystem.cardDecoration(
                borderAccentColor: DesignSystem.primary,
              ).copyWith(
                color: DesignSystem.primary.withOpacity(0.05),
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
                        color: DesignSystem.textPrimary,
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
              decoration: DesignSystem.cardDecoration(borderAccentColor: DesignSystem.primary),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'ORGANIZER DETAILS',
                      style: DesignSystem.headingStyle(fontSize: 14, color: DesignSystem.textMuted),
                    ),
                    const SizedBox(height: 16),

                    // Full Name Input
                    TextFormField(
                      controller: _nameController,
                      style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold),
                      decoration: InputDecoration(
                        labelText: 'Full Name',
                        labelStyle: DesignSystem.bodyStyle(color: DesignSystem.textMuted),
                        prefixIcon: const Icon(Icons.person_outline_rounded, color: DesignSystem.primary),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(20),
                          borderSide: const BorderSide(color: DesignSystem.primary, width: 2),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(20),
                          borderSide: BorderSide(color: DesignSystem.primary.withOpacity(0.3), width: 1.5),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(20),
                          borderSide: const BorderSide(color: DesignSystem.primary, width: 2),
                        ),
                        filled: true,
                        fillColor: Colors.white,
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
                      style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold),
                      decoration: InputDecoration(
                        labelText: 'Phone Number',
                        labelStyle: DesignSystem.bodyStyle(color: DesignSystem.textMuted),
                        prefixIcon: const Icon(Icons.phone_outlined, color: DesignSystem.primary),
                        hintText: '9999988888',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(20),
                          borderSide: const BorderSide(color: DesignSystem.primary, width: 2),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(20),
                          borderSide: BorderSide(color: DesignSystem.primary.withOpacity(0.3), width: 1.5),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(20),
                          borderSide: const BorderSide(color: DesignSystem.primary, width: 2),
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

                    // Role Dropdown
                    Text(
                      'COMMITTEE ROLE',
                      style: DesignSystem.headingStyle(fontSize: 12, color: DesignSystem.textMuted),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: DesignSystem.primary.withOpacity(0.3), width: 1.5),
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

                    // Wing Selector (Conditionally shown)
                    if (showWingSelector) ...[
                      Text(
                        'ASSIGNED WING',
                        style: DesignSystem.headingStyle(fontSize: 12, color: DesignSystem.textMuted),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: DesignSystem.primary.withOpacity(0.3), width: 1.5),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _selectedWing,
                            isExpanded: true,
                            style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold),
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
                        ),
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
    );
  }
}
