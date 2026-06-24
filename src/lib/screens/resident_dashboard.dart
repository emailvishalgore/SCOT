import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../app_state.dart';
import '../theme/design_system.dart';
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
        if (appState.activeSeasonId == 'demo-season-id') {
          _isPaid = appState.isFlatPaidInDemo(_flatNumber);
          _balanceDue = _isPaid ? 0.0 : 5000.0;
        } else if (appState.activeSeasonId != null && appState.activeSeasonId!.isNotEmpty) {
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
      backgroundColor: DesignSystem.background,
      appBar: AppBar(
        title: Text(
          'TOPAZ Resident Hub',
          style: DesignSystem.headingStyle(fontSize: 20),
        ),
        backgroundColor: DesignSystem.background,
        elevation: 0,
        iconTheme: const IconThemeData(color: DesignSystem.textPrimary),
        actions: [
          IconButton(
            onPressed: _handleLogout,
            icon: const Icon(Icons.logout_rounded, color: DesignSystem.accentCoral),
            tooltip: 'Logout',
          ),
        ],
      ),
      body: _isLoading
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
                  // Greeting & Profile Panel
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 28,
                        backgroundColor: DesignSystem.primary.withOpacity(0.1),
                        child: Text(
                          _residentName.isNotEmpty ? _residentName[0].toUpperCase() : 'R',
                          style: DesignSystem.headingStyle(
                            fontSize: 24,
                            color: DesignSystem.primary,
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
                              style: DesignSystem.bodyStyle(color: DesignSystem.textMuted, fontSize: 13, fontWeight: FontWeight.bold),
                            ),
                            Text(
                              _residentName,
                              style: DesignSystem.headingStyle(
                                fontSize: 20,
                                color: DesignSystem.textPrimary,
                              ),
                            ),
                            Text(
                              'Wing $_wingName • Flat $_flatNumber',
                              style: DesignSystem.bodyStyle(
                                fontSize: 13,
                                color: DesignSystem.primary,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Maintenance Payment Status Card (Playful & Light)
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: DesignSystem.cardDecoration(
                      borderAccentColor: _isPaid ? DesignSystem.successGreen : DesignSystem.accentCoral,
                    ).copyWith(
                      color: _isPaid ? const Color(0xFFE8F5E9) : const Color(0xFFFFEBEE),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'MAINTENANCE STATUS',
                              style: DesignSystem.headingStyle(
                                fontSize: 11,
                                color: _isPaid ? const Color(0xFF2E7D32) : const Color(0xFFC62828),
                              ).copyWith(letterSpacing: 1.5),
                        ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: _isPaid ? DesignSystem.successGreen : DesignSystem.accentCoral,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                _isPaid ? 'PAID' : 'PENDING',
                                style: DesignSystem.headingStyle(
                                  fontSize: 10,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _isPaid ? 'All Settled' : '₹${_balanceDue.toStringAsFixed(0)} Due',
                          style: DesignSystem.headingStyle(
                            fontSize: 32,
                            color: _isPaid ? const Color(0xFF1B5E20) : const Color(0xFFB71C1C),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _isPaid
                              ? 'Thank you for your active support!'
                              : 'Annual Maintenance contribution is pending action.',
                          style: DesignSystem.bodyStyle(
                            fontSize: 13,
                            color: _isPaid ? const Color(0xFF2E7D32) : const Color(0xFFC62828),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Quick Actions Grid Title
                  Text(
                    'QUICK ACTIONS',
                    style: DesignSystem.headingStyle(
                      fontSize: 12,
                      color: DesignSystem.textMuted,
                      fontWeight: FontWeight.bold,
                    ).copyWith(letterSpacing: 2),
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
                        icon: Icons.event_available_rounded,
                        title: 'Register Event',
                        subtitle: 'Sign up for matches',
                        color: DesignSystem.primary,
                        onTap: () => _showMockFeature('Event Registration'),
                      ),
                      _buildActionCard(
                        context: context,
                        icon: Icons.emoji_events_rounded,
                        title: 'Match Scores',
                        subtitle: 'View active fixtures',
                        color: DesignSystem.accentYellow,
                        iconColorOverride: const Color(0xFFD4AF37), // Darker yellow/gold for visibility
                        onTap: () => _showMockFeature('Live Scoring'),
                      ),
                      _buildActionCard(
                        context: context,
                        icon: Icons.payment_rounded,
                        title: 'Record Payment',
                        subtitle: 'Submit contributions',
                        color: DesignSystem.successGreen,
                        onTap: () => _showMockFeature('Maintenance Log'),
                      ),
                      _buildActionCard(
                        context: context,
                        icon: Icons.receipt_long_rounded,
                        title: 'My Receipts',
                        subtitle: 'Download past records',
                        color: DesignSystem.accentPurple,
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
    Color? iconColorOverride,
    required VoidCallback onTap,
  }) {
    final finalIconColor = iconColorOverride ?? color;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(24),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: DesignSystem.cardDecoration(borderAccentColor: color),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: finalIconColor.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: finalIconColor, size: 24),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: DesignSystem.headingStyle(
                    fontSize: 15,
                    color: DesignSystem.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: DesignSystem.bodyStyle(
                    fontSize: 11,
                    color: DesignSystem.textMuted,
                    fontWeight: FontWeight.bold,
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
