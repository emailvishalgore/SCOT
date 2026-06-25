import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../app_state.dart';
import '../theme/design_system.dart';
import 'login_screen.dart';
import 'events_screen.dart';
import 'leaderboard_and_fixtures_screen.dart';
import 'announcements_screen.dart';
import 'gallery_screen.dart';

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

    if (appState.activeSeasonId == 'demo-season-id') {
      final String userResId = appState.userResidentId ?? '';
      String matchedName = 'Resident';
      String matchedFlat = '102';
      String matchedWing = 'N';
      String matchedFlatId = 'demo-flat-id';

      appState.demoResidentAccounts.forEach((k, v) {
        if (v['resident_id'] == userResId) {
          matchedName = v['name'];
          matchedFlat = v['flat'];
          matchedWing = v['wing'];
          matchedFlatId = v['flat_id'];
        }
      });

      setState(() {
        _residentName = matchedName;
        _flatNumber = matchedFlat;
        _wingName = matchedWing;
        _isPaid = appState.isFlatPaidInDemo(_flatNumber);
        _balanceDue = _isPaid ? 0.0 : 5000.0;
        _isLoading = false;
      });
      return;
    }

    if (appState.userResidentId == null || appState.userResidentId!.isEmpty) {
      setState(() {
        _residentName = 'Resident';
        _isLoading = false;
      });
      return;
    }

    try {
      final resData = await supabase
          .from('resident')
          .select('full_name')
          .eq('id', appState.userResidentId!)
          .maybeSingle();

      if (resData != null) {
        _residentName = resData['full_name'] ?? 'Resident';
      }

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
    final isChief = appState.userRole == 'HOME_CHIEF';
    final theme = ResidentTheme.getTheme(appState.userRole);

    if (_isLoading) {
      return Scaffold(
        backgroundColor: const Color(0xFF1C0D02),
        body: Center(
          child: CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(theme.primaryColor),
          ),
        ),
      );
    }

    final List<Widget> tabLabels = [];
    final List<Widget> tabViews = [];

    if (isChief) {
      tabLabels.addAll([
        const Tab(text: 'My Flat Hub'),
        const Tab(text: 'Fiesta Registration'),
        const Tab(text: 'Standings'),
        const Tab(text: 'Notices & Gallery'),
      ]);
      tabViews.addAll([
        _buildMyFlatHubTab(appState, theme),
        _buildFiestaRegistrationTab(appState, theme, isChief: true),
        _buildStandingsTab(appState, theme),
        _buildNoticesAndGalleryTab(appState, theme),
      ]);
    } else {
      tabLabels.addAll([
        const Tab(text: 'My Profile'),
        const Tab(text: 'Sports Registry'),
        const Tab(text: 'Standings'),
        const Tab(text: 'Notices & Gallery'),
      ]);
      tabViews.addAll([
        _buildFamilyProfileTab(appState, theme),
        _buildFiestaRegistrationTab(appState, theme, isChief: false),
        _buildStandingsTab(appState, theme),
        _buildNoticesAndGalleryTab(appState, theme),
      ]);
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
                  color: theme.primaryLight,
                ),
              ),
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

  Widget _buildHeaderWidget(AppState appState, ResidentTheme theme) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: GlassCard(
        baseColor: theme.glassBaseColor,
        borderColor: theme.primaryColor.withOpacity(0.3),
        padding: const EdgeInsets.all(16),
        fillOpacity: 0.12,
        child: Row(
          children: [
            CircleAvatar(
              radius: 28,
              backgroundColor: theme.primaryColor.withOpacity(0.2),
              child: Text(
                _residentName.isNotEmpty ? _residentName[0].toUpperCase() : 'R',
                style: DesignSystem.headingStyle(
                  fontSize: 24,
                  color: theme.primaryColor,
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _residentName,
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
                          gradient: LinearGradient(colors: [theme.primaryColor, theme.secondaryColor]),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.white24),
                        ),
                        child: Text(
                          appState.userRole == 'HOME_CHIEF' ? 'FLAT HEAD' : 'FAMILY MEMBER',
                          style: GoogleFonts.nunito(
                            fontSize: 10,
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Flat $_wingName-$_flatNumber',
                        style: DesignSystem.bodyStyle(
                          fontSize: 12,
                          color: Colors.white70,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            IconButton(
              onPressed: _handleLogout,
              icon: FreshIcon(
                icon: Icons.logout_rounded,
                primaryColor: Colors.white,
                secondaryColor: theme.secondaryColor,
                size: 20,
              ),
              tooltip: 'Logout',
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCustomTabBar(List<Widget> tabLabels, ResidentTheme theme) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      child: GlassCard(
        baseColor: theme.glassBaseColor,
        borderColor: theme.secondaryColor.withOpacity(0.2),
        padding: EdgeInsets.zero,
        borderRadius: 16,
        fillOpacity: 0.08,
        child: TabBar(
          isScrollable: true,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white54,
          indicatorSize: TabBarIndicatorSize.tab,
          indicator: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            gradient: LinearGradient(
              colors: [theme.primaryColor.withOpacity(0.5), theme.secondaryColor.withOpacity(0.3)],
            ),
            border: Border.all(color: theme.primaryColor.withOpacity(0.4)),
          ),
          tabs: tabLabels,
          labelStyle: DesignSystem.headingStyle(fontSize: 13),
          unselectedLabelStyle: DesignSystem.bodyStyle(fontSize: 13, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }

  Widget _buildMyFlatHubTab(AppState appState, ResidentTheme theme) {
    final List<Map<String, dynamic>> familyMembers = [];
    appState.demoResidentAccounts.forEach((k, v) {
      if (v['flat'] == _flatNumber && v['wing'] == _wingName && v['role'] == 'HOME_MEMBER') {
        familyMembers.add({
          'username': k,
          'name': v['name'],
          'role': v['role'],
        });
      }
    });

    final totalFlatsMembers = familyMembers.length + 1;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildBannerImage(
            'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&auto=format&fit=crop&q=80',
            'FLAT COOP CENTER',
            'Manage Maintenance & Family Roster',
            theme,
          ),
          const SizedBox(height: 16),

          GlassCard(
            baseColor: theme.glassBaseColor,
            borderColor: _isPaid ? Colors.green.withOpacity(0.4) : Colors.redAccent.withOpacity(0.4),
            fillOpacity: _isPaid ? 0.12 : 0.08,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'MAINTENANCE DUES',
                      style: DesignSystem.headingStyle(
                        fontSize: 11,
                        color: Colors.white70,
                      ).copyWith(letterSpacing: 1.5),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: _isPaid ? Colors.green.withOpacity(0.3) : Colors.redAccent.withOpacity(0.3),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: _isPaid ? Colors.greenAccent : Colors.redAccent),
                      ),
                      child: Text(
                        _isPaid ? 'PAID' : 'PENDING',
                        style: DesignSystem.headingStyle(
                          fontSize: 10,
                          color: _isPaid ? Colors.greenAccent : Colors.redAccent,
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
                    color: _isPaid ? Colors.greenAccent : Colors.redAccent,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  _isPaid
                      ? 'Thank you for supporting our community!'
                      : 'Please settle annual maintenance fees with your Wing Commander to enable sports registrations.',
                  style: DesignSystem.bodyStyle(
                    fontSize: 13,
                    color: Colors.white70,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('FAMILY MEMBERS ROSTER', style: DesignSystem.headingStyle(fontSize: 14, color: Colors.white)),
                  Text('$totalFlatsMembers / 7 registered (Max 7)', style: DesignSystem.bodyStyle(fontSize: 11, color: Colors.white54)),
                ],
              ),
              if (totalFlatsMembers < 7) ...[
                ElevatedButton.icon(
                  onPressed: () {
                    _showAddFamilyMemberDialog(appState, theme);
                  },
                  icon: const Icon(Icons.add, size: 16, color: Colors.white),
                  label: Text('ADD MEMBER', style: DesignSystem.headingStyle(fontSize: 11, color: Colors.white)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: theme.primaryColor,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                )
              ]
            ],
          ),
          const SizedBox(height: 12),

          familyMembers.isEmpty
              ? _buildEmptyState('No family members registered yet', Icons.people_outline_rounded)
              : ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: familyMembers.length,
                  itemBuilder: (context, index) {
                    final member = familyMembers[index];
                    return GlassCard(
                      baseColor: theme.glassBaseColor,
                      borderColor: theme.secondaryColor.withOpacity(0.2),
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 18,
                            backgroundColor: theme.primaryColor.withOpacity(0.1),
                            child: Icon(Icons.person, color: theme.primaryColor, size: 18),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              member['name'],
                              style: DesignSystem.headingStyle(fontSize: 14, color: Colors.white),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline_rounded, color: Colors.redAccent),
                            onPressed: () {
                              appState.removeFamilyMemberInDemo(member['username']);
                              _showSnackbar('Family member ${member['name']} removed!', Colors.redAccent);
                              setState(() {});
                            },
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

  void _showAddFamilyMemberDialog(AppState appState, ResidentTheme theme) {
    final nameCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF1E293B),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text('Onboard Family Member', style: DesignSystem.headingStyle(color: Colors.white, fontSize: 16)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameCtrl,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Full Name',
                  labelStyle: TextStyle(color: Colors.white60),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Note: Registered members will use the flat PIN and their name as username to log in.',
                style: DesignSystem.bodyStyle(fontSize: 11, color: Colors.white54),
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
                if (name.isNotEmpty) {
                  String headPin = '1234';
                  appState.demoResidentAccounts.forEach((k, v) {
                    if (v['resident_id'] == appState.userResidentId) {
                      headPin = v['pin'];
                    }
                  });

                  appState.addFamilyMemberInDemo(headPin, name, _flatNumber, _wingName, appState.userFlatId ?? 'demo-flat-id');
                  Navigator.pop(context);
                  _showSnackbar('$name added to family roster!', Colors.green);
                  setState(() {});
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: theme.primaryColor),
              child: const Text('ADD'),
            ),
          ],
        );
      },
    );
  }

  Widget _buildFiestaRegistrationTab(AppState appState, ResidentTheme theme, {required bool isChief}) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildBannerImage(
            'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80',
            'FIESTA CHAMPIONSHIP',
            'Represent Wing $_wingName in Sports and Culture',
            theme,
          ),
          const SizedBox(height: 16),

          GlassCard(
            baseColor: theme.glassBaseColor,
            borderColor: theme.secondaryColor.withOpacity(0.25),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Register for Matches', style: DesignSystem.headingStyle(fontSize: 16, color: Colors.white)),
                    FreshIconContainer(icon: Icons.emoji_events_rounded, primaryColor: theme.primaryColor, secondaryColor: theme.secondaryColor),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  _isPaid
                      ? 'Select your categories and schedule brackets scheduler.'
                      : 'Fiesta registry is locked. Please pay flat maintenance to proceed.',
                  style: DesignSystem.bodyStyle(fontSize: 13, color: Colors.white70),
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: !_isPaid
                      ? null
                      : () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const EventsScreen()),
                          ).then((_) => _fetchResidentDetails());
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: theme.primaryColor,
                    disabledBackgroundColor: Colors.white24,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Text(
                    _isPaid ? 'REGISTER FOR EVENTS' : 'REGISTRY LOCKED',
                    style: DesignSystem.headingStyle(fontSize: 12, color: _isPaid ? Colors.white : Colors.white30),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          Text('MY REGISTERED EVENTS', style: DesignSystem.headingStyle(fontSize: 13, color: Colors.white70)),
          const SizedBox(height: 12),
          appState.demoRegisteredEvents.isEmpty
              ? _buildEmptyState('You are not registered in any event yet.', Icons.event_note_rounded)
              : ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: appState.demoRegisteredEvents.length,
                  itemBuilder: (context, index) {
                    final evtId = appState.demoRegisteredEvents.toList()[index];
                    String evtName = 'Sports Tournament';
                    if (evtId == 'sub-1') evtName = 'Inter-Wing Football Match';
                    if (evtId == 'sub-2') evtName = 'Men\'s Singles Badminton';
                    if (evtId == 'sub-3') evtName = 'Inter-Wing Carrom';
                    if (evtId == 'sub-4') evtName = 'Women\'s Table Tennis';

                    return GlassCard(
                      baseColor: theme.glassBaseColor,
                      borderColor: theme.primaryColor.withOpacity(0.2),
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        leading: FreshIcon(icon: Icons.check_circle_rounded, primaryColor: Colors.greenAccent, secondaryColor: theme.secondaryColor),
                        title: Text(evtName, style: DesignSystem.headingStyle(fontSize: 14, color: Colors.white)),
                        subtitle: Text('Status: REGISTERED', style: DesignSystem.bodyStyle(fontSize: 11, color: Colors.white70)),
                      ),
                    );
                  },
                ),
        ],
      ),
    );
  }

  Widget _buildStandingsTab(AppState appState, ResidentTheme theme) {
    return Center(
      child: GlassCard(
        baseColor: theme.glassBaseColor,
        borderColor: theme.secondaryColor.withOpacity(0.25),
        margin: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            FreshIconContainer(icon: Icons.emoji_events_rounded, primaryColor: theme.primaryColor, secondaryColor: theme.secondaryColor, size: 48),
            const SizedBox(height: 16),
            Text('Leaderboards & Fixtures', style: DesignSystem.headingStyle(color: Colors.white, fontSize: 16)),
            const SizedBox(height: 8),
            Text(
              'Browse fixtures dates, scores log, and wing placements standings.',
              textAlign: TextAlign.center,
              style: DesignSystem.bodyStyle(color: Colors.white70, fontSize: 12),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const LeaderboardAndFixturesScreen()),
                );
              },
              style: ElevatedButton.styleFrom(backgroundColor: theme.primaryColor),
              child: Text('VIEW STANDINGS BOARD', style: DesignSystem.headingStyle(fontSize: 12, color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNoticesAndGalleryTab(AppState appState, ResidentTheme theme) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          GlassCard(
            baseColor: theme.glassBaseColor,
            borderColor: theme.primaryColor.withOpacity(0.2),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: theme.secondaryColor.withOpacity(0.1),
                  child: FreshIconContainer(icon: Icons.photo_library_rounded, primaryColor: theme.primaryColor, secondaryColor: theme.secondaryColor, size: 24),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Tournament Media Gallery', style: DesignSystem.headingStyle(fontSize: 15, color: Colors.white)),
                      Text('Browse match photos & moments.', style: DesignSystem.bodyStyle(fontSize: 11, color: Colors.white70)),
                    ],
                  ),
                ),
                ElevatedButton(
                  onPressed: () {
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const GalleryScreen()));
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: theme.primaryColor,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Text('GALLERY', style: DesignSystem.headingStyle(fontSize: 11, color: Colors.white)),
                )
              ],
            ),
          ),
          const SizedBox(height: 24),

          Text('SOCIETY BULLETIN NOTICES', style: DesignSystem.headingStyle(fontSize: 13, color: Colors.white70)),
          const SizedBox(height: 12),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: appState.demoAnnouncements.length,
            itemBuilder: (context, index) {
              final ann = appState.demoAnnouncements[index];
              return GlassCard(
                baseColor: theme.glassBaseColor,
                borderColor: theme.primaryColor.withOpacity(0.2),
                margin: const EdgeInsets.only(bottom: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(ann['title'], style: DesignSystem.headingStyle(fontSize: 15, color: Colors.white)),
                    Text('Date: ${ann['date']} • By: ${ann['author']}', style: DesignSystem.bodyStyle(fontSize: 11, color: Colors.white54)),
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

  Widget _buildFamilyProfileTab(AppState appState, ResidentTheme theme) {
    String flatHeadName = 'Unknown';
    appState.demoResidentAccounts.forEach((k, v) {
      if (v['flat'] == _flatNumber && v['wing'] == _wingName && v['role'] == 'HOME_CHIEF') {
        flatHeadName = v['name'];
      }
    });

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildBannerImage(
            'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&auto=format&fit=crop&q=80',
            'FAMILY PROFILE DASHBOARD',
            'Home Chief & Flat Demographics',
            theme,
          ),
          const SizedBox(height: 16),

          GlassCard(
            baseColor: theme.glassBaseColor,
            borderColor: theme.primaryColor.withOpacity(0.2),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Flat head (Home Chief)', style: DesignSystem.bodyStyle(fontSize: 11, color: Colors.white54, fontWeight: FontWeight.bold)),
                Text(flatHeadName, style: DesignSystem.headingStyle(fontSize: 18, color: Colors.white)),
                const Divider(color: Colors.white24, height: 24),
                Text('Wing and Unit Coordinates', style: DesignSystem.bodyStyle(fontSize: 11, color: Colors.white54, fontWeight: FontWeight.bold)),
                Text('Wing $_wingName • Flat $_flatNumber', style: DesignSystem.headingStyle(fontSize: 16, color: theme.secondaryColor)),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Icon(
                      _isPaid ? Icons.check_circle_rounded : Icons.info_outline_rounded,
                      color: _isPaid ? Colors.greenAccent : Colors.redAccent,
                      size: 16,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _isPaid ? 'Flat Maintenance Paid' : 'Flat Maintenance Dues Pending',
                      style: DesignSystem.bodyStyle(fontSize: 12, color: Colors.white70),
                    )
                  ],
                )
              ],
            ),
          )
        ],
      ),
    );
  }

  Widget _buildBannerImage(String imageUrl, String title, String subtitle, ResidentTheme theme) {
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
          Text(message, style: DesignSystem.bodyStyle(color: Colors.white54, fontSize: 13)),
        ],
      ),
    );
  }
}

class ResidentTheme {
  final Color primaryColor;
  final Color secondaryColor;
  final Color primaryLight;
  final Color secondaryLight;
  final Color glassBaseColor;
  final List<Color> bgGradient;

  ResidentTheme({
    required this.primaryColor,
    required this.secondaryColor,
    required this.primaryLight,
    required this.secondaryLight,
    required this.glassBaseColor,
    required this.bgGradient,
  });

  static ResidentTheme getTheme(String? role) {
    return ResidentTheme(
      primaryColor: const Color(0xFFD97706), // Warm Amber
      secondaryColor: const Color(0xFFFB923C), // Warm Orange
      primaryLight: const Color(0xFFFBBF24),
      secondaryLight: const Color(0xFFFDBA74),
      glassBaseColor: Colors.white,
      bgGradient: [const Color(0xFF451A03), const Color(0xFF0F172A)],
    );
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
  final Color? borderColor;

  const GlassCard({
    super.key,
    required this.child,
    this.baseColor = Colors.white,
    this.borderRadius = 24.0,
    this.borderOpacity = 0.12,
    this.fillOpacity = 0.06,
    this.padding = const EdgeInsets.all(20.0),
    this.margin,
    this.borderColor,
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
                color: borderColor ?? baseColor.withOpacity(borderOpacity),
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
  final Color primaryColor;
  final Color secondaryColor;
  final double size;

  const FreshIcon({
    super.key,
    required this.icon,
    required this.primaryColor,
    required this.secondaryColor,
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
            color: secondaryColor.withOpacity(0.4),
            size: size,
          ),
        ),
        Icon(
          icon,
          color: primaryColor,
          size: size,
        ),
      ],
    );
  }
}

class FreshIconContainer extends StatelessWidget {
  final IconData icon;
  final Color primaryColor;
  final Color secondaryColor;
  final double size;

  const FreshIconContainer({
    super.key,
    required this.icon,
    required this.primaryColor,
    required this.secondaryColor,
    this.size = 20.0,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          colors: [
            primaryColor.withOpacity(0.15),
            secondaryColor.withOpacity(0.05),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: Border.all(
          color: primaryColor.withOpacity(0.25),
          width: 1.2,
        ),
      ),
      child: FreshIcon(
        icon: icon,
        primaryColor: primaryColor,
        secondaryColor: secondaryColor,
        size: size,
      ),
    );
  }
}
