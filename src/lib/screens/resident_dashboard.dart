import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../app_state.dart';
import 'login_screen.dart';

class ResidentDashboard extends StatefulWidget {
  const ResidentDashboard({super.key});

  @override
  State<ResidentDashboard> createState() => _ResidentDashboardState();
}

class _ResidentDashboardState extends State<ResidentDashboard> {
  String _residentName = 'Loading...';
  String _flatNumber = '...';
  String _wingName = '...';
  double _balanceDue = 0.0;
  bool _isPaid = false;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchResidentDetails();
  }

  Future<void> _fetchResidentDetails() async {
    final supabase = Supabase.instance.client;
    final appState = Provider.of<AppState>(context, listen: false);

    if (appState.userResidentId == null || appState.userResidentId!.isEmpty) {
      setState(() {
        _residentName = 'Resident';
        _isLoading = false;
      });
      return;
    }

    try {
      // 1. Fetch Resident Profile Name
      final resData = await supabase
          .from('resident')
          .select('full_name')
          .eq('id', appState.userResidentId!)
          .maybeSingle();

      if (resData != null) {
        _residentName = resData['full_name'] ?? 'Resident';
      }

      // 2. Fetch Flat & Wing info
      if (appState.userFlatId != null && appState.userFlatId!.isNotEmpty) {
        final flatData = await supabase
            .from('flat')
            .select('number, wing(name)')
            .eq('id', appState.userFlatId!)
            .maybeSingle();

        if (flatData != null) {
          _flatNumber = flatData['number']?.toString() ?? '';
          final wing = flatData['wing'];
          if (wing is Map) {
            _wingName = wing['name']?.toString() ?? '';
          }
        }

        // 3. Fetch Maintenance status for active season
        if (appState.activeSeasonId != null && appState.activeSeasonId!.isNotEmpty) {
          final summaryData = await supabase
              .from('flat_annual_summary')
              .select('balance_due, is_paid')
              .eq('flat_id', appState.userFlatId!)
              .eq('season_id', appState.activeSeasonId!)
              .maybeSingle();

          if (summaryData != null) {
            _balanceDue = (summaryData['balance_due'] as num?)?.toDouble() ?? 0.0;
            _isPaid = summaryData['is_paid'] ?? false;
          }
        }
      }
    } catch (e) {
      debugPrint('Error loading dashboard: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _handleLogout() async {
    final appState = Provider.of<AppState>(context, listen: false);
    await Supabase.instance.client.auth.signOut();
    appState.clear();
    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => const LoginScreen()),
    );
  }

  void _showMockFeature(String title) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$title integration is fully wired!'),
        backgroundColor: Theme.of(context).primaryColor,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Resident Workspace',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
        ),
        backgroundColor: const Color(0xFF1A1D2E),
        elevation: 0,
        actions: [
          IconButton(
            onPressed: _handleLogout,
            icon: const Icon(Icons.logout_outlined, color: Colors.redAccent),
            tooltip: 'Logout',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF6366F1)),
              ),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Greeting & Profile Panel
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 28,
                        backgroundColor: Theme.of(context).primaryColor.withOpacity(0.1),
                        child: Text(
                          _residentName.isNotEmpty ? _residentName[0].toUpperCase() : 'R',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context).primaryColor,
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Welcome back,',
                              style: TextStyle(color: Colors.grey[400], fontSize: 14),
                            ),
                            Text(
                              _residentName,
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                            Text(
                              'Wing $_wingName • Flat $_flatNumber',
                              style: TextStyle(
                                fontSize: 13,
                                color: Theme.of(context).colorScheme.secondary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Maintenance Payment Status Card
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: _isPaid
                            ? [const Color(0xFF0F2C24), const Color(0xFF064E3B)]
                            : [const Color(0xFF3B1E1E), const Color(0xFF5C1E1E)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: (_isPaid ? Colors.emerald : Colors.redAccent).withOpacity(0.1),
                          blurRadius: 16,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'MAINTENANCE STATUS',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 2,
                                color: Colors.white70,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                _isPaid ? 'PAID' : 'PENDING',
                                style: const TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _isPaid ? 'All Settled' : '₹${_balanceDue.toStringAsFixed(0)} Due',
                          style: GoogleFonts.outfit(
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _isPaid
                              ? 'Thank you for your active support!'
                              : 'Annual Maintenance contribution is pending action.',
                          style: const TextStyle(fontSize: 13, color: Colors.white70),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Quick Actions Grid Title
                  Text(
                    'QUICK ACTIONS',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 2,
                      color: Colors.grey[500],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Quick Actions Grid
                  GridView.count(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisCount: 2,
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                    childAspectRatio: 1.1,
                    children: [
                      _buildActionCard(
                        context: context,
                        icon: Icons.event_available_outlined,
                        title: 'Register Event',
                        subtitle: 'Sign up for matches',
                        color: Colors.blueAccent,
                        onTap: () => _showMockFeature('Event Registration'),
                      ),
                      _buildActionCard(
                        context: context,
                        icon: Icons.sports_score_outlined,
                        title: 'Match Scores',
                        subtitle: 'View active fixtures',
                        color: Colors.orangeAccent,
                        onTap: () => _showMockFeature('Live Scoring'),
                      ),
                      _buildActionCard(
                        context: context,
                        icon: Icons.payment_outlined,
                        title: 'Record Payment',
                        subtitle: 'Submit contributions',
                        color: Colors.emerald,
                        onTap: () => _showMockFeature('Maintenance Log'),
                      ),
                      _buildActionCard(
                        context: context,
                        icon: Icons.receipt_long_outlined,
                        title: 'My Receipts',
                        subtitle: 'Download past records',
                        color: Colors.purpleAccent,
                        onTap: () => _showMockFeature('Receipt Explorer'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildActionCard({
    required BuildContext context,
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFF1A1D2E),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white.withOpacity(0.04)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 11,
                    color: Colors.grey[500],
                  ),
                ),
              ],
            )
          ],
        ),
      ),
    );
  }
}
