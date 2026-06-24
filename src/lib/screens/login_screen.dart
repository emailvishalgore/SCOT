import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../app_state.dart';
import '../theme/design_system.dart';
import 'resident_dashboard.dart';
import 'coordinator_dashboard.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  bool _otpSent = false;
  bool _isLoading = false;

  final List<Map<String, String>> _testAccounts = [
    {
      'name': 'Dave Miller (SCOT Admin)',
      'phone': '+919999988884',
      'role': 'SCOT_ADMIN'
    },
    {
      'name': 'John Doe (Wing Commander & Champion)',
      'phone': '+919999988888',
      'role': 'WING_COMMANDER'
    },
    {
      'name': 'Bob Smith (Core Team / Admin)',
      'phone': '+919999988886',
      'role': 'CORE_TEAM'
    },
    {
      'name': 'Jane Doe (General Resident)',
      'phone': '+919999988887',
      'role': 'HOME_MEMBER'
    },
    {
      'name': 'Alice Cooper (Flat Owner)',
      'phone': '+919999988885',
      'role': 'HOME_CHIEF'
    },
  ];

  Future<void> _sendOtp() async {
    final phone = _phoneController.text.trim();
    if (phone.isEmpty) {
      _showError('Please enter a valid phone number');
      return;
    }

    setState(() => _isLoading = true);
    try {
      await Supabase.instance.client.auth.signInWithOtp(
        phone: phone,
      );
      setState(() => _otpSent = true);
      _showSuccess('OTP Sent to $phone (Test code is 123456)');
    } catch (e) {
      final allTestAccounts = [..._testAccounts, ...Provider.of<AppState>(context, listen: false).customTestAccounts];
      final isTest = allTestAccounts.any((element) => element['phone'] == phone);
      if (isTest) {
        setState(() => _otpSent = true);
        _showWarning('SMS API provider disabled. Switched to offline demo mode. Enter 123456.');
      } else {
        _showError('Error sending OTP: ${e.toString()}');
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _verifyOtp() async {
    final phone = _phoneController.text.trim();
    final otp = _otpController.text.trim();

    if (otp.isEmpty) {
      _showError('Please enter the verification code');
      return;
    }

    setState(() => _isLoading = true);
    try {
      final response = await Supabase.instance.client.auth.verifyOTP(
        phone: phone,
        token: otp,
        type: OtpType.sms,
      );

      final session = response.session;
      if (session != null) {
        final appState = Provider.of<AppState>(context, listen: false);
        await appState.decodeJwtClaims(session.accessToken);
        await appState.fetchActiveSeason(Supabase.instance.client);

        if (!mounted) return;
        _routeUser(appState.userRole);
      } else {
        _showError('Verification failed. Session is empty.');
      }
    } catch (e) {
      final allTestAccounts = [..._testAccounts, ...Provider.of<AppState>(context, listen: false).customTestAccounts];
      final isTest = allTestAccounts.any((element) => element['phone'] == phone);
      if (isTest && otp == '123456') {
        final appState = Provider.of<AppState>(context, listen: false);
        final acc = allTestAccounts.firstWhere((element) => element['phone'] == phone);
        
        appState.userRole = acc['role'];
        appState.userResidentId = 'demo-resident-id';
        appState.userMemberId = 'demo-member-id';
        appState.userWingId = acc['wing_id'] ?? 'N';
        appState.userFlatId = acc['flat_id'] ?? 'demo-flat-id';
        appState.activeSeasonId = 'demo-season-id';
        appState.notifyListeners();

        _showSuccess('Logged in to Offline Demo Mode as ${acc['name']}');
        if (!mounted) return;
        _routeUser(appState.userRole);
      } else {
        _showError('Verification failed: ${e.toString()}');
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _routeUser(String? role) {
    if (role == 'SCOT_ADMIN' ||
        role == 'CORE_TEAM' ||
        role == 'EVENT_CHAMPION' ||
        role == 'WING_COMMANDER') {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const CoordinatorDashboard()),
      );
    } else {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const ResidentDashboard()),
      );
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: Colors.redAccent,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _showSuccess(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: const Color(0xFF10B981),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _showWarning(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: const Color(0xFFF59E0B),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DesignSystem.background,
      body: Stack(
        children: [
          // Background playful decorative shapes
          Positioned(
            top: -100,
            left: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                color: DesignSystem.secondary.withOpacity(0.15),
                shape: BoxShape.circle,
              ),
            ),
          ),
          Positioned(
            bottom: -50,
            right: -50,
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                color: DesignSystem.accentCoral.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
            ),
          ),
          Positioned(
            top: 250,
            right: -80,
            child: Container(
              width: 180,
              height: 180,
              decoration: BoxDecoration(
                color: DesignSystem.accentYellow.withOpacity(0.2),
                shape: BoxShape.circle,
              ),
            ),
          ),
          // Scrollable login content
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 30),
                  // App Logo & Header
                  Center(
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: DesignSystem.primary.withOpacity(0.12),
                            blurRadius: 24,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(70),
                        child: Image.asset(
                          'assets/images/logo.png',
                          height: 140,
                          width: 140,
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'SCOT TOPAZ',
                    textAlign: TextAlign.center,
                    style: DesignSystem.headingStyle(
                      fontSize: 32,
                      color: DesignSystem.primary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Community Operations Platform',
                    textAlign: TextAlign.center,
                    style: DesignSystem.bodyStyle(
                      fontSize: 16,
                      color: DesignSystem.textMuted,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 40),

                  // Playful Input Card
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: DesignSystem.cardDecoration(
                      borderAccentColor: DesignSystem.primary,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          _otpSent ? 'Enter Verification Code' : 'Welcome to the Neighborhood!',
                          style: DesignSystem.headingStyle(
                            fontSize: 18,
                            color: DesignSystem.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Phone Input
                        TextField(
                          controller: _phoneController,
                          keyboardType: TextInputType.phone,
                          enabled: !_otpSent,
                          style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold),
                          decoration: InputDecoration(
                            labelText: 'Phone Number',
                            labelStyle: DesignSystem.bodyStyle(color: DesignSystem.textMuted),
                            prefixIcon: const Icon(Icons.phone_outlined, color: DesignSystem.primary),
                            hintText: '+919999988888',
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
                        ),

                        if (_otpSent) ...[
                          const SizedBox(height: 16),
                          // OTP Input
                          TextField(
                            controller: _otpController,
                            keyboardType: TextInputType.number,
                            maxLength: 6,
                            style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold, fontSize: 18),
                            decoration: InputDecoration(
                              labelText: 'Verification Code',
                              labelStyle: DesignSystem.bodyStyle(color: DesignSystem.textMuted),
                              prefixIcon: const Icon(Icons.lock_outline, color: DesignSystem.primary),
                              hintText: '123456',
                              counterText: '',
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
                          ),
                        ],

                        const SizedBox(height: 24),

                        // Submit Button
                        ElevatedButton(
                          onPressed: _isLoading
                              ? null
                              : (_otpSent ? _verifyOtp : _sendOtp),
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
                                  _otpSent ? 'VERIFY CODE' : 'GET STARTED',
                                  style: DesignSystem.headingStyle(
                                    fontSize: 16,
                                    color: Colors.white,
                                  ),
                                ),
                        ),

                        if (_otpSent) ...[
                          const SizedBox(height: 12),
                          TextButton(
                            onPressed: () => setState(() {
                              _otpSent = false;
                              _otpController.clear();
                            }),
                            child: Text(
                              'Change Phone Number',
                              style: DesignSystem.bodyStyle(
                                color: DesignSystem.primary,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          )
                        ]
                      ],
                    ),
                  ),

                  const SizedBox(height: 40),

                  // Quick Test Accounts Panel
                  Text(
                    'QUICK TEST ACCOUNTS',
                    textAlign: TextAlign.center,
                    style: DesignSystem.headingStyle(
                      fontSize: 12,
                      color: DesignSystem.textMuted,
                      fontWeight: FontWeight.bold,
                    ).copyWith(letterSpacing: 2),
                  ),
                   const SizedBox(height: 16),
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: [..._testAccounts, ...Provider.of<AppState>(context).customTestAccounts].length,
                    itemBuilder: (context, index) {
                      final allTestAccounts = [..._testAccounts, ...Provider.of<AppState>(context, listen: false).customTestAccounts];
                      final acc = allTestAccounts[index];
                      final role = acc['role'];
                      final Color cardColor = role == 'SCOT_ADMIN'
                          ? DesignSystem.primary
                          : (role == 'CORE_TEAM'
                              ? DesignSystem.accentCoral
                              : (role == 'WING_COMMANDER' || role == 'WING_CAPTAIN'
                                  ? DesignSystem.secondary
                                  : DesignSystem.accentPurple));
                      final isOrganizer = role == 'SCOT_ADMIN' ||
                          role == 'CORE_TEAM' ||
                          role == 'WING_COMMANDER' ||
                          role == 'WING_CAPTAIN' ||
                          role == 'EVENT_CHAMPION';
                      return Card(
                        color: Colors.white,
                        margin: const EdgeInsets.only(bottom: 12),
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(20),
                          side: BorderSide(
                            color: cardColor.withOpacity(0.3),
                            width: 1.5,
                          ),
                        ),
                        child: ListTile(
                          onTap: () {
                            setState(() {
                              _phoneController.text = acc['phone']!;
                              _otpSent = false;
                              _otpController.clear();
                            });
                          },
                          leading: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: cardColor.withOpacity(0.1),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              acc['role'] == 'CORE_TEAM' || acc['role'] == 'WING_COMMANDER'
                                  ? Icons.admin_panel_settings_rounded
                                  : Icons.home_rounded,
                              color: cardColor,
                            ),
                          ),
                          title: Text(
                            acc['name']!,
                            style: DesignSystem.bodyStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          subtitle: Text(
                            'Tap to autofill ${acc['phone']}',
                            style: DesignSystem.bodyStyle(
                              color: DesignSystem.textMuted,
                              fontSize: 12,
                            ),
                          ),
                          trailing: Icon(Icons.arrow_forward_ios_rounded, size: 14, color: cardColor),
                        ),
                      );
                    },
                  )
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
