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
      'name': 'SCOT Admin 1 (SCOT Admin)',
      'username': 'SCOTAdmin1',
      'pin': '0122',
      'type': 'COORDINATOR'
    },
    {
      'name': 'SCOT Admin 2 (SCOT Admin)',
      'username': 'SCOTAdmin2',
      'pin': '0133',
      'type': 'COORDINATOR'
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
    final username = _usernameController.text.trim().toLowerCase();
    final pin = _pinController.text.trim();

    if (username.isEmpty || pin.isEmpty) {
      _showError('Please fill in all credentials');
      return;
    }

    setState(() => _isLoading = true);
    final appState = Provider.of<AppState>(context, listen: false);

    // Try cloud authentication first (unless activeSeasonId is already demo-season-id)
    if (appState.activeSeasonId == 'demo-season-id') {
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
      return;
    }

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
        
        final rawPorts = result['portfolios'];
        if (rawPorts is List) {
          appState.userPortfolios = List<String>.from(rawPorts);
        } else {
          appState.userPortfolios = [];
        }

        appState.notifyListeners();

        setState(() => _isLoading = false);
        _showSuccess('Welcome back, ${result['name']}!');
        if (!mounted) return;
        _routeUser(appState.userRole);
      } else {
        // Auth returned success=false (e.g. invalid username or PIN).
        // Check if username matches a demo account to fall back to demo mode.
        final isDemo = appState.demoResidentAccounts.containsKey(username) ||
                      appState.demoCoordinatorAccounts.containsKey(username);
        if (isDemo) {
          final res = appState.authenticateUserInDemo(username, pin);
          setState(() => _isLoading = false);
          if (res['success'] == true) {
            _showSuccess('Welcome back, ${res['name']}! (Demo Fallback)');
            if (!mounted) return;
            _routeUser(res['role']);
          } else {
            _showError(res['message'] ?? 'Authentication failed');
          }
        } else {
          setState(() => _isLoading = false);
          _showError(result['message'] ?? 'Authentication failed');
        }
      }
    } catch (e) {
      // Cloud RPC failed or threw an exception (e.g. PGRST202 or connection error).
      // Fallback to offline demo authentication if it is a demo account.
      final isDemo = appState.demoResidentAccounts.containsKey(username) ||
                    appState.demoCoordinatorAccounts.containsKey(username);
      if (isDemo) {
        await Future.delayed(const Duration(milliseconds: 400));
        final res = appState.authenticateUserInDemo(username, pin);
        setState(() => _isLoading = false);
        if (res['success'] == true) {
          _showSuccess('Welcome back, ${res['name']}! (Demo Fallback)');
          if (!mounted) return;
          _routeUser(res['role']);
        } else {
          _showError(res['message'] ?? 'Authentication failed');
        }
      } else {
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
          // Background sports photo with dark overlay
          Positioned.fill(
            child: Image.network(
              DesignSystem.imgGeneralSports,
              fit: BoxFit.cover,
            ),
          ),
          Positioned.fill(
            child: Container(
              color: const Color(0xFF0F172A).withOpacity(0.85),
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
                        color: Colors.white.withOpacity(0.1),
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: DesignSystem.primary.withOpacity(0.3),
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
                          errorBuilder: (context, error, stackTrace) => Container(
                            height: 110,
                            width: 110,
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: LinearGradient(colors: [DesignSystem.primary, DesignSystem.secondary]),
                            ),
                            child: const Icon(Icons.sports_soccer_rounded, color: Colors.white, size: 50),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'SCOT TOPAZ',
                    textAlign: TextAlign.center,
                    style: DesignSystem.headingStyle(
                      fontSize: 32,
                      color: Colors.white,
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

                  // Login Form Card (Glassmorphic)
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: DesignSystem.glassDecoration(
                      borderAccentColor: DesignSystem.primary,
                      fillOpacity: 0.12,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        TabBar(
                          controller: _tabController,
                          labelColor: DesignSystem.secondary,
                          unselectedLabelColor: DesignSystem.textMuted,
                          indicatorColor: DesignSystem.secondary,
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
                          style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold, color: Colors.white),
                          decoration: InputDecoration(
                            filled: true,
                            fillColor: Colors.white.withOpacity(0.08),
                            labelText: 'Username or Member ID',
                            labelStyle: DesignSystem.bodyStyle(color: Colors.white70, fontSize: 13),
                            prefixIcon: const Icon(Icons.person_outline_rounded, color: DesignSystem.secondary),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(16),
                              borderSide: BorderSide(color: Colors.white.withOpacity(0.2)),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(16),
                              borderSide: const BorderSide(color: DesignSystem.secondary, width: 2),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // PIN Input
                        TextField(
                          controller: _pinController,
                          keyboardType: TextInputType.number,
                          obscureText: true,
                          maxLength: 4,
                          style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white),
                          decoration: InputDecoration(
                            filled: true,
                            fillColor: Colors.white.withOpacity(0.08),
                            labelText: 'Login PIN',
                            labelStyle: DesignSystem.bodyStyle(color: Colors.white70, fontSize: 13),
                            prefixIcon: const Icon(Icons.lock_outline_rounded, color: DesignSystem.secondary),
                            counterText: '',
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(16),
                              borderSide: BorderSide(color: Colors.white.withOpacity(0.2)),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(16),
                              borderSide: const BorderSide(color: DesignSystem.secondary, width: 2),
                            ),
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

                        // Register Gating Link
                        AnimatedBuilder(
                          animation: _tabController,
                          builder: (context, child) {
                            return Column(
                              children: [
                                const SizedBox(height: 16),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text(
                                      _tabController.index == 0 ? 'New to Topaz? ' : 'New Organizer? ',
                                      style: DesignSystem.bodyStyle(fontSize: 13, color: Colors.white70),
                                    ),
                                    InkWell(
                                      onTap: () {
                                        Navigator.push(
                                          context,
                                          MaterialPageRoute(
                                            builder: (_) => RegisterScreen(
                                              initialIsOrganizer: _tabController.index == 1,
                                            ),
                                          ),
                                        );
                                      },
                                      child: Text(
                                        _tabController.index == 0 ? 'Register Flat' : 'Register Organizer',
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
                  Builder(
                    builder: (context) {
                      final appState = Provider.of<AppState>(context);
                      final List<Map<String, String>> allAccounts = [];

                      // Add coordinators from appState registry
                      appState.demoCoordinatorAccounts.forEach((username, data) {
                        allAccounts.add({
                          'name': '${data['name']} (${(data['role'] as String).replaceAll('_', ' ')})',
                          'username': username,
                          'pin': data['pin'] as String,
                          'type': 'COORDINATOR',
                        });
                      });

                      // Add residents from appState registry
                      appState.demoResidentAccounts.forEach((username, data) {
                        allAccounts.add({
                          'name': '${data['name']} (Resident Flat ${data['wing']}-${data['flat']})',
                          'username': username,
                          'pin': data['pin'] as String,
                          'type': 'RESIDENT',
                        });
                      });

                      // Deduplicate/merge to avoid duplicate entries in ui
                      final seen = <String>{};
                      final uniqueAccounts = allAccounts.where((acc) => seen.add(acc['username']!)).toList();

                      return ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: uniqueAccounts.length,
                        itemBuilder: (context, index) {
                          final acc = uniqueAccounts[index];
                          final isResident = acc['type'] == 'RESIDENT';
                          final Color cardColor = isResident ? DesignSystem.secondary : DesignSystem.accentCoral;

                          return Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            decoration: DesignSystem.glassDecoration(
                              borderAccentColor: cardColor,
                              fillOpacity: 0.08,
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
                                  color: cardColor.withOpacity(0.15),
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
                      );
                    }
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
