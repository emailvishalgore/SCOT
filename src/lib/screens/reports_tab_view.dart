import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../app_state.dart';
import '../theme/design_system.dart';

class ReportsTabView extends StatefulWidget {
  const ReportsTabView({super.key});

  @override
  State<ReportsTabView> createState() => _ReportsTabViewState();
}

class _ReportsTabViewState extends State<ReportsTabView> {
  bool _isLoading = true;

  // Financial Stats
  double _flatCollections = 0.0;
  double _sponsorCollections = 0.0;
  double _totalSpend = 0.0;
  double _netBalance = 0.0;

  // Resident Stats
  int _flatsPaid = 0;
  int _flatsPending = 0;
  int _totalResidents = 0;

  // Events Stats
  int _totalEvents = 0;
  int _totalSubEvents = 0;
  int _totalBackingTracks = 0;

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  Future<void> _loadStats() async {
    setState(() => _isLoading = true);
    final appState = Provider.of<AppState>(context, listen: false);

    if (appState.activeSeasonId == 'demo-season-id') {
      // Offline Demo Mode calculations
      int paidCount = appState.demoPaidFlats.length;
      double flatContribSum = paidCount * 5000.0;

      double sponsorSum = 0.0;
      for (var s in appState.demoSponsors) {
        sponsorSum += (s['amount'] as num?)?.toDouble() ?? 0.0;
      }

      double expenseSum = 0.0;
      for (var e in appState.demoExpenses) {
        if (e['status'] == 'APPROVED') {
          expenseSum += (e['amount'] as num?)?.toDouble() ?? 0.0;
        }
      }

      int resCount = appState.demoResidentAccounts.length;
      int pendingCount = 280 - paidCount;

      int eventsCount = appState.demoEvents.length;
      int subEventsCount = 0;
      for (var e in appState.demoEvents) {
        final List? subs = e['sub_events'] as List?;
        if (subs != null) {
          subEventsCount += subs.length;
        }
      }

      int tracksCount = 0;
      appState.demoEventTracks.forEach((k, v) {
        tracksCount += v.length;
      });

      setState(() {
        _flatCollections = flatContribSum;
        _sponsorCollections = sponsorSum;
        _totalSpend = expenseSum;
        _netBalance = (_flatCollections + _sponsorCollections) - _totalSpend;
        _flatsPaid = paidCount;
        _flatsPending = pendingCount > 0 ? pendingCount : 0;
        _totalResidents = resCount;
        _totalEvents = eventsCount;
        _totalSubEvents = subEventsCount;
        _totalBackingTracks = tracksCount;
        _isLoading = false;
      });
    } else {
      // Real Cloud Mode
      try {
        final supabase = Supabase.instance.client;
        final seasonId = appState.activeSeasonId;

        if (seasonId == null) {
          setState(() => _isLoading = false);
          return;
        }

        // 1. Fetch flat annual summaries
        final flatRes = await supabase
            .from('flat_annual_summary')
            .select('is_paid, balance_due')
            .eq('season_id', seasonId);

        int paid = 0;
        int pending = 0;
        double paidDues = 0.0;

        if (flatRes != null) {
          for (var item in flatRes) {
            final isPaid = item['is_paid'] as bool? ?? false;
            if (isPaid) {
              paid++;
              paidDues += 5000.0; // standard flat contribution sum
            } else {
              pending++;
            }
          }
        }

        // 2. Fetch approved expenses
        final expRes = await supabase
            .from('expense')
            .select('amount')
            .eq('season_id', seasonId)
            .eq('status', 'APPROVED');

        double expensesTotal = 0.0;
        if (expRes != null) {
          for (var item in expRes) {
            expensesTotal += (item['amount'] as num?)?.toDouble() ?? 0.0;
          }
        }

        // 3. Fetch sponsors
        final sponRes = await supabase
            .from('sponsor')
            .select('amount_committed')
            .eq('season_id', seasonId);

        double sponsorsTotal = 0.0;
        if (sponRes != null) {
          for (var item in sponRes) {
            sponsorsTotal += (item['amount_committed'] as num?)?.toDouble() ?? 0.0;
          }
        }

        // 4. Fetch resident counts
        final resCountRes = await supabase
            .from('resident')
            .select('id');
        final resCount = resCountRes != null ? resCountRes.length : 0;

        // 5. Fetch events and sub-events count
        final evRes = await supabase
            .from('competition')
            .select('id')
            .eq('season_id', seasonId);
        final evCount = evRes != null ? evRes.length : 0;

        final subEvRes = await supabase
            .from('sub_event')
            .select('id, category')
            .eq('season_id', seasonId);
        final subEvCount = subEvRes != null ? subEvRes.length : 0;

        // 6. Fetch registration backing tracks count
        final regRes = await supabase
            .from('registration')
            .select('track_url')
            .not('track_url', 'is', null);
        final tracksCount = regRes != null ? regRes.length : 0;

        setState(() {
          _flatCollections = paidDues;
          _sponsorCollections = sponsorsTotal;
          _totalSpend = expensesTotal;
          _netBalance = (_flatCollections + _sponsorCollections) - _totalSpend;
          _flatsPaid = paid;
          _flatsPending = pending;
          _totalResidents = resCount;
          _totalEvents = evCount;
          _totalSubEvents = subEvCount;
          _totalBackingTracks = tracksCount;
          _isLoading = false;
        });
      } catch (e) {
        debugPrint('Error compiling database stats reports: $e');
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _downloadPdfReport() async {
    final appState = Provider.of<AppState>(context, listen: false);
    final seasonName = appState.activeSeasonId == 'demo-season-id'
        ? 'Demo Season 2026'
        : 'Active Season';

    final doc = pw.Document();

    doc.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context context) {
          return pw.Container(
            padding: const pw.EdgeInsets.all(32),
            decoration: pw.BoxDecoration(
              border: pw.Border.all(color: PdfColors.grey400, width: 2),
            ),
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                // Header
                pw.Text('SCOT COMMUNITY MANAGEMENT PLATFORM',
                    style: pw.TextStyle(
                        fontSize: 22, fontWeight: pw.FontWeight.bold, color: PdfColors.deepPurple800)),
                pw.SizedBox(height: 4),
                pw.Text('OFFICIAL OPERATIONAL & STATISTICS REPORT',
                    style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold, color: PdfColors.grey700)),
                pw.SizedBox(height: 16),
                pw.Divider(color: PdfColors.deepPurple200, thickness: 1.5),
                pw.SizedBox(height: 16),

                // Metadata
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text('Season: $seasonName', style: pw.TextStyle(fontSize: 11, color: PdfColors.grey600)),
                    pw.Text('Generated: ${DateTime.now().toLocal().toString().split('.')[0]}',
                        style: pw.TextStyle(fontSize: 11, color: PdfColors.grey600)),
                  ],
                ),
                pw.SizedBox(height: 24),

                // Financial Section
                pw.Text('1. Financial Statement Summary',
                    style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold, color: PdfColors.deepPurple700)),
                pw.SizedBox(height: 8),
                pw.Table(
                  border: pw.TableBorder.all(color: PdfColors.grey300),
                  children: [
                    pw.TableRow(
                      decoration: const pw.BoxDecoration(color: PdfColors.grey100),
                      children: [
                        pw.Padding(
                            padding: const pw.EdgeInsets.all(6),
                            child: pw.Text('Item Category', style: pw.TextStyle(fontWeight: pw.FontWeight.bold))),
                        pw.Padding(
                            padding: const pw.EdgeInsets.all(6),
                            child: pw.Text('Amount (INR)', style: pw.TextStyle(fontWeight: pw.FontWeight.bold))),
                      ],
                    ),
                    pw.TableRow(
                      children: [
                        pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text('Flat Contributions Dues')),
                        pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text('INR ${_flatCollections.toStringAsFixed(0)}')),
                      ],
                    ),
                    pw.TableRow(
                      children: [
                        pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text('Sponsorship Collections')),
                        pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text('INR ${_sponsorCollections.toStringAsFixed(0)}')),
                      ],
                    ),
                    pw.TableRow(
                      children: [
                        pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text('Total Spends (Approved Expenses)')),
                        pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text('INR ${_totalSpend.toStringAsFixed(0)}')),
                      ],
                    ),
                    pw.TableRow(
                      decoration: const pw.BoxDecoration(color: PdfColors.green100),
                      children: [
                        pw.Padding(
                            padding: const pw.EdgeInsets.all(6),
                            child: pw.Text('Net Surplus / Balance', style: pw.TextStyle(fontWeight: pw.FontWeight.bold))),
                        pw.Padding(
                            padding: const pw.EdgeInsets.all(6),
                            child: pw.Text('INR ${_netBalance.toStringAsFixed(0)}',
                                style: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: PdfColors.green800))),
                      ],
                    ),
                  ],
                ),
                pw.SizedBox(height: 24),

                // Resident Section
                pw.Text('2. Resident Onboarding & Dues Status',
                    style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold, color: PdfColors.deepPurple700)),
                pw.SizedBox(height: 8),
                pw.Bullet(text: 'Total Flats Paid: $_flatsPaid flats (₹5000 contribution per unit)'),
                pw.Bullet(text: 'Total Flats Pending: $_flatsPending flats outstanding'),
                pw.Bullet(text: 'Total Registered Residents: $_totalResidents occupants'),
                pw.SizedBox(height: 24),

                // Events Section
                pw.Text('3. Competition & Fiesta Schedule',
                    style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold, color: PdfColors.deepPurple700)),
                pw.SizedBox(height: 8),
                pw.Bullet(text: 'Total Competitive Master Events: $_totalEvents tournaments'),
                pw.Bullet(text: 'Total Scheduled Sub-Events: $_totalSubEvents matches/categories'),
                pw.Bullet(text: 'Resident Performance Audio Tracks: $_totalBackingTracks uploaded'),
                pw.SizedBox(height: 48),

                // Signatures
                pw.Divider(color: PdfColors.grey300),
                pw.SizedBox(height: 12),
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text('Prepared by: SCOT Core Team', style: pw.TextStyle(fontSize: 10, fontStyle: pw.FontStyle.italic)),
                    pw.Text('Authorized: SCOT Admin Board', style: pw.TextStyle(fontSize: 10, fontStyle: pw.FontStyle.italic)),
                  ],
                )
              ],
            ),
          );
        },
      ),
    );

    await Printing.sharePdf(bytes: await doc.save(), filename: 'SCOT_Executive_Stats_Report.pdf');
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation<Color>(DesignSystem.primary),
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header Summary Block
          Container(
            padding: const EdgeInsets.all(24),
            decoration: DesignSystem.glassDecoration(
              borderAccentColor: DesignSystem.primary,
              fillOpacity: 0.12,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'OPERATIONAL ANALYTICS',
                      style: DesignSystem.headingStyle(fontSize: 12, color: DesignSystem.secondary),
                    ),
                    ElevatedButton.icon(
                      onPressed: _downloadPdfReport,
                      style: DesignSystem.buttonStyle(color: DesignSystem.secondary).copyWith(
                        padding: const MaterialStatePropertyAll(
                          EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        ),
                      ),
                      icon: const Icon(Icons.cloud_download_rounded, size: 16, color: Colors.white),
                      label: Text(
                        'DOWNLOAD PDF',
                        style: DesignSystem.headingStyle(fontSize: 12, color: Colors.white),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Community Executive Report',
                  style: DesignSystem.headingStyle(fontSize: 20, color: Colors.white),
                ),
                const SizedBox(height: 6),
                Text(
                  'Compiled snapshot of financial ledger audits, resident onboarding progress, and event scheduling registrations.',
                  style: DesignSystem.bodyStyle(fontSize: 13, color: Colors.white70),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Stats Grid
          GridView.count(
            crossAxisCount: 2,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 1.1,
            children: [
              // Collections Card
              _buildStatCard(
                'COLLECTIONS',
                '₹${(_flatCollections + _sponsorCollections).toStringAsFixed(0)}',
                'Flat Dues & Sponsors',
                Icons.account_balance_wallet_rounded,
                DesignSystem.successGreen,
              ),
              // Spend Card
              _buildStatCard(
                'SPEND BUDGET',
                '₹${_totalSpend.toStringAsFixed(0)}',
                'Approved Payments',
                Icons.payments_rounded,
                DesignSystem.accentCoral,
              ),
              // Balance Card
              _buildStatCard(
                'NET SURPLUS',
                '₹${_netBalance.toStringAsFixed(0)}',
                'Remaining Funds',
                Icons.trending_up_rounded,
                _netBalance >= 0 ? DesignSystem.successGreen : DesignSystem.accentCoral,
              ),
              // Flats Onboarded
              _buildStatCard(
                'PAID FLATS',
                '$_flatsPaid / ${_flatsPaid + _flatsPending}',
                'Unit Maintenance',
                Icons.home_work_rounded,
                DesignSystem.primary,
              ),
              // Residents Count
              _buildStatCard(
                'OCCUPANTS',
                '$_totalResidents',
                'Onboarded Roster',
                Icons.people_alt_rounded,
                DesignSystem.secondary,
              ),
              // Matches Count
              _buildStatCard(
                'COMPETITIONS',
                '$_totalSubEvents',
                'Scheduled Sports/Cultural',
                Icons.emoji_events_rounded,
                DesignSystem.secondary,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(
    String label,
    String value,
    String subtitle,
    IconData icon,
    Color accentColor,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: DesignSystem.glassDecoration(
        borderAccentColor: accentColor,
        fillOpacity: 0.08,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: DesignSystem.headingStyle(fontSize: 11, color: Colors.white70),
              ),
              Icon(icon, color: accentColor.withOpacity(0.8), size: 18),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: DesignSystem.headingStyle(fontSize: 20, color: Colors.white),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: DesignSystem.bodyStyle(fontSize: 10, color: Colors.white54),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
