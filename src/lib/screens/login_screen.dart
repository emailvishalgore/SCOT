import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../app_state.dart';
import '../theme/design_system.dart';
import 'resident_dashboard.dart';
import 'coordinator_dashboard.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _usernameController = TextEditingController();
  final _pinController = TextEditingController();
  bool _isLoading = false;

  final List<Map<String, String>> _testAccounts = [
    {
      'name': 'Dave Miller (SCOT Admin)',
      'username': 'dave_miller',
      'pin': '1234',
      'type': 'COORDINATOR'
    },
    {
      'name': 'Jack Commander (Wing N Commander)',
      'username': 'jack_commander',
      'pin': '1234',
      'type': 'COORDINATOR'
    },
    {
      'name': 'John Doe (Resident Flat 102)',
      'username': 'john_doe',
      'pin': '1234',
      'type': 'RESIDENT'
    },
    {
      'name': 'Jane Doe (Family Member Flat 102)',
      'username': 'jane_doe',
      'pin': '1234',
      'type': 'RESIDENT'
    },
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      setState(() {
        _usernameController.clear();
        _pinController.clear();
      });
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _usernameController.dispose();
    _pinController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    final username = _usernameController.text.trim();
    final pin = _pinController.text.trim();

    if (username.isEmpty || pin.isEmpty) {
      _showError('Please fill in all credentials');
      return;
    }

    setState(() => _isLoading = true);
    final appState = Provider.of<AppState>(context, listen: false);

    if (appState.activeSeasonId == 'demo-season-id') {
      // Offline Demo Authentication
      await Future.delayed(const Duration(milliseconds: 600));
      final res = appState.authenticateUserInDemo(username, pin);
      
      setState(() => _isLoading = false);

      if (res['success'] == true) {
        _showSuccess('Welcome back, ${res['name']}! (Demo Mode)');
        if (!mounted) return;
        _routeUser(res['role']);
      } else {
        _showError(res['message'] ?? 'Authentication failed');
      }
    } else {
      // Real Cloud: Query Supabase core.authenticate_user RPC
      try {
        final supabase = Supabase.instance.client;
        final response = await supabase.rpc('authenticate_user', params: {
          'p_username': username,
          'p_pin': pin,
        });

        final Map<String, dynamic> result = response as Map<String, dynamic>;

        if (result['success'] == true) {
          appState.userRole = result['role']?.toString();
          appState.userResidentId = result['resident_id']?.toString();
          appState.userMemberId = result['member_id']?.toString() ?? '';
          appState.userWingId = result['wing_id']?.toString() ?? 'N';
          appState.userFlatId = result['flat_id']?.toString() ?? '';
          appState.activeSeasonId = result['season_id']?.toString();
          appState.notifyListeners();

          setState(() => _isLoading = false);
          _showSuccess('Welcome back, ${result['name']}!');
          if (!mounted) return;
          _routeUser(appState.userRole);
        } else {
          setState(() => _isLoading = false);
          _showError(result['message'] ?? 'Authentication failed');
        }
      } catch (e) {
        setState(() => _isLoading = false);
        _showError('Authentication failed: ${e.toString()}');
      }
    }
  }

  void _routeUser(String? role) {
    if (role == 'SCOT_ADMIN' ||
        role == 'CORE_TEAM' ||
        role == 'EVENT_CHAMPION' ||
        role == 'WING_COMMANDER' ||
        role == 'WING_CAPTAIN') {
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
        backgroundColor: DesignSystem.accentCoral,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _showSuccess(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: DesignSystem.successGreen,
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
                  const SizedBox(height: 10),
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
                          height: 110,
                          width: 110,
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'SCOT TOPAZ',
                    textAlign: TextAlign.center,
                    style: DesignSystem.headingStyle(
                      fontSize: 28,
                      color: DesignSystem.primary,
                    ),
                  ),
                  Text(
                    'Community Operations Platform',
                    textAlign: TextAlign.center,
                    style: DesignSystem.bodyStyle(
                      fontSize: 14,
                      color: DesignSystem.textMuted,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 28),

                  // Login Form Card
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: DesignSystem.cardDecoration(
                      borderAccentColor: DesignSystem.primary,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        TabBar(
                          controller: _tabController,
                          labelColor: DesignSystem.primary,
                          unselectedLabelColor: DesignSystem.textMuted,
                          indicatorColor: DesignSystem.primary,
                          indicatorWeight: 3,
                          labelStyle: DesignSystem.headingStyle(fontSize: 14),
                          tabs: const [
                            Tab(text: 'Resident Login'),
                            Tab(text: 'SCOT Team'),
                          ],
                        ),
                        const SizedBox(height: 24),

                        // Username Input
                        TextField(
                          controller: _usernameController,
                          style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold),
                          decoration: InputDecoration(
                            labelText: 'Username or Member ID',
                            labelStyle: DesignSystem.bodyStyle(color: DesignSystem.textMuted, fontSize: 13),
                            prefixIcon: const Icon(Icons.person_outline_rounded, color: DesignSystem.primary),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // PIN Input
                        TextField(
                          controller: _pinController,
                          keyboardType: TextInputType.number,
                          obscureText: true,
                          maxLength: 4,
                          style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          decoration: InputDecoration(
                            labelText: 'Login PIN',
                            labelStyle: DesignSystem.bodyStyle(color: DesignSystem.textMuted, fontSize: 13),
                            prefixIcon: const Icon(Icons.lock_outline_rounded, color: DesignSystem.primary),
                            counterText: '',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Submit Button
                        ElevatedButton(
                          onPressed: _isLoading ? null : _handleLogin,
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
                                  'LOG IN',
                                  style: DesignSystem.headingStyle(
                                    fontSize: 15,
                                    color: Colors.white,
                                  ),
                                ),
                        ),

                        // Register Gating Link (Resident login tab only)
                        AnimatedBuilder(
                          animation: _tabController,
                          builder: (context, child) {
                            if (_tabController.index == 0) {
                              return Column(
                                children: [
                                  const SizedBox(height: 16),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Text(
                                        'New to Topaz? ',
                                        style: DesignSystem.bodyStyle(fontSize: 13, color: DesignSystem.textMuted),
                                      ),
                                      InkWell(
                                        onTap: () {
                                          Navigator.push(
                                            context,
                                            MaterialPageRoute(builder: (_) => const RegisterScreen()),
                                          );
                                        },
                                        child: Text(
                                          'Register Flat',
                                          style: DesignSystem.headingStyle(
                                            fontSize: 13,
                                            color: DesignSystem.secondary,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              );
                            }
                            return const SizedBox.shrink();
                          },
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Quick Test Accounts Panel
                  Text(
                    'QUICK DEMO ACCOUNTS',
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
                    itemCount: _testAccounts.length,
                    itemBuilder: (context, index) {
                      final acc = _testAccounts[index];
                      final isResident = acc['type'] == 'RESIDENT';
                      final Color cardColor = isResident ? DesignSystem.secondary : DesignSystem.primary;

                      return Card(
                        color: Colors.white,
                        margin: const EdgeInsets.only(bottom: 12),
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(20),
                          side: BorderSide(
                            color: cardColor.withOpacity(0.3),
                            width: 1.2,
                          ),
                        ),
                        child: ListTile(
                          onTap: () {
                            setState(() {
                              _usernameController.text = acc['username']!;
                              _pinController.text = acc['pin']!;
                              _tabController.index = isResident ? 0 : 1;
                            });
                          },
                          leading: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: cardColor.withOpacity(0.1),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              isResident ? Icons.home_rounded : Icons.admin_panel_settings_rounded,
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
                            'Username: ${acc['username']} • PIN: ${acc['pin']}',
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
