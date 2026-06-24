import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../app_state.dart';
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
      _showError('Error sending OTP: ${e.toString()}');
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
      _showError('Verification failed: ${e.toString()}');
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 40),
              // App Logo & Header
              Center(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Theme.of(context).primaryColor.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.lock_person_outlined,
                    size: 64,
                    color: Theme.of(context).primaryColor,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'S C O T',
                textAlign: TextAlign.center,
                style: GoogleFonts.outfit(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 4,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Community Operations Platform',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.grey[400],
                ),
              ),
              const SizedBox(height: 48),

              // Glassmorphic Input Card
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: const Color(0xFF1A1D2E), // Surface color
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: Colors.white.withOpacity(0.05),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.2),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    )
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      _otpSent ? 'Enter OTP' : 'Login with Mobile',
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Phone Input
                    TextField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      enabled: !_otpSent,
                      decoration: InputDecoration(
                        labelText: 'Phone Number',
                        prefixIcon: const Icon(Icons.phone_outlined),
                        hintText: '+919999988888',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        filled: true,
                        fillColor: const Color(0xFF0F111A),
                      ),
                    ),

                    if (_otpSent) ...[
                      const SizedBox(height: 16),
                      // OTP Input
                      TextField(
                        controller: _otpController,
                        keyboardType: TextInputType.number,
                        maxLength: 6,
                        decoration: InputDecoration(
                          labelText: 'Verification Code',
                          prefixIcon: const Icon(Icons.lock_outline),
                          hintText: '123456',
                          counterText: '',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                          filled: true,
                          fillColor: const Color(0xFF0F111A),
                        ),
                      ),
                    ],

                    const SizedBox(height: 24),

                    // Submit Button
                    ElevatedButton(
                      onPressed: _isLoading
                          ? null
                          : (_otpSent ? _verifyOtp : _sendOtp),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Theme.of(context).primaryColor,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        elevation: 4,
                      ),
                      child: _isLoading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation(Colors.white),
                              ),
                            )
                          : Text(
                              _otpSent ? 'VERIFY CODE' : 'SEND OTP CODE',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                    ),

                    if (_otpSent) ...[
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: () => setState(() {
                          _otpSent = false;
                          _otpController.clear();
                        }),
                        child: const Text('Change Phone Number'),
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
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 2,
                  color: Colors.grey[500],
                ),
              ),
              const SizedBox(height: 12),
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _testAccounts.length,
                itemBuilder: (context, index) {
                  final acc = _testAccounts[index];
                  return Card(
                    color: const Color(0xFF161925),
                    margin: const EdgeInsets.only(bottom: 8),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: ListTile(
                      onTap: () {
                        setState(() {
                          _phoneController.text = acc['phone']!;
                          _otpSent = false;
                          _otpController.clear();
                        });
                      },
                      leading: Icon(
                        acc['role'] == 'CORE_TEAM' || acc['role'] == 'WING_COMMANDER'
                            ? Icons.admin_panel_settings_outlined
                            : Icons.home_outlined,
                        color: acc['role'] == 'CORE_TEAM'
                            ? Colors.redAccent
                            : Theme.of(context).primaryColor,
                      ),
                      title: Text(
                        acc['name']!,
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                      ),
                      subtitle: Text(
                        'Tap to autofill ${acc['phone']}',
                        style: TextStyle(color: Colors.grey[400], fontSize: 12),
                      ),
                      trailing: const Icon(Icons.arrow_forward_ios_outlined, size: 12),
                    ),
                  );
                },
              )
            ],
          ),
        ),
      ),
    );
  }
}
