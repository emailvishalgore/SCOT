import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../app_state.dart';
import '../theme/design_system.dart';
import 'login_screen.dart';
import 'admin_onboarding_screen.dart';
import 'resident_onboarding_screen.dart';
import 'record_payment_screen.dart';
import 'approve_expenses_screen.dart';
import 'record_score_screen.dart';
import 'create_competition_screen.dart';
import 'finance_portal_screen.dart';
import 'approve_registrations_screen.dart';
import 'gallery_screen.dart';
import 'announcements_screen.dart';

class CoordinatorDashboard extends StatefulWidget {
  const CoordinatorDashboard({super.key});

  @override
  State<CoordinatorDashboard> createState() => _CoordinatorDashboardState();
}

class _CoordinatorDashboardState extends State<CoordinatorDashboard> {
  String _coordName = 'Loading...';
  String _coordRole = '...';
  int _pendingApprovals = 3;
  int _registeredResidentsCount = 45;
  double _totalCollections = 120000.0;
  bool _isLoading = true;

  // Cloud/DB members directory for admin portfolio panel
  List<Map<String, dynamic>> _liveMembers = [];

  @override
  void initState() {
    super.initState();
    _fetchCoordinatorDetails();
  }

  Future<void> _fetchCoordinatorDetails() async {
    final supabase = Supabase.instance.client;
    final appState = Provider.of<AppState>(context, listen: false);

    if (appState.activeSeasonId == 'demo-season-id') {
      setState(() {
        _coordName = 'Alice Core';
        // Match name with role if possible
        if (appState.userRole == 'SCOT_ADMIN') {
          _coordName = 'SCOT Admin';
        } else if (appState.userRole == 'CORE_TEAM') {
          _coordName = 'Alice Core';
        } else if (appState.userRole == 'EVENT_CHAMPION') {
          _coordName = 'Bob Champion';
        } else if (appState.userRole == 'WING_COMMANDER') {
          _coordName = 'Charlie Commander';
        } else if (appState.userRole == 'WING_CAPTAIN') {
          _coordName = 'David Captain';
        }
        _coordRole = (appState.userRole ?? 'MEMBER').replaceAll('_', ' ');
        _pendingApprovals = appState.demoPendingApprovals;
        _isLoading = false;
      });
      return;
    }

    try {
      // 1. Fetch member details from DB
      if (appState.userMemberId != null && appState.userMemberId!.isNotEmpty) {
        final memberData = await supabase
            .from('member')
            .select('name')
            .eq('id', appState.userMemberId!)
            .maybeSingle();
        if (memberData != null) {
          _coordName = memberData['name'] ?? 'Coordinator';
        }
      } else if (appState.userResidentId != null && appState.userResidentId!.isNotEmpty) {
        final resData = await supabase
            .from('resident')
            .select('full_name')
            .eq('id', appState.userResidentId!)
            .maybeSingle();
        if (resData != null) {
          _coordName = resData['full_name'] ?? 'Coordinator';
        }
      }

      _coordRole = (appState.userRole ?? 'MEMBER').replaceAll('_', ' ');

      // 2. Load metrics
      if (appState.activeSeasonId != null && appState.activeSeasonId!.isNotEmpty) {
        final paymentSum = await supabase
            .from('flat_annual_summary')
            .select('amount_paid')
            .eq('season_id', appState.activeSeasonId!);

        if (paymentSum != null) {
          double total = 0.0;
          for (var row in paymentSum) {
            total += (row['amount_paid'] as num?)?.toDouble() ?? 0.0;
          }
          _totalCollections = total;
        }

        final residentCountRes = await supabase.from('resident').select('id');
        _registeredResidentsCount = residentCountRes.length;

        // Fetch onboarded members list for admin panel
        if (appState.userRole == 'SCOT_ADMIN') {
          final membersResponse = await supabase
              .from('member')
              .select('id, name, phone');
          if (membersResponse != null) {
            final List<Map<String, dynamic>> members = [];
            for (var m in membersResponse) {
              // Try to find role assignment
              final assignRes = await supabase
                  .from('member_season_assignment')
                  .select('role')
                  .eq('member_id', m['id'])
                  .eq('season_id', appState.activeSeasonId!)
                  .maybeSingle();
              
              final role = assignRes != null ? assignRes['role']?.toString() : 'CORE_TEAM';
              
              // Load portfolios
              List<String> ports = [];
              if (assignRes != null) {
                final portsRes = await supabase
                    .from('member_portfolio_assignment')
                    .select('portfolio(name)')
                    .eq('member_assignment_id', m['id']);
                if (portsRes != null) {
                  for (var p in portsRes) {
                    final pMap = p['portfolio'];
                    if (pMap is Map) {
                      ports.add(pMap['name']?.toString() ?? '');
                    }
                  }
                }
              }

              members.add({
                'id': m['id'],
                'name': m['name'] ?? 'Unknown',
                'role': role,
                'portfolios': ports,
              });
            }
            _liveMembers = members;
          }
        }
      }
    } catch (e) {
      debugPrint('Error loading coordinator details: $e');
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

  void _showSnackbar(String msg, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg, style: GoogleFonts.nunito(fontWeight: FontWeight.bold)),
        backgroundColor: color,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final theme = PersonaTheme.getTheme(appState.userRole);

    if (_isLoading) {
      return Scaffold(
        backgroundColor: const Color(0xFF0F172A),
        body: Center(
          child: CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(theme.primaryColor),
          ),
        ),
      );
    }

    // Determine tabs based on role & portfolios
    final List<Widget> tabLabels = [];
    final List<Widget> tabViews = [];

    if (appState.userRole == 'SCOT_ADMIN') {
      tabLabels.addAll([
        const Tab(text: 'Overview'),
        const Tab(text: 'Requests'),
        const Tab(text: 'Control Desk'),
      ]);
      tabViews.addAll([
        _buildAdminOverviewTab(appState, theme),
        _buildAdminRequestsTab(appState, theme),
        _buildAdminControlDeskTab(appState, theme),
      ]);
    } else if (appState.userRole == 'CORE_TEAM') {
      final portfolios = appState.userPortfolios;
      if (portfolios.isEmpty) {
        tabLabels.add(const Tab(text: 'Summary'));
        tabViews.add(_buildDefaultSummaryTab(appState, theme));
      } else {
        if (portfolios.contains('Finance')) {
          tabLabels.add(const Tab(text: 'Dues Board'));
          tabViews.add(_buildDuesBoardTab(appState, theme));
          tabLabels.add(const Tab(text: 'Expense Approvals'));
          tabViews.add(_buildExpenseApprovalsTab(appState, theme));
        }
        if (portfolios.contains('Sponsorship')) {
          tabLabels.add(const Tab(text: 'Sponsorships'));
          tabViews.add(_buildSponsorshipsTab(appState, theme));
        }
        if (portfolios.contains('Communication and Media')) {
          tabLabels.add(const Tab(text: 'Notice Board'));
          tabViews.add(_buildNoticeBoardTab(appState, theme));
          tabLabels.add(const Tab(text: 'Photo Gallery'));
          tabViews.add(_buildPhotoGalleryTab(appState, theme));
        }
        if (portfolios.contains('Vendor & Logistics')) {
          tabLabels.add(const Tab(text: 'Quotations'));
          tabViews.add(_buildQuotationsTab(appState, theme));
        }
        if (portfolios.contains('Food & Stalls')) {
          tabLabels.add(const Tab(text: 'Food Stalls'));
          tabViews.add(_buildFoodStallsTab(appState, theme));
        }
      }
    } else if (appState.userRole == 'EVENT_CHAMPION') {
      final portfolios = appState.userPortfolios;
      if (portfolios.isEmpty) {
        tabLabels.add(const Tab(text: 'Summary'));
        tabViews.add(_buildDefaultSummaryTab(appState, theme));
      } else {
        if (portfolios.contains('Sports events')) {
          tabLabels.add(const Tab(text: 'Sports Console'));
          tabViews.add(_buildSportsConsoleTab(appState, theme));
          tabLabels.add(const Tab(text: 'Sports Scores'));
          tabViews.add(_buildSportsScoresTab(appState, theme));
        }
        if (portfolios.contains('Cultural events')) {
          tabLabels.add(const Tab(text: 'Cultural Console'));
          tabViews.add(_buildCulturalConsoleTab(appState, theme));
          tabLabels.add(const Tab(text: 'Cultural Scores'));
          tabViews.add(_buildCulturalScoresTab(appState, theme));
        }
        if (portfolios.contains('Sports events') || portfolios.contains('Cultural events')) {
          tabLabels.add(const Tab(text: 'Upload Media'));
          tabViews.add(_buildPhotoGalleryUploaderTab(appState, theme));
        }
      }
    } else if (appState.userRole == 'WING_COMMANDER') {
      tabLabels.addAll([
        const Tab(text: 'Flats Registry'),
        const Tab(text: 'Ledger'),
        const Tab(text: 'Expenses'),
        const Tab(text: 'Wing Notices'),
      ]);
      tabViews.addAll([
        _buildWingFlatsRegistryTab(appState, theme),
        _buildWingLedgerTab(appState, theme),
        _buildWingExpensesTab(appState, theme),
        _buildWingNoticesTab(appState, theme),
      ]);
    } else if (appState.userRole == 'WING_CAPTAIN') {
      tabLabels.addAll([
        const Tab(text: 'Wing Flats'),
        const Tab(text: 'Reg Helper'),
        const Tab(text: 'Notices'),
      ]);
      tabViews.addAll([
        _buildWingFlatsRegistryTab(appState, theme, readOnly: true),
        _buildWingRegHelperTab(appState, theme),
        _buildWingNoticesTab(appState, theme, readOnly: true),
      ]);
    }

    if (tabLabels.isEmpty) {
      tabLabels.add(const Tab(text: 'Dashboard'));
      tabViews.add(Center(
        child: Text(
          'No views configured for role: ${appState.userRole}',
          style: DesignSystem.headingStyle(color: Colors.white, fontSize: 16),
        ),
      ));
    }

    return DefaultTabController(
      length: tabLabels.length,
      child: Scaffold(
        body: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: theme.bgGradient,
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Stack(
            children: [
              // Glowing background blur blobs
              Positioned(
                top: -150,
                left: -100,
                child: GlowBlob(
                  width: 350,
                  height: 350,
                  color: theme.primaryColor,
                ),
              ),
              Positioned(
                bottom: -100,
                right: -100,
                child: GlowBlob(
                  width: 300,
                  height: 300,
                  color: theme.secondaryColor,
                ),
              ),
              Positioned(
                top: 300,
                left: -50,
                child: GlowBlob(
                  width: 200,
                  height: 200,
                  color: theme.accentColor,
                ),
              ),
              // Main content
              SafeArea(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _buildHeaderWidget(appState, theme),
                    _buildCustomTabBar(tabLabels, theme),
                    Expanded(
                      child: TabBarView(
                        children: tabViews,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // --- HEADER & NAVIGATION COMPONENT ---

  Widget _buildHeaderWidget(AppState appState, PersonaTheme theme) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: GlassCard(
        baseColor: theme.glassBaseColor,
        padding: const EdgeInsets.all(16),
        fillOpacity: 0.12,
        child: Row(
          children: [
            CircleAvatar(
              radius: 28,
              backgroundColor: theme.primaryColor.withOpacity(0.2),
              child: FreshIcon(
                icon: Icons.admin_panel_settings_rounded,
                color: theme.primaryColor,
                size: 24,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _coordName,
                    style: DesignSystem.headingStyle(
                      fontSize: 18,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: theme.primaryColor.withOpacity(0.3),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: theme.primaryColor.withOpacity(0.5)),
                        ),
                        child: Text(
                          _coordRole.toUpperCase(),
                          style: GoogleFonts.nunito(
                            fontSize: 10,
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      if (appState.userWingId != null && appState.userWingId!.isNotEmpty) ...[
                        const SizedBox(width: 8),
                        Text(
                          'Wing ${appState.userWingId}',
                          style: DesignSystem.bodyStyle(
                            fontSize: 12,
                            color: Colors.white70,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ]
                    ],
                  ),
                ],
              ),
            ),
            IconButton(
              onPressed: _handleLogout,
              icon: FreshIcon(
                icon: Icons.logout_rounded,
                color: Colors.white,
                size: 20,
              ),
              tooltip: 'Logout',
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCustomTabBar(List<Widget> tabLabels, PersonaTheme theme) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      child: GlassCard(
        baseColor: theme.glassBaseColor,
        padding: EdgeInsets.zero,
        borderRadius: 16,
        fillOpacity: 0.08,
        child: TabBar(
          isScrollable: true,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white55,
          indicatorSize: TabBarIndicatorSize.tab,
          indicator: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            color: theme.primaryColor.withOpacity(0.35),
            border: Border.all(color: theme.primaryColor.withOpacity(0.5)),
          ),
          tabs: tabLabels,
          labelStyle: DesignSystem.headingStyle(fontSize: 13),
          unselectedLabelStyle: DesignSystem.bodyStyle(fontSize: 13, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }

  // --- PERSONA dashboard TAB VIEWS ---

  // 1. SCOT Admin Overview Tab
  Widget _buildAdminOverviewTab(AppState appState, PersonaTheme theme) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Banner Image
          _buildBannerImage(
            'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&auto=format&fit=crop&q=80',
            'SCOT ADMIN CENTER',
            'Empowering Community Harmony & Fixtures',
            theme,
          ),
          const SizedBox(height: 16),

          // Active Season Details Card
          GlassCard(
            baseColor: theme.glassBaseColor,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('ACTIVE SEASON', style: DesignSystem.headingStyle(fontSize: 15, color: Colors.white)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.green.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.greenAccent),
                      ),
                      child: Text('LIVE', style: DesignSystem.headingStyle(fontSize: 9, color: Colors.greenAccent)),
                    )
                  ],
                ),
                const SizedBox(height: 12),
                Text('Season 2026 (Active)', style: DesignSystem.headingStyle(fontSize: 22, color: theme.secondaryColor)),
                const SizedBox(height: 4),
                Text('Duration: June 2026 - Dec 2026', style: DesignSystem.bodyStyle(fontSize: 13, color: Colors.white70)),
                const Divider(color: Colors.white24, height: 24),
                Row(
                  children: [
                    Expanded(
                      child: _buildMiniMetric('COLLECTIONS', '₹${_totalCollections.toStringAsFixed(0)}', Icons.payments_rounded, theme.secondaryColor),
                    ),
                    Expanded(
                      child: _buildMiniMetric('FLATS REG', '$_registeredResidentsCount / 280', Icons.home_work_rounded, theme.primaryColor),
                    ),
                  ],
                )
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Organized Events Summary
          Text('ORGANIZED EVENTS FOR THIS SEASON', style: DesignSystem.headingStyle(fontSize: 13, color: Colors.white70).copyWith(letterSpacing: 1.5)),
          const SizedBox(height: 12),
          _buildAdminEventRow('Football Cup', 'Sports', '48 Residents', Icons.sports_soccer_rounded, Colors.orangeAccent),
          _buildAdminEventRow('Badminton League', 'Sports', '24 Residents', Icons.sports_handball_rounded, Colors.orangeAccent),
          _buildAdminEventRow('Rangoli Showcase', 'Cultural', '15 Residents', Icons.color_lens_rounded, Colors.pinkAccent),
          _buildAdminEventRow('Art Carnival', 'Cultural', '20 Residents', Icons.brush_rounded, Colors.pinkAccent),
        ],
      ),
    );
  }

  // 2. SCOT Admin Requests Tab (Approve registrations & coordinators)
  Widget _buildAdminRequestsTab(AppState appState, PersonaTheme theme) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('PENDING RESIDENT FLATS', style: DesignSystem.headingStyle(fontSize: 13, color: Colors.white70)),
          const SizedBox(height: 12),
          appState.demoPendingRegistrations.isEmpty
              ? _buildEmptyState('No pending resident requests', Icons.done_all_rounded)
              : ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: appState.demoPendingRegistrations.length,
                  itemBuilder: (context, index) {
                    final req = appState.demoPendingRegistrations[index];
                    return GlassCard(
                      baseColor: theme.glassBaseColor,
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Flat ${req['wing']}-${req['flat']}', style: DesignSystem.headingStyle(fontSize: 16, color: Colors.white)),
                              Text('PIN: ${req['pin']}', style: DesignSystem.bodyStyle(fontSize: 12, color: Colors.white55)),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text('Username: ${req['username']}', style: DesignSystem.bodyStyle(fontSize: 13, color: Colors.white70)),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: Text('Members: ${(req['members'] as List).length} onboarded', style: DesignSystem.bodyStyle(fontSize: 12, color: Colors.white55)),
                              ),
                              ElevatedButton(
                                onPressed: () {
                                  appState.approveRegistrationRequestInDemo(req['id']);
                                  _showSnackbar('Flat ${req['wing']}-${req['flat']} registration approved!', Colors.green);
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.green,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                                child: Text('APPROVE', style: DesignSystem.headingStyle(fontSize: 11, color: Colors.white)),
                              )
                            ],
                          )
                        ],
                      ),
                    );
                  },
                ),
          const SizedBox(height: 24),
          Text('PENDING COORDINATOR LOGINS', style: DesignSystem.headingStyle(fontSize: 13, color: Colors.white70)),
          const SizedBox(height: 12),
          appState.demoPendingCoordinators.isEmpty
              ? _buildEmptyState('No pending coordinator signups', Icons.supervisor_account_rounded)
              : ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: appState.demoPendingCoordinators.length,
                  itemBuilder: (context, index) {
                    final req = appState.demoPendingCoordinators[index];
                    return GlassCard(
                      baseColor: theme.glassBaseColor,
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(req['username'], style: DesignSystem.headingStyle(fontSize: 16, color: Colors.white)),
                              Text('PIN: ${req['pin']}', style: DesignSystem.bodyStyle(fontSize: 12, color: Colors.white55)),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text('Role requested: ${req['role']}', style: DesignSystem.bodyStyle(fontSize: 13, color: Colors.white70)),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              ElevatedButton(
                                onPressed: () {
                                  appState.approveOrganizerRegistrationRequestInDemo(req['id']);
                                  _showSnackbar('Coordinator ${req['username']} registration approved!', Colors.green);
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.green,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                                child: Text('APPROVE', style: DesignSystem.headingStyle(fontSize: 11, color: Colors.white)),
                              )
                            ],
                          )
                        ],
                      ),
                    );
                  },
                ),
        ],
      ),
    );
  }

  // 3. SCOT Admin Control Desk Tab
  Widget _buildAdminControlDeskTab(AppState appState, PersonaTheme theme) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Onboard Organizers Tile
          _buildActionConsoleTile(
            icon: Icons.person_add_alt_1_rounded,
            title: 'Onboard Committee Organizer',
            subtitle: 'Register Core Team, Wing Commanders, Wing Captains, or Event Champions',
            color: theme.primaryColor,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const AdminOnboardingScreen()),
              );
            },
          ),
          
          // Delete flat registry Tile
          _buildActionConsoleTile(
            icon: Icons.delete_sweep_rounded,
            title: 'Wipe / Reset Flat Entry',
            subtitle: 'Delete all residents and payment details associated with flat',
            color: Colors.redAccent,
            onTap: () {
              _showDeleteFlatDialog();
            },
          ),
          const SizedBox(height: 24),

          // Portfolio Assignment Panel
          Text('PORTFOLIO PROVISIONING PANEL', style: DesignSystem.headingStyle(fontSize: 14, color: Colors.white)),
          const SizedBox(height: 4),
          Text('Assign portfolios to Core and Event Champions below:', style: DesignSystem.bodyStyle(fontSize: 12, color: Colors.white55)),
          const SizedBox(height: 12),

          // Render members list
          if (appState.activeSeasonId == 'demo-season-id') ...[
            _buildDemoMemberAssignmentTile('coremember1', 'Alice Core', 'CORE_TEAM', appState, theme),
            _buildDemoMemberAssignmentTile('eventchamp1', 'Bob Champion', 'EVENT_CHAMPION', appState, theme),
          ] else ...[
            _liveMembers.isEmpty
                ? const Center(child: Text('No coordinators found in DB', style: TextStyle(color: Colors.white55)))
                : Column(
                    children: _liveMembers.map((m) {
                      return _buildCloudMemberAssignmentTile(m, appState, theme);
                    }).toList(),
                  )
          ],
        ],
      ),
    );
  }

  Widget _buildDemoMemberAssignmentTile(String username, String displayName, String role, AppState appState, PersonaTheme theme) {
    final acc = appState.demoCoordinatorAccounts[username];
    final List<String> currentPorts = List<String>.from(acc?['portfolios'] ?? []);

    return GlassCard(
      baseColor: theme.glassBaseColor,
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: theme.primaryColor.withOpacity(0.1),
            child: Icon(Icons.shield_outlined, color: theme.primaryColor),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(displayName, style: DesignSystem.headingStyle(fontSize: 15, color: Colors.white)),
                Text('Role: $role', style: DesignSystem.bodyStyle(fontSize: 12, color: Colors.white70)),
                const SizedBox(height: 4),
                Text(
                  currentPorts.isEmpty ? 'No portfolios assigned' : 'Portfolios: ${currentPorts.join(', ')}',
                  style: DesignSystem.bodyStyle(fontSize: 11, color: theme.secondaryColor, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: () => _openPortfolioAssignmentDialog(username, role, currentPorts, appState, theme),
            style: ElevatedButton.styleFrom(
              backgroundColor: theme.primaryColor,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: Text('ASSIGN', style: DesignSystem.headingStyle(fontSize: 11, color: Colors.white)),
          )
        ],
      ),
    );
  }

  Widget _buildCloudMemberAssignmentTile(Map<String, dynamic> member, AppState appState, PersonaTheme theme) {
    final String memberId = member['id'];
    final String name = member['name'];
    final String role = member['role'];
    final List<String> currentPorts = List<String>.from(member['portfolios'] ?? []);

    if (role != 'CORE_TEAM' && role != 'EVENT_CHAMPION') return const SizedBox.shrink();

    return GlassCard(
      baseColor: theme.glassBaseColor,
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: theme.primaryColor.withOpacity(0.1),
            child: Icon(Icons.shield_outlined, color: theme.primaryColor),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: DesignSystem.headingStyle(fontSize: 15, color: Colors.white)),
                Text('Role: $role', style: DesignSystem.bodyStyle(fontSize: 12, color: Colors.white70)),
                const SizedBox(height: 4),
                Text(
                  currentPorts.isEmpty ? 'No portfolios assigned' : 'Portfolios: ${currentPorts.join(', ')}',
                  style: DesignSystem.bodyStyle(fontSize: 11, color: theme.secondaryColor, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: () => _openCloudPortfolioAssignmentDialog(memberId, role, currentPorts, appState, theme),
            style: ElevatedButton.styleFrom(
              backgroundColor: theme.primaryColor,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: Text('ASSIGN', style: DesignSystem.headingStyle(fontSize: 11, color: Colors.white)),
          )
        ],
      ),
    );
  }

  void _openPortfolioAssignmentDialog(String username, String role, List<String> currentPorts, AppState appState, PersonaTheme theme) {
    final List<String> corePortfolios = ['Finance', 'Sponsorship', 'Communication and Media', 'Vendor & Logistics', 'Food & Stalls'];
    final List<String> eventPortfolios = ['Sports events', 'Cultural events'];
    
    final targets = (role == 'CORE_TEAM') ? corePortfolios : eventPortfolios;
    final List<String> selected = List<String>.from(currentPorts);

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: const Color(0xFF1E293B),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
              title: Text(
                'Assign Portfolios',
                style: DesignSystem.headingStyle(fontSize: 18, color: Colors.white),
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: targets.map((port) {
                  final checked = selected.contains(port);
                  return CheckboxListTile(
                    title: Text(port, style: DesignSystem.bodyStyle(color: Colors.white, fontSize: 14)),
                    value: checked,
                    activeColor: theme.primaryColor,
                    checkColor: Colors.white,
                    onChanged: (val) {
                      setDialogState(() {
                        if (val == true) {
                          selected.add(port);
                        } else {
                          selected.remove(port);
                        }
                      });
                    },
                  );
                }).toList(),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text('CANCEL', style: DesignSystem.headingStyle(fontSize: 12, color: Colors.white70)),
                ),
                ElevatedButton(
                  onPressed: () {
                    appState.updateCoordinatorPortfoliosInDemo(username, selected);
                    Navigator.pop(context);
                    _showSnackbar('Portfolios updated successfully (Demo)', Colors.green);
                    setState(() {});
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: theme.primaryColor),
                  child: Text('SAVE', style: DesignSystem.headingStyle(fontSize: 12, color: Colors.white)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _openCloudPortfolioAssignmentDialog(String memberId, String role, List<String> currentPorts, AppState appState, PersonaTheme theme) {
    final List<String> corePortfolios = ['Finance', 'Sponsorship', 'Communication and Media', 'Vendor & Logistics', 'Food & Stalls'];
    final List<String> eventPortfolios = ['Sports events', 'Cultural events'];
    
    final targets = (role == 'CORE_TEAM') ? corePortfolios : eventPortfolios;
    final List<String> selected = List<String>.from(currentPorts);

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: const Color(0xFF1E293B),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
              title: Text(
                'Assign Portfolios',
                style: DesignSystem.headingStyle(fontSize: 18, color: Colors.white),
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: targets.map((port) {
                  final checked = selected.contains(port);
                  return CheckboxListTile(
                    title: Text(port, style: DesignSystem.bodyStyle(color: Colors.white, fontSize: 14)),
                    value: checked,
                    activeColor: theme.primaryColor,
                    checkColor: Colors.white,
                    onChanged: (val) {
                      setDialogState(() {
                        if (val == true) {
                          selected.add(port);
                        } else {
                          selected.remove(port);
                        }
                      });
                    },
                  );
                }).toList(),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text('CANCEL', style: DesignSystem.headingStyle(fontSize: 12, color: Colors.white70)),
                ),
                ElevatedButton(
                  onPressed: () async {
                    Navigator.pop(context);
                    setState(() => _isLoading = true);
                    try {
                      final supabase = Supabase.instance.client;
                      await supabase.rpc('update_member_portfolios', params: {
                        'p_member_id': memberId,
                        'p_role': role,
                        'p_portfolio_names': selected,
                      });
                      _showSnackbar('Portfolios updated successfully!', Colors.green);
                      await _fetchCoordinatorDetails();
                    } catch (e) {
                      _showSnackbar('Error updating portfolios: ${e.toString()}', Colors.redAccent);
                      setState(() => _isLoading = false);
                    }
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: theme.primaryColor),
                  child: Text('SAVE', style: DesignSystem.headingStyle(fontSize: 12, color: Colors.white)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  // 4. Default Coordinator Summary Tab
  Widget _buildDefaultSummaryTab(AppState appState, PersonaTheme theme) {
    return Center(
      child: GlassCard(
        baseColor: theme.glassBaseColor,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            FreshIcon(icon: Icons.shield_moon_rounded, color: theme.secondaryColor, size: 48),
            const SizedBox(height: 16),
            Text('No Portfolios Assigned', style: DesignSystem.headingStyle(color: Colors.white, fontSize: 18)),
            const SizedBox(height: 6),
            Text(
              'Please contact your SCOT Admin to provision your coordinator dashboard tabs.',
              textAlign: TextAlign.center,
              style: DesignSystem.bodyStyle(color: Colors.white70, fontSize: 13),
            ),
          ],
        ),
      ),
    );
  }

  // --- CORE TEAM PORTFOLIOS TABS ---

  Widget _buildDuesBoardTab(AppState appState, PersonaTheme theme) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildBannerImage(
            'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80',
            'SOCIETY DUES BOARD',
            'Flat Annual Maintenance & Contributions',
            theme,
          ),
          const SizedBox(height: 16),
          GlassCard(
            baseColor: theme.glassBaseColor,
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Record Payment', style: DesignSystem.headingStyle(fontSize: 16, color: Colors.white)),
                    FreshIcon(icon: Icons.payments_rounded, color: theme.primaryColor),
                  ],
                ),
                const SizedBox(height: 8),
                Text('Log contribution collections offline or via live procedure.', style: DesignSystem.bodyStyle(fontSize: 12, color: Colors.white70)),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const RecordPaymentScreen()),
                    ).then((_) => _fetchCoordinatorDetails());
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: theme.primaryColor,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Text('LOG FLATS PAYMENT', style: DesignSystem.headingStyle(fontSize: 12, color: Colors.white)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildExpenseApprovalsTab(AppState appState, PersonaTheme theme) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('PENDING BUDGET EXPENDITURE', style: DesignSystem.headingStyle(fontSize: 15, color: Colors.white)),
          const SizedBox(height: 12),
          appState.demoExpenses.where((e) => e['status'] == 'PENDING').isEmpty
              ? _buildEmptyState('No pending budget approvals', Icons.fact_check_rounded)
              : ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: appState.demoExpenses.where((e) => e['status'] == 'PENDING').length,
                  itemBuilder: (context, index) {
                    final item = appState.demoExpenses.where((e) => e['status'] == 'PENDING').toList()[index];
                    return GlassCard(
                      baseColor: theme.glassBaseColor,
                      margin: const EdgeInsets.only(bottom: 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(item['title'], style: DesignSystem.headingStyle(fontSize: 15, color: Colors.white)),
                              Text('₹${item['amount'].toStringAsFixed(0)}', style: DesignSystem.headingStyle(fontSize: 15, color: theme.secondaryColor)),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text('Vendor: ${item['vendor']}', style: DesignSystem.bodyStyle(fontSize: 12, color: Colors.white70)),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              ElevatedButton(
                                onPressed: () {
                                  appState.approveExpenseInDemo(item['id']);
                                  _showSnackbar('Expense approved! (Demo Mode)', Colors.green);
                                },
                                style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                                child: Text('APPROVE', style: DesignSystem.headingStyle(fontSize: 11, color: Colors.white)),
                              ),
                            ],
                          )
                        ],
                      ),
                    );
                  },
                ),
        ],
      ),
    );
  }

  Widget _buildSponsorshipsTab(AppState appState, PersonaTheme theme) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('SPONSORS LEDGER', style: DesignSystem.headingStyle(fontSize: 15, color: Colors.white)),
              ElevatedButton.icon(
                onPressed: () {
                  _showAddSponsorDialog(appState, theme);
                },
                icon: const Icon(Icons.add, size: 16),
                label: const Text('ADD SPONSOR'),
                style: ElevatedButton.styleFrom(backgroundColor: theme.primaryColor),
              )
            ],
          ),
          const SizedBox(height: 12),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: appState.demoSponsors.length,
            itemBuilder: (context, index) {
              final spon = appState.demoSponsors[index];
              return GlassCard(
                baseColor: theme.glassBaseColor,
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: FreshIcon(icon: Icons.star_border_rounded, color: theme.secondaryColor),
                  title: Text(spon['name'], style: DesignSystem.headingStyle(fontSize: 15, color: Colors.white)),
                  subtitle: Text('Tier: ${spon['tier']}', style: DesignSystem.bodyStyle(fontSize: 12, color: Colors.white70)),
                  trailing: Text('₹${spon['amount'].toStringAsFixed(0)}', style: DesignSystem.headingStyle(fontSize: 15, color: theme.secondaryColor)),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  void _showAddSponsorDialog(AppState appState, PersonaTheme theme) {
    final nameCtrl = TextEditingController();
    final amtCtrl = TextEditingController();
    String tier = 'GOLD';

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: const Color(0xFF1E293B),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              title: Text('Add New Sponsor', style: DesignSystem.headingStyle(color: Colors.white, fontSize: 16)),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: nameCtrl,
                    style: const TextStyle(color: Colors.white),
                    decoration: const InputDecoration(labelText: 'Sponsor Name', labelStyle: TextStyle(color: Colors.white60)),
                  ),
                  TextField(
                    controller: amtCtrl,
                    style: const TextStyle(color: Colors.white),
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Contribution Amount (₹)', labelStyle: TextStyle(color: Colors.white60)),
                  ),
                  const SizedBox(height: 16),
                  DropdownButton<String>(
                    value: tier,
                    dropdownColor: const Color(0xFF1E293B),
                    style: const TextStyle(color: Colors.white),
                    onChanged: (val) {
                      if (val != null) {
                        setDialogState(() => tier = val);
                      }
                    },
                    items: ['PLATINUM', 'GOLD', 'SILVER', 'BRONZE'].map((t) {
                      return DropdownMenuItem(value: t, child: Text(t));
                    }).toList(),
                  )
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('CANCEL', style: TextStyle(color: Colors.white60)),
                ),
                ElevatedButton(
                  onPressed: () {
                    final name = nameCtrl.text.trim();
                    final amt = double.tryParse(amtCtrl.text) ?? 0.0;
                    if (name.isNotEmpty && amt > 0) {
                      appState.addSponsorInDemo({
                        'id': 'spon-${DateTime.now().millisecondsSinceEpoch}',
                        'name': name,
                        'amount': amt,
                        'tier': tier,
                      });
                      Navigator.pop(context);
                      _showSnackbar('Sponsor added successfully!', Colors.green);
                      setState(() {});
                    }
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: theme.primaryColor),
                  child: const Text('SAVE'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildNoticeBoardTab(AppState appState, PersonaTheme theme) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('COMMUNICATION BOARD', style: DesignSystem.headingStyle(fontSize: 15, color: Colors.white)),
              ElevatedButton.icon(
                onPressed: () {
                  _showCreateNoticeDialog(appState, theme);
                },
                icon: const Icon(Icons.campaign_rounded, size: 16),
                label: const Text('POST NOTICE'),
                style: ElevatedButton.styleFrom(backgroundColor: theme.primaryColor),
              )
            ],
          ),
          const SizedBox(height: 12),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: appState.demoAnnouncements.length,
            itemBuilder: (context, index) {
              final ann = appState.demoAnnouncements[index];
              return GlassCard(
                baseColor: theme.glassBaseColor,
                margin: const EdgeInsets.only(bottom: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(ann['title'], style: DesignSystem.headingStyle(fontSize: 15, color: Colors.white)),
                    const SizedBox(height: 2),
                    Text('Date: ${ann['date']} • By: ${ann['author']}', style: DesignSystem.bodyStyle(fontSize: 11, color: Colors.white55)),
                    const Divider(color: Colors.white24, height: 16),
                    Text(ann['content'], style: DesignSystem.bodyStyle(fontSize: 13, color: Colors.white70)),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  void _showCreateNoticeDialog(AppState appState, PersonaTheme theme) {
    final titleCtrl = TextEditingController();
    final bodyCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF1E293B),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text('Post Global Bulletin', style: DesignSystem.headingStyle(color: Colors.white, fontSize: 16)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: titleCtrl,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(labelText: 'Title', labelStyle: TextStyle(color: Colors.white60)),
              ),
              TextField(
                controller: bodyCtrl,
                style: const TextStyle(color: Colors.white),
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Details / Scope Details', labelStyle: TextStyle(color: Colors.white60)),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('CANCEL', style: TextStyle(color: Colors.white60)),
            ),
            ElevatedButton(
              onPressed: () {
                final title = titleCtrl.text.trim();
                final body = bodyCtrl.text.trim();
                if (title.isNotEmpty && body.isNotEmpty) {
                  appState.addAnnouncementInDemo({
                    'id': 'ann-${DateTime.now().millisecondsSinceEpoch}',
                    'title': title,
                    'content': body,
                    'scope': 'GLOBAL',
                    'wing_id': '',
                    'date': 'Today',
                    'author': _coordName,
                  });
                  Navigator.pop(context);
                  _showSnackbar('Bulletin posted to notice board!', Colors.green);
                  setState(() {});
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: theme.primaryColor),
              child: const Text('POST'),
            ),
          ],
        );
      },
    );
  }

  Widget _buildPhotoGalleryTab(AppState appState, PersonaTheme theme) {
    return Center(
      child: GlassCard(
        baseColor: theme.glassBaseColor,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            FreshIcon(icon: Icons.photo_library_rounded, color: theme.primaryColor, size: 48),
            const SizedBox(height: 16),
            Text('Tournament Media Gallery', style: DesignSystem.headingStyle(color: Colors.white, fontSize: 16)),
            const SizedBox(height: 8),
            Text('Verify registered photos and folders inside the cloud directory.', style: DesignSystem.bodyStyle(color: Colors.white70, fontSize: 12), textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {
                Navigator.push(context, MaterialPageRoute(builder: (_) => const GalleryScreen()));
              },
              style: ElevatedButton.styleFrom(backgroundColor: theme.primaryColor),
              child: Text('LAUNCH GALLERY', style: DesignSystem.headingStyle(fontSize: 12, color: Colors.white)),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildQuotationsTab(AppState appState, PersonaTheme theme) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('LOGISTICS & QUOTES', style: DesignSystem.headingStyle(fontSize: 15, color: Colors.white)),
              ElevatedButton.icon(
                onPressed: () {
                  _showAddQuoteDialog(appState, theme);
                },
                icon: const Icon(Icons.file_upload, size: 16),
                label: const Text('UPLOAD QUOTE'),
                style: ElevatedButton.styleFrom(backgroundColor: theme.primaryColor),
              )
            ],
          ),
          const SizedBox(height: 12),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: appState.demoQuotes.length,
            itemBuilder: (context, index) {
              final quote = appState.demoQuotes[index];
              return GlassCard(
                baseColor: theme.glassBaseColor,
                margin: const EdgeInsets.only(bottom: 10),
                child: ListTile(
                  leading: FreshIcon(icon: Icons.feed_rounded, color: theme.secondaryColor),
                  title: Text(quote['vendor'], style: DesignSystem.headingStyle(fontSize: 15, color: Colors.white)),
                  subtitle: Text('Details: ${quote['description']}', style: DesignSystem.bodyStyle(fontSize: 12, color: Colors.white70)),
                  trailing: Text('₹${quote['amount'].toStringAsFixed(0)}', style: DesignSystem.headingStyle(fontSize: 15, color: theme.secondaryColor)),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  void _showAddQuoteDialog(AppState appState, PersonaTheme theme) {
    final vendCtrl = TextEditingController();
    final amtCtrl = TextEditingController();
    final descCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF1E293B),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text('Log Vendor Quote', style: DesignSystem.headingStyle(color: Colors.white, fontSize: 16)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: vendCtrl,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(labelText: 'Vendor Name', labelStyle: TextStyle(color: Colors.white60)),
              ),
              TextField(
                controller: amtCtrl,
                style: const TextStyle(color: Colors.white),
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Quoted Price (₹)', labelStyle: TextStyle(color: Colors.white60)),
              ),
              TextField(
                controller: descCtrl,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(labelText: 'Scope details / deliverables', labelStyle: TextStyle(color: Colors.white60)),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('CANCEL', style: TextStyle(color: Colors.white60)),
            ),
            ElevatedButton(
              onPressed: () {
                final vendor = vendCtrl.text.trim();
                final amt = double.tryParse(amtCtrl.text) ?? 0.0;
                final desc = descCtrl.text.trim();
                if (vendor.isNotEmpty && amt > 0) {
                  appState.addQuoteInDemo({
                    'id': 'qte-${DateTime.now().millisecondsSinceEpoch}',
                    'vendor': vendor,
                    'amount': amt,
                    'description': desc,
                    'file': 'quote_${vendor.toLowerCase().replaceAll(' ', '_')}.pdf',
                  });
                  Navigator.pop(context);
                  _showSnackbar('Vendor quotation logged!', Colors.green);
                  setState(() {});
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: theme.primaryColor),
              child: const Text('SAVE'),
            ),
          ],
        );
      },
    );
  }

  Widget _buildFoodStallsTab(AppState appState, PersonaTheme theme) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('FOOD BOOTHS & COMMISSIONS', style: DesignSystem.headingStyle(fontSize: 15, color: Colors.white)),
          const SizedBox(height: 12),
          GlassCard(
            baseColor: theme.glassBaseColor,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Stall 1 - Tasty Bites', style: DesignSystem.headingStyle(fontSize: 16, color: Colors.white)),
                Text('Cuisine: Chinese Fast Food', style: DesignSystem.bodyStyle(fontSize: 13, color: Colors.white70)),
                Text('Rent Status: PAID (₹5,000)', style: DesignSystem.bodyStyle(fontSize: 12, color: Colors.greenAccent, fontWeight: FontWeight.bold)),
                const Divider(color: Colors.white24, height: 20),
                Text('Stall 2 - Ice Cream Parlor', style: DesignSystem.headingStyle(fontSize: 16, color: Colors.white)),
                Text('Cuisine: Desserts & Shakes', style: DesignSystem.bodyStyle(fontSize: 13, color: Colors.white70)),
                Text('Rent Status: PENDING (₹5,000)', style: DesignSystem.bodyStyle(fontSize: 12, color: Colors.orangeAccent, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // --- EVENT CHAMPION TABS ---

  Widget _buildSportsConsoleTab(AppState appState, PersonaTheme theme) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildBannerImage(
            'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80',
            'SPORTS EVENTS CONSOLE',
            'Configure Rules, Points, and Schedule Fixture Brackets',
            theme,
          ),
          const SizedBox(height: 16),
          _buildActionConsoleTile(
            icon: Icons.sports_football_rounded,
            title: 'Schedule Sports Tournament',
            subtitle: 'Establish points rules and run scheduler code',
            color: theme.primaryColor,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const CreateCompetitionScreen()),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildSportsScoresTab(AppState appState, PersonaTheme theme) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('SPORTS MATCH PLACEMENTS', style: DesignSystem.headingStyle(fontSize: 15, color: Colors.white)),
          const SizedBox(height: 12),
          _buildActionConsoleTile(
            icon: Icons.sports_score_rounded,
            title: 'Record Match Scorecard',
            subtitle: 'Log game final standings and update leaderboard',
            color: theme.secondaryColor,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const RecordScoreScreen()),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildCulturalConsoleTab(AppState appState, PersonaTheme theme) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildBannerImage(
            'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&auto=format&fit=crop&q=80',
            'CULTURAL EVENTS CONSOLE',
            'Plan Stages, Time Slots, and Competitions',
            theme,
          ),
          const SizedBox(height: 16),
          _buildActionConsoleTile(
            icon: Icons.palette_rounded,
            title: 'Onboard Cultural Event',
            subtitle: 'Create slots for Drawing, Dance, or Rangoli',
            color: theme.primaryColor,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const CreateCompetitionScreen()),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildCulturalScoresTab(AppState appState, PersonaTheme theme) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('CULTURAL STANDINGS & JUDGE SCORES', style: DesignSystem.headingStyle(fontSize: 15, color: Colors.white)),
          const SizedBox(height: 12),
          _buildActionConsoleTile(
            icon: Icons.emoji_events_rounded,
            title: 'Record Judge Scores',
            subtitle: 'Input split points criteria & publish winners standings',
            color: theme.secondaryColor,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const RecordScoreScreen()),
              );
            },
          ),
        ],
      ),
    );
  }

  // Beautiful uploader tab for Event Champions
  Widget _buildPhotoGalleryUploaderTab(AppState appState, PersonaTheme theme) {
    final captionCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final imgUrlCtrl = TextEditingController(text: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=80');

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('EVENT GALLERY UPLOADER', style: DesignSystem.headingStyle(fontSize: 15, color: Colors.white)),
          const SizedBox(height: 12),
          GlassCard(
            baseColor: theme.glassBaseColor,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: captionCtrl,
                  style: const TextStyle(color: Colors.white),
                  decoration: const InputDecoration(
                    labelText: 'Photo Caption',
                    labelStyle: TextStyle(color: Colors.white60),
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: descCtrl,
                  style: const TextStyle(color: Colors.white),
                  maxLines: 2,
                  decoration: const InputDecoration(
                    labelText: 'Brief Description',
                    labelStyle: TextStyle(color: Colors.white60),
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: imgUrlCtrl,
                  style: const TextStyle(color: Colors.white),
                  decoration: const InputDecoration(
                    labelText: 'Photo URL (Mock Image Picker)',
                    labelStyle: TextStyle(color: Colors.white60),
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: () async {
                    final cap = captionCtrl.text.trim();
                    final desc = descCtrl.text.trim();
                    final url = imgUrlCtrl.text.trim();
                    if (cap.isEmpty) {
                      _showSnackbar('Caption cannot be empty', Colors.redAccent);
                      return;
                    }
                    setState(() => _isLoading = true);
                    
                    if (appState.activeSeasonId == 'demo-season-id') {
                      await Future.delayed(const Duration(milliseconds: 600));
                      // In demo, we can just push success feedback
                      setState(() => _isLoading = false);
                      _showSnackbar('Photo registered and uploaded to gallery successfully!', Colors.green);
                      captionCtrl.clear();
                      descCtrl.clear();
                    } else {
                      try {
                        final supabase = Supabase.instance.client;
                        await supabase.from('media_item').insert({
                          'caption': cap,
                          'description': desc,
                          'url': url,
                          'album_id': '00000000-0000-0000-0000-000000000000',
                        });
                        setState(() => _isLoading = false);
                        _showSnackbar('Photo published live successfully!', Colors.green);
                        captionCtrl.clear();
                        descCtrl.clear();
                      } catch (e) {
                        setState(() => _isLoading = false);
                        _showSnackbar('Failed to publish photo: ${e.toString()}', Colors.redAccent);
                      }
                    }
                  },
                  icon: const Icon(Icons.cloud_upload_rounded),
                  label: const Text('PUBLISH PHOTO TO GALLERY'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: theme.primaryColor,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                )
              ],
            ),
          ),
        ],
      ),
    );
  }

  // --- WING MANAGEMENT TABS ---

  Widget _buildWingFlatsRegistryTab(AppState appState, PersonaTheme theme, {bool readOnly = false}) {
    // Generate list of flats in Wing
    final String wing = appState.userWingId ?? 'N';
    final List<String> flats = [];
    for (int floor = 1; floor <= 7; floor++) {
      for (int f = 1; f <= 4; f++) {
        flats.add('$floor${f.toString().padLeft(2, '0')}');
      }
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('WING $wing FLAT DIRECTORY', style: DesignSystem.headingStyle(fontSize: 15, color: Colors.white)),
          const SizedBox(height: 12),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: flats.length,
            itemBuilder: (context, index) {
              final flatNum = flats[index];
              // In demo mode, check if flat has chief accounts
              final lowerUser = 'demo-flat-$wing-$flatNum';
              final paid = appState.isFlatPaidInDemo(flatNum);
              return GlassCard(
                baseColor: theme.glassBaseColor,
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Flat $wing-$flatNum', style: DesignSystem.headingStyle(fontSize: 15, color: Colors.white)),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: paid ? Colors.green.withOpacity(0.2) : Colors.orange.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: paid ? Colors.greenAccent : Colors.orangeAccent),
                          ),
                          child: Text(
                            paid ? 'PAID' : 'DUE',
                            style: DesignSystem.headingStyle(fontSize: 10, color: paid ? Colors.greenAccent : Colors.orangeAccent),
                          ),
                        ),
                        if (!readOnly && !paid) ...[
                          const SizedBox(width: 8),
                          IconButton(
                            icon: const Icon(Icons.check_circle_outline_rounded, color: Colors.greenAccent),
                            onPressed: () {
                              appState.markFlatAsPaidInDemo(flatNum);
                              _showSnackbar('Flat $flatNum marked as PAID offline!', Colors.green);
                            },
                          )
                        ]
                      ],
                    )
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildWingLedgerTab(AppState appState, PersonaTheme theme) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('OFFLINE MAINTENANCE RECEIPT LOGGER', style: DesignSystem.headingStyle(fontSize: 15, color: Colors.white)),
          const SizedBox(height: 12),
          _buildActionConsoleTile(
            icon: Icons.payments_outlined,
            title: 'Record Cash/Check offline',
            subtitle: 'Upload payment receipt logs to Google Drive folders',
            color: theme.primaryColor,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const RecordPaymentScreen()),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildWingExpensesTab(AppState appState, PersonaTheme theme) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('WING LEVEL EXPENSES', style: DesignSystem.headingStyle(fontSize: 15, color: Colors.white)),
              ElevatedButton.icon(
                onPressed: () {
                  _showSubmitExpenseDialog(appState, theme);
                },
                icon: const Icon(Icons.add, size: 16),
                label: const Text('SUBMIT CLAIM'),
                style: ElevatedButton.styleFrom(backgroundColor: theme.primaryColor),
              )
            ],
          ),
          const SizedBox(height: 12),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: appState.demoExpenses.where((e) => e['requires_role'] == 'WING_COMMANDER').length,
            itemBuilder: (context, index) {
              final exp = appState.demoExpenses.where((e) => e['requires_role'] == 'WING_COMMANDER').toList()[index];
              return GlassCard(
                baseColor: theme.glassBaseColor,
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  title: Text(exp['title'], style: DesignSystem.headingStyle(fontSize: 15, color: Colors.white)),
                  subtitle: Text('Status: ${exp['status']}', style: DesignSystem.bodyStyle(fontSize: 12, color: Colors.white70)),
                  trailing: Text('₹${exp['amount'].toStringAsFixed(0)}', style: DesignSystem.headingStyle(fontSize: 15, color: theme.secondaryColor)),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  void _showSubmitExpenseDialog(AppState appState, PersonaTheme theme) {
    final titleCtrl = TextEditingController();
    final amtCtrl = TextEditingController();
    final vendCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF1E293B),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text('Claim Local Expense', style: DesignSystem.headingStyle(color: Colors.white, fontSize: 16)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: titleCtrl,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(labelText: 'Expense Title', labelStyle: TextStyle(color: Colors.white60)),
              ),
              TextField(
                controller: amtCtrl,
                style: const TextStyle(color: Colors.white),
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Amount (₹)', labelStyle: TextStyle(color: Colors.white60)),
              ),
              TextField(
                controller: vendCtrl,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(labelText: 'Vendor Name', labelStyle: TextStyle(color: Colors.white60)),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('CANCEL', style: TextStyle(color: Colors.white60)),
            ),
            ElevatedButton(
              onPressed: () {
                final title = titleCtrl.text.trim();
                final amt = double.tryParse(amtCtrl.text) ?? 0.0;
                final vendor = vendCtrl.text.trim();
                if (title.isNotEmpty && amt > 0) {
                  appState.demoExpenses.add({
                    'id': 'exp-${DateTime.now().millisecondsSinceEpoch}',
                    'title': title,
                    'vendor': vendor,
                    'amount': amt,
                    'status': 'PENDING',
                    'requires_role': 'WING_COMMANDER',
                  });
                  Navigator.pop(context);
                  _showSnackbar('Wing local expense claim submitted!', Colors.green);
                  setState(() {});
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: theme.primaryColor),
              child: const Text('SUBMIT'),
            ),
          ],
        );
      },
    );
  }

  Widget _buildWingNoticesTab(AppState appState, PersonaTheme theme, {bool readOnly = false}) {
    final String wing = appState.userWingId ?? 'N';
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('WING $wing ANNOUNCEMENTS', style: DesignSystem.headingStyle(fontSize: 15, color: Colors.white)),
              if (!readOnly) ...[
                ElevatedButton.icon(
                  onPressed: () {
                    _showCreateWingNoticeDialog(appState, theme);
                  },
                  icon: const Icon(Icons.add, size: 16),
                  label: const Text('NEW WING NOTICE'),
                  style: ElevatedButton.styleFrom(backgroundColor: theme.primaryColor),
                )
              ]
            ],
          ),
          const SizedBox(height: 12),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: appState.demoAnnouncements.where((a) => a['scope'] == 'WING').length,
            itemBuilder: (context, index) {
              final ann = appState.demoAnnouncements.where((a) => a['scope'] == 'WING').toList()[index];
              return GlassCard(
                baseColor: theme.glassBaseColor,
                margin: const EdgeInsets.only(bottom: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(ann['title'], style: DesignSystem.headingStyle(fontSize: 15, color: Colors.white)),
                    Text('Date: ${ann['date']} • By: ${ann['author']}', style: DesignSystem.bodyStyle(fontSize: 11, color: Colors.white55)),
                    const Divider(color: Colors.white24, height: 16),
                    Text(ann['content'], style: DesignSystem.bodyStyle(fontSize: 13, color: Colors.white70)),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  void _showCreateWingNoticeDialog(AppState appState, PersonaTheme theme) {
    final titleCtrl = TextEditingController();
    final bodyCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF1E293B),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text('Post Wing Announcement', style: DesignSystem.headingStyle(color: Colors.white, fontSize: 16)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: titleCtrl,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(labelText: 'Title', labelStyle: TextStyle(color: Colors.white60)),
              ),
              TextField(
                controller: bodyCtrl,
                style: const TextStyle(color: Colors.white),
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Body text', labelStyle: TextStyle(color: Colors.white60)),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('CANCEL', style: TextStyle(color: Colors.white60)),
            ),
            ElevatedButton(
              onPressed: () {
                final title = titleCtrl.text.trim();
                final body = bodyCtrl.text.trim();
                if (title.isNotEmpty && body.isNotEmpty) {
                  appState.addAnnouncementInDemo({
                    'id': 'ann-${DateTime.now().millisecondsSinceEpoch}',
                    'title': title,
                    'content': body,
                    'scope': 'WING',
                    'wing_id': appState.userWingId ?? 'N',
                    'date': 'Today',
                    'author': _coordName,
                  });
                  Navigator.pop(context);
                  _showSnackbar('Wing announcement posted!', Colors.green);
                  setState(() {});
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: theme.primaryColor),
              child: const Text('POST'),
            ),
          ],
        );
      },
    );
  }

  Widget _buildWingRegHelperTab(AppState appState, PersonaTheme theme) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('SPORTS REGISTRATION MONITOR', style: DesignSystem.headingStyle(fontSize: 15, color: Colors.white)),
          const SizedBox(height: 8),
          Text('Verify which flats have not yet enrolled family members for events:', style: DesignSystem.bodyStyle(fontSize: 12, color: Colors.white70)),
          const SizedBox(height: 12),
          GlassCard(
            baseColor: theme.glassBaseColor,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Flat N-101: 0 family registered', style: DesignSystem.headingStyle(fontSize: 14, color: Colors.white)),
                Text('Flat N-102: 3 family registered', style: DesignSystem.bodyStyle(fontSize: 12, color: Colors.greenAccent)),
                const Divider(color: Colors.white24),
                Text('Flat N-103: 0 family registered', style: DesignSystem.headingStyle(fontSize: 14, color: Colors.white)),
                Text('Flat N-104: Timmy & Carol Smith registered', style: DesignSystem.bodyStyle(fontSize: 12, color: Colors.greenAccent)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // --- REUSABLE UTILITIES CARD & ROW ITEMS ---

  Widget _buildBannerImage(String imageUrl, String title, String subtitle, PersonaTheme theme) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: SizedBox(
        height: 130,
        child: Stack(
          children: [
            Image.network(
              imageUrl,
              width: double.infinity,
              height: double.infinity,
              fit: BoxFit.cover,
            ),
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.black.withOpacity(0.7), Colors.transparent],
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                ),
              ),
            ),
            Positioned(
              bottom: 16,
              left: 20,
              right: 20,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: DesignSystem.headingStyle(
                      fontSize: 18,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: DesignSystem.bodyStyle(
                      fontSize: 11,
                      color: Colors.white70,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildMiniMetric(String label, String value, IconData icon, Color accentColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, color: accentColor, size: 14),
            const SizedBox(width: 4),
            Text(label, style: DesignSystem.bodyStyle(fontSize: 10, color: Colors.white55, fontWeight: FontWeight.bold)),
          ],
        ),
        const SizedBox(height: 4),
        Text(value, style: DesignSystem.headingStyle(fontSize: 16, color: Colors.white)),
      ],
    );
  }

  Widget _buildAdminEventRow(String name, String cat, String stats, IconData icon, Color iconColor) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.04),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 16,
            backgroundColor: iconColor.withOpacity(0.2),
            child: Icon(icon, color: iconColor, size: 16),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: DesignSystem.headingStyle(fontSize: 14, color: Colors.white)),
                Text('Category: $cat', style: DesignSystem.bodyStyle(fontSize: 11, color: Colors.white55)),
              ],
            ),
          ),
          Text(stats, style: DesignSystem.headingStyle(fontSize: 12, color: Colors.white70)),
        ],
      ),
    );
  }

  Widget _buildActionConsoleTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: GlassCard(
        baseColor: Colors.white,
        padding: EdgeInsets.zero,
        child: ListTile(
          onTap: onTap,
          contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
          leading: CircleAvatar(
            backgroundColor: color.withOpacity(0.12),
            radius: 20,
            child: FreshIcon(icon: icon, color: color, size: 20),
          ),
          title: Text(title, style: DesignSystem.headingStyle(fontSize: 14, color: Colors.white)),
          subtitle: Text(subtitle, style: DesignSystem.bodyStyle(fontSize: 11, color: Colors.white55)),
          trailing: Icon(Icons.arrow_forward_ios_rounded, size: 14, color: color),
        ),
      ),
    );
  }

  Widget _buildActionConsoleTileRaw({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return _buildActionConsoleTile(icon: icon, title: title, subtitle: subtitle, color: color, onTap: onTap);
  }

  Widget _buildEmptyState(String message, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.02),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        children: [
          Icon(icon, size: 36, color: Colors.white24),
          const SizedBox(height: 8),
          Text(message, style: DesignSystem.bodyStyle(color: Colors.white55, fontSize: 13)),
        ],
      ),
    );
  }

  Widget _buildActionConsoleTileForDeletion({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return _buildActionConsoleTile(icon: icon, title: title, subtitle: subtitle, color: color, onTap: onTap);
  }

  // --- COPIED/RETAINED DELETE FLAT METHODS ---

  void _showDeleteFlatDialog() {
    String selectedWing = 'N';
    String? selectedFlatId;
    String selectedFlatNumber = '';
    List<Map<String, String>> flatsList = [];
    bool isLoadingFlats = true;

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            Future<void> loadFlatsForWing() async {
              setDialogState(() => isLoadingFlats = true);
              final appState = Provider.of<AppState>(context, listen: false);

              if (appState.activeSeasonId == 'demo-season-id') {
                final List<Map<String, String>> mockFlats = [];
                for (int floor = 1; floor <= 7; floor++) {
                  for (int flatNum = 1; flatNum <= 4; flatNum++) {
                    final numStr = '$floor${flatNum.toString().padLeft(2, '0')}';
                    mockFlats.add({
                      'id': 'demo-flat-$selectedWing-$numStr',
                      'number': numStr,
                    });
                  }
                }
                setDialogState(() {
                  flatsList = mockFlats;
                  if (flatsList.isNotEmpty) {
                    selectedFlatId = flatsList.first['id'];
                    selectedFlatNumber = flatsList.first['number']!;
                  }
                  isLoadingFlats = false;
                });
              } else {
                try {
                  final supabase = Supabase.instance.client;
                  final wingRes = await supabase
                      .from('wing')
                      .select('id')
                      .eq('name', selectedWing)
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
                    setDialogState(() {
                      flatsList = loaded;
                      if (flatsList.isNotEmpty) {
                        selectedFlatId = flatsList.first['id'];
                        selectedFlatNumber = flatsList.first['number']!;
                      }
                      isLoadingFlats = false;
                    });
                  }
                } catch (e) {
                  debugPrint('Error loading flats in dialog: $e');
                  setDialogState(() => isLoadingFlats = false);
                }
              }
            }

            if (flatsList.isEmpty && isLoadingFlats) {
              loadFlatsForWing();
            }

            return AlertDialog(
              backgroundColor: const Color(0xFF1E293B),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
              title: Row(
                children: [
                  const Icon(Icons.warning_amber_rounded, color: Colors.redAccent),
                  const SizedBox(width: 10),
                  Text(
                    'Delete Flat Entry',
                    style: DesignSystem.headingStyle(fontSize: 18, color: Colors.white),
                  ),
                ],
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'CAUTION: This will permanently delete all resident profiles, accounts, and assignments associated with this flat.',
                    style: DesignSystem.bodyStyle(fontSize: 12, color: Colors.redAccent, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  
                  DropdownButtonFormField<String>(
                    value: selectedWing,
                    dropdownColor: const Color(0xFF1E293B),
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: 'Select Wing',
                      labelStyle: DesignSystem.bodyStyle(color: Colors.white60, fontSize: 13),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    onChanged: (val) {
                      if (val != null) {
                        selectedWing = val;
                        flatsList.clear();
                        loadFlatsForWing();
                      }
                    },
                    items: ['N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W'].map((w) {
                      return DropdownMenuItem(value: w, child: Text('Wing $w', style: const TextStyle(color: Colors.white)));
                    }).toList(),
                  ),
                  const SizedBox(height: 16),

                  isLoadingFlats
                      ? const Center(child: Padding(
                          padding: EdgeInsets.all(8.0),
                          child: CircularProgressIndicator(),
                        ))
                      : DropdownButtonFormField<String>(
                          value: selectedFlatId,
                          dropdownColor: const Color(0xFF1E293B),
                          style: const TextStyle(color: Colors.white),
                          decoration: InputDecoration(
                            labelText: 'Select Flat Number',
                            labelStyle: DesignSystem.bodyStyle(color: Colors.white60, fontSize: 13),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                          ),
                          onChanged: (val) {
                            if (val != null) {
                              final matched = flatsList.firstWhere((element) => element['id'] == val);
                              setDialogState(() {
                                selectedFlatId = val;
                                selectedFlatNumber = matched['number']!;
                              });
                            }
                          },
                          items: flatsList.map((flat) {
                            return DropdownMenuItem(
                              value: flat['id'],
                              child: Text('Flat ${flat['number']}', style: const TextStyle(color: Colors.white)),
                            );
                          }).toList(),
                        ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text(
                    'CANCEL',
                    style: DesignSystem.headingStyle(fontSize: 12, color: Colors.white60),
                  ),
                ),
                ElevatedButton(
                  onPressed: selectedFlatId == null
                      ? null
                      : () {
                          Navigator.pop(context);
                          _confirmDeleteFlat(selectedWing, selectedFlatNumber, selectedFlatId!);
                        },
                  style: DesignSystem.buttonStyle(color: Colors.redAccent),
                  child: Text(
                    'DELETE ENTRY',
                    style: DesignSystem.headingStyle(fontSize: 12, color: Colors.white),
                  ),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _confirmDeleteFlat(String wing, String flatNumber, String flatId) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF1E293B),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
          title: Text(
            'Confirm Permanent Deletion',
            style: DesignSystem.headingStyle(fontSize: 18, color: Colors.redAccent),
          ),
          content: Text(
            'Are you absolutely sure you want to delete all resident data for Flat $wing-$flatNumber? This action is completely irreversible and will wipe out all logins, profiles, and active registrations for this flat.',
            style: DesignSystem.bodyStyle(fontSize: 13, color: Colors.white),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(
                'CANCEL',
                style: DesignSystem.headingStyle(fontSize: 12, color: Colors.white60),
              ),
            ),
            ElevatedButton(
              onPressed: () async {
                Navigator.pop(context);
                setState(() => _isLoading = true);

                final appState = Provider.of<AppState>(context, listen: false);

                if (appState.activeSeasonId == 'demo-season-id') {
                  await Future.delayed(const Duration(milliseconds: 600));
                  appState.deleteFlatEntryInDemo(wing, flatNumber);
                  setState(() => _isLoading = false);
                  _showSnackbar('Flat $wing-$flatNumber entry deleted in demo mode.', Colors.redAccent);
                } else {
                  try {
                    final supabase = Supabase.instance.client;
                    await supabase.rpc('delete_flat_entry', params: {
                      'p_flat_id': flatId,
                    });
                    setState(() => _isLoading = false);
                    _showSnackbar('Flat $wing-$flatNumber entry permanently deleted.', Colors.redAccent);
                  } catch (e) {
                    setState(() => _isLoading = false);
                    _showSnackbar('Deletion failed: ${e.toString()}', Colors.redAccent);
                  }
                }
              },
              style: DesignSystem.buttonStyle(color: Colors.redAccent),
              child: Text(
                'YES, DELETE',
                style: DesignSystem.headingStyle(fontSize: 12, color: Colors.white),
              ),
            ),
          ],
        );
      },
    );
  }
}

// --- HELPER VISUAL WIDGETS ---

class PersonaTheme {
  final Color primaryColor;
  final Color secondaryColor;
  final Color accentColor;
  final Color glassBaseColor;
  final List<Color> bgGradient;

  PersonaTheme({
    required this.primaryColor,
    required this.secondaryColor,
    required this.accentColor,
    required this.glassBaseColor,
    required this.bgGradient,
  });

  static PersonaTheme getTheme(String? role) {
    switch (role) {
      case 'SCOT_ADMIN':
        return PersonaTheme(
          primaryColor: const Color(0xFF8B5CF6), // Royal Purple
          secondaryColor: const Color(0xFFF59E0B), // Gold
          accentColor: const Color(0xFFEC4899), // Pink Accent
          glassBaseColor: Colors.white,
          bgGradient: [const Color(0xFF1E1B4B), const Color(0xFF0F172A)], // Purple midnight
        );
      case 'CORE_TEAM':
        return PersonaTheme(
          primaryColor: const Color(0xFF10B981), // Emerald
          secondaryColor: const Color(0xFF06B6D4), // Cyan
          accentColor: const Color(0xFF34D399), // Mint Green
          glassBaseColor: Colors.white,
          bgGradient: [const Color(0xFF064E3B), const Color(0xFF0F172A)], // Forest green night
        );
      case 'EVENT_CHAMPION':
        return PersonaTheme(
          primaryColor: const Color(0xFFF97316), // Vibrant Orange
          secondaryColor: const Color(0xFFE11D48), // Rose
          accentColor: const Color(0xFFF43F5E), // Coral
          glassBaseColor: Colors.white,
          bgGradient: [const Color(0xFF7C2D12), const Color(0xFF0F172A)], // Sunset orange night
        );
      case 'WING_COMMANDER':
        return PersonaTheme(
          primaryColor: const Color(0xFF3B82F6), // Cobalt Blue
          secondaryColor: const Color(0xFF06B6D4), // Cyan
          accentColor: const Color(0xFF60A5FA), // Light Blue
          glassBaseColor: Colors.white,
          bgGradient: [const Color(0xFF1E3A8A), const Color(0xFF0F172A)], // Deep blue night
        );
      case 'WING_CAPTAIN':
        return PersonaTheme(
          primaryColor: const Color(0xFF0D9488), // Teal
          secondaryColor: const Color(0xFF10B981), // Emerald
          accentColor: const Color(0xFF2DD4BF), // Seafoam
          glassBaseColor: Colors.white,
          bgGradient: [const Color(0xFF115E59), const Color(0xFF0F172A)], // Teal night
        );
      default:
        return PersonaTheme(
          primaryColor: const Color(0xFFD97706), // Warm Amber
          secondaryColor: const Color(0xFFFB923C), // Honey Amber
          accentColor: const Color(0xFFFDE68A), // Cream
          glassBaseColor: Colors.white,
          bgGradient: [const Color(0xFF78350F), const Color(0xFF0F172A)], // Cozy night
        );
    }
  }
}

class GlowBlob extends StatelessWidget {
  final double width;
  final double height;
  final Color color;
  final double blurRadius;

  const GlowBlob({
    super.key,
    required this.width,
    required this.height,
    required this.color,
    this.blurRadius = 120.0,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.12),
            blurRadius: blurRadius,
            spreadRadius: blurRadius / 2,
          ),
        ],
      ),
    );
  }
}

class GlassCard extends StatelessWidget {
  final Widget child;
  final Color baseColor;
  final double borderRadius;
  final double borderOpacity;
  final double fillOpacity;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;

  const GlassCard({
    super.key,
    required this.child,
    this.baseColor = Colors.white,
    this.borderRadius = 24.0,
    this.borderOpacity = 0.12,
    this.fillOpacity = 0.06,
    this.padding = const EdgeInsets.all(20.0),
    this.margin,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: margin,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 16.0, sigmaY: 16.0),
          child: Container(
            padding: padding,
            decoration: BoxDecoration(
              color: baseColor.withOpacity(fillOpacity),
              borderRadius: BorderRadius.circular(borderRadius),
              border: Border.all(
                color: baseColor.withOpacity(borderOpacity),
                width: 1.2,
              ),
            ),
            child: child,
          ),
        ),
      ),
    );
  }
}

class FreshIcon extends StatelessWidget {
  final IconData icon;
  final Color color;
  final double size;

  const FreshIcon({
    super.key,
    required this.icon,
    required this.color,
    this.size = 24.0,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.center,
      children: [
        Positioned(
          left: 1.5,
          top: 1.5,
          child: Icon(
            icon,
            color: color.withOpacity(0.3),
            size: size,
          ),
        ),
        Icon(
          icon,
          color: color,
          size: size,
        ),
      ],
    );
  }
}
