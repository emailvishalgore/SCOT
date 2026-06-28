import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../app_state.dart';
import '../theme/design_system.dart';

class LeaderboardAndFixturesScreen extends StatefulWidget {
  const LeaderboardAndFixturesScreen({super.key});

  @override
  State<LeaderboardAndFixturesScreen> createState() => _LeaderboardAndFixturesScreenState();
}

class _LeaderboardAndFixturesScreenState extends State<LeaderboardAndFixturesScreen> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _standings = [];
  List<Map<String, dynamic>> _fixtures = [];

  // Mocks for Offline Demo Mode
  final List<Map<String, dynamic>> _mockStandings = [
    {'wing': 'N', 'points': 150.0, 'rank': 1},
    {'wing': 'O', 'points': 120.0, 'rank': 2},
    {'wing': 'P', 'points': 95.0, 'rank': 3},
    {'wing': 'Q', 'points': 80.0, 'rank': 4},
    {'wing': 'R', 'points': 75.0, 'rank': 5},
    {'wing': 'S', 'points': 60.0, 'rank': 6},
    {'wing': 'T', 'points': 55.0, 'rank': 7},
    {'wing': 'U', 'points': 40.0, 'rank': 8},
    {'wing': 'V', 'points': 30.0, 'rank': 9},
    {'wing': 'W', 'points': 10.0, 'rank': 10},
  ];

  final List<Map<String, dynamic>> _mockFixtures = [
    {
      'id': 'fix-1',
      'name': 'Inter-Wing Football Finals',
      'comp_name': 'Inter-Wing Football Season 1',
      'status': 'COMPLETED',
      'scheduled_at': 'June 24, 2026',
      'outcome': 'Wing N Won 2 - 1',
      'details': 'Wing N (2) vs Wing O (1)'
    },
    {
      'id': 'fix-2',
      'name': 'Men\'s Singles Badminton Finals',
      'comp_name': 'Topaz Badminton Championship',
      'status': 'COMPLETED',
      'scheduled_at': 'June 24, 2026',
      'outcome': 'John Doe Won 21 - 18',
      'details': 'John Doe (21) vs Bob Smith (18)'
    },
    {
      'id': 'fix-3',
      'name': 'Inter-Wing Carrom Semifinals',
      'comp_name': 'Carrom Tournament',
      'status': 'SCHEDULED',
      'scheduled_at': 'Today, 6:00 PM',
      'outcome': 'Pending Kickoff',
      'details': 'Wing P vs Wing Q'
    }
  ];

  @override
  void initState() {
    super.initState();
    _loadLeaderboardAndFixtures();
  }

  Future<void> _loadLeaderboardAndFixtures() async {
    final appState = Provider.of<AppState>(context, listen: false);

    if (appState.activeSeasonId == 'demo-season-id') {
      // Offline Demo Mode: Load mocks
      setState(() {
        _standings = _mockStandings;
        _fixtures = _mockFixtures;
        _isLoading = false;
      });
    } else {
      // Real Cloud Mode: Query Supabase
      try {
        final supabase = Supabase.instance.client;

        // 1. Fetch standings from core.wing_score, aggregated by wing_id
        final standingsData = await supabase
            .from('wing_score')
            .select('points, wing:wing_id(name)')
            .eq('season_id', appState.activeSeasonId!);

        // Group points by wing
        final Map<String, double> pointsMap = {};
        if (standingsData != null) {
          for (var item in standingsData) {
            final wing = item['wing'] as Map<String, dynamic>?;
            final wingName = wing?['name']?.toString() ?? 'Unknown';
            final pts = (item['points'] as num?)?.toDouble() ?? 0.0;
            pointsMap[wingName] = (pointsMap[wingName] ?? 0.0) + pts;
          }
        }

        // Convert map to list and sort
        final List<Map<String, dynamic>> sortedStandings = [];
        pointsMap.forEach((wing, pts) {
          sortedStandings.add({'wing': wing, 'points': pts});
        });
        sortedStandings.sort((a, b) => b['points'].compareTo(a['points']));
        
        // Assign ranks
        for (int i = 0; i < sortedStandings.length; i++) {
          sortedStandings[i]['rank'] = i + 1;
        }

        // 2. Fetch fixtures
        final fixturesData = await supabase
            .from('fixture')
            .select('id, name, status, scheduled_at, competition:competition_id(name)')
            .order('scheduled_at', ascending: true);

        final List<Map<String, dynamic>> loadedFixtures = [];
        if (fixturesData != null) {
          for (var item in fixturesData) {
            final comp = item['competition'] as Map<String, dynamic>?;
            final scheduled = item['scheduled_at']?.toString() ?? '';
            final status = item['status']?.toString() ?? 'SCHEDULED';
            
            // Query participants to construct details/outcome
            final parts = await supabase
                .from('competition_participant')
                .select('score, placement, resident:resident_id(name), wing:wing_id(name)')
                .eq('fixture_id', item['id']);
            
            String detailsStr = '';
            String outcomeStr = 'Scheduled';
            if (parts != null && parts.isNotEmpty) {
              final List<String> names = [];
              final List<String> scores = [];
              String winner = '';
              double maxScore = -1.0;

              for (var p in parts) {
                final res = p['resident'] as Map<String, dynamic>?;
                final wing = p['wing'] as Map<String, dynamic>?;
                final name = res != null ? res['name']?.toString() ?? '' : 'Wing ${wing?['name']?.toString() ?? ''}';
                names.add(name);

                final scoreVal = (p['score'] as num?)?.toDouble();
                if (scoreVal != null) {
                  scores.add('$name ($scoreVal)');
                  if (scoreVal > maxScore) {
                    maxScore = scoreVal;
                    winner = name;
                  }
                }
              }

              detailsStr = names.join(' vs ');
              if (status == 'COMPLETED') {
                outcomeStr = winner.isNotEmpty ? '$winner Won' : 'Completed';
                if (scores.isNotEmpty) {
                  outcomeStr += ' (${scores.join(' - ')})';
                }
              } else {
                outcomeStr = 'Pending Kickoff';
              }
            }

            loadedFixtures.add({
              'id': item['id']?.toString() ?? '',
              'name': item['name']?.toString() ?? 'Match',
              'comp_name': comp?['name']?.toString() ?? 'Competition',
              'status': status,
              'scheduled_at': scheduled,
              'outcome': outcomeStr,
              'details': detailsStr
            });
          }
        }

        setState(() {
          _standings = sortedStandings;
          _fixtures = loadedFixtures;
        });
      } catch (e) {
        debugPrint('Error loading leaderboard: $e');
      } finally {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: DesignSystem.background,
        appBar: const ScotHeaderBar(
          title: 'Scores & Leaderboard',
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
                color: const Color(0xFF0F172A).withOpacity(0.92),
              ),
            ),
            Positioned.fill(
              child: _isLoading
                  ? const Center(
                      child: CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(DesignSystem.primary),
                      ),
                    )
                  : Column(
                      children: [
                        Container(
                          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          child: TabBar(
                            labelColor: DesignSystem.secondary,
                            unselectedLabelColor: DesignSystem.textMuted,
                            indicatorColor: DesignSystem.secondary,
                            indicatorWeight: 3,
                            labelStyle: DesignSystem.headingStyle(fontSize: 14),
                            tabs: const [
                              Tab(text: 'Wing Leaderboard'),
                              Tab(text: 'Fixtures & Results'),
                            ],
                          ),
                        ),
                        Expanded(
                          child: TabBarView(
                            children: [
                              _buildLeaderboardTab(),
                              _buildFixturesTab(),
                            ],
                          ),
                        ),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLeaderboardTab() {
    if (_standings.isEmpty) {
      return Center(
        child: Text(
          'No standings records found.',
          style: DesignSystem.bodyStyle(color: DesignSystem.textMuted),
        ),
      );
    }

    // Get Top 3 for Podium
    final top1 = _standings.length > 0 ? _standings[0] : null;
    final top2 = _standings.length > 1 ? _standings[1] : null;
    final top3 = _standings.length > 2 ? _standings[2] : null;
    final rest = _standings.length > 3 ? _standings.sublist(3) : [];

    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        // Podium Display Card
        Container(
          padding: const EdgeInsets.all(20),
          decoration: DesignSystem.glassDecoration(borderAccentColor: DesignSystem.accentYellow, fillOpacity: 0.12),
          child: Column(
            children: [
              Text(
                'CHAMPIONSHIP PODIUM',
                style: DesignSystem.headingStyle(fontSize: 12, color: Colors.white70).copyWith(letterSpacing: 2),
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  // 2nd Place (Silver)
                  if (top2 != null)
                    _buildPodiumColumn(
                      wing: 'Wing ${top2['wing']}',
                      points: top2['points'].toStringAsFixed(0),
                      place: '2nd',
                      color: const Color(0xFFC0C0C0), // Silver
                      height: 80,
                    ),

                  // 1st Place (Gold)
                  if (top1 != null)
                    _buildPodiumColumn(
                      wing: 'Wing ${top1['wing']}',
                      points: top1['points'].toStringAsFixed(0),
                      place: '1st',
                      color: const Color(0xFFD4AF37), // Gold
                      height: 110,
                      isGold: true,
                    ),

                  // 3rd Place (Bronze)
                  if (top3 != null)
                    _buildPodiumColumn(
                      wing: 'Wing ${top3['wing']}',
                      points: top3['points'].toStringAsFixed(0),
                      place: '3rd',
                      color: const Color(0xFFCD7F32), // Bronze
                      height: 60,
                    ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 28),

        Text(
          'SEASONAL STANDINGS',
          style: DesignSystem.headingStyle(fontSize: 12, color: DesignSystem.textMuted).copyWith(letterSpacing: 2),
        ),
        const SizedBox(height: 16),

        // List of rest of wings
        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: _standings.length,
          itemBuilder: (context, index) {
            final entry = _standings[index];
            final rank = entry['rank'];
            final wing = entry['wing'];
            final points = entry['points'];

            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: rank <= 3 ? DesignSystem.accentYellow.withOpacity(0.5) : DesignSystem.secondary.withOpacity(0.15),
                  width: rank <= 3 ? 2 : 1.2,
                ),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 16,
                    backgroundColor: rank <= 3 ? const Color(0xFFFFF9C4) : DesignSystem.background,
                    child: Text(
                      '#$rank',
                      style: DesignSystem.headingStyle(
                        fontSize: 12,
                        color: rank <= 3 ? const Color(0xFFD4AF37) : DesignSystem.textMuted,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Text(
                    'Wing $wing',
                    style: DesignSystem.headingStyle(fontSize: 15, color: DesignSystem.textPrimary),
                  ),
                  const Spacer(),
                  Text(
                    '${points.toStringAsFixed(0)} PTS',
                    style: DesignSystem.headingStyle(fontSize: 15, color: DesignSystem.primary),
                  ),
                ],
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildPodiumColumn({
    required String wing,
    required String points,
    required String place,
    required Color color,
    required double height,
    bool isGold = false,
  }) {
    return Column(
      children: [
        if (isGold)
          const Icon(Icons.emoji_events_rounded, color: Color(0xFFD4AF37), size: 28),
        const SizedBox(height: 6),
        Text(
          wing,
          style: DesignSystem.headingStyle(fontSize: 12, color: DesignSystem.textPrimary),
        ),
        Text(
          '$points pts',
          style: DesignSystem.bodyStyle(fontSize: 11, color: DesignSystem.textMuted, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        Container(
          width: 65,
          height: height,
          decoration: BoxDecoration(
            color: color.withOpacity(0.2),
            border: Border.all(color: color, width: 2),
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(16),
              topRight: Radius.circular(16),
            ),
          ),
          child: Center(
            child: Text(
              place,
              style: DesignSystem.headingStyle(fontSize: 16, color: color),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildFixturesTab() {
    if (_fixtures.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.sports_score_rounded, size: 64, color: DesignSystem.textMuted.withOpacity(0.3)),
            const SizedBox(height: 12),
            Text(
              'No match schedules found.',
              style: DesignSystem.headingStyle(fontSize: 16, color: DesignSystem.textMuted),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(24),
      itemCount: _fixtures.length,
      itemBuilder: (context, index) {
        final fix = _fixtures[index];
        final name = fix['name'];
        final compName = fix['comp_name'];
        final status = fix['status'];
        final scheduled = fix['scheduled_at'];
        final outcome = fix['outcome'];
        final details = fix['details'];

        final isCompleted = status == 'COMPLETED';

        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(20),
          decoration: DesignSystem.glassDecoration(
            borderAccentColor: isCompleted ? DesignSystem.successGreen : DesignSystem.primary,
            fillOpacity: 0.12,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      name,
                      style: DesignSystem.headingStyle(fontSize: 15, color: DesignSystem.textPrimary),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: (isCompleted ? DesignSystem.successGreen : DesignSystem.primary).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      status,
                      style: DesignSystem.headingStyle(
                        fontSize: 8,
                        color: isCompleted ? DesignSystem.successGreen : DesignSystem.primary,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                compName,
                style: DesignSystem.bodyStyle(fontSize: 11, color: DesignSystem.textMuted, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 14),
              const Divider(height: 1),
              const SizedBox(height: 14),
              
              Text(
                details,
                style: DesignSystem.headingStyle(fontSize: 16, color: DesignSystem.textPrimary),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 6),
              Text(
                isCompleted ? 'Result: $outcome' : 'Scheduled at: $scheduled',
                style: DesignSystem.bodyStyle(
                  fontSize: 12,
                  color: isCompleted ? DesignSystem.successGreen : DesignSystem.textMuted,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        );
      },
    );
  }
}
