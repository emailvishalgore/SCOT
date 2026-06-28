import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../app_state.dart';
import '../theme/design_system.dart';

class FinancePortalScreen extends StatefulWidget {
  const FinancePortalScreen({super.key});

  @override
  State<FinancePortalScreen> createState() => _FinancePortalScreenState();
}

class _FinancePortalScreenState extends State<FinancePortalScreen> {
  bool _isLoading = true;
  bool _isSaving = false;
  List<Map<String, dynamic>> _sponsors = [];
  List<Map<String, dynamic>> _quotes = [];

  final _sponsorFormKey = GlobalKey<FormState>();
  final _sponsorNameController = TextEditingController();
  final _sponsorAmountController = TextEditingController();
  String _selectedTier = 'GOLD';

  final _quoteFormKey = GlobalKey<FormState>();
  final _quoteVendorController = TextEditingController();
  final _quoteAmountController = TextEditingController();
  final _quoteDescController = TextEditingController();
  bool _isQuoteFileSelected = false;

  @override
  void initState() {
    super.initState();
    _loadFinanceData();
  }

  @override
  void dispose() {
    _sponsorNameController.dispose();
    _sponsorAmountController.dispose();
    _quoteVendorController.dispose();
    _quoteAmountController.dispose();
    _quoteDescController.dispose();
    super.dispose();
  }

  Future<void> _loadFinanceData() async {
    final appState = Provider.of<AppState>(context, listen: false);

    if (appState.activeSeasonId == 'demo-season-id') {
      // Offline Demo: Load from AppState
      setState(() {
        _sponsors = List<Map<String, dynamic>>.from(appState.demoSponsors);
        _quotes = List<Map<String, dynamic>>.from(appState.demoQuotes);
        _isLoading = false;
      });
    } else {
      // Real Cloud: Query Supabase
      try {
        final supabase = Supabase.instance.client;

        // 1. Load sponsors
        final sponsorRes = await supabase
            .from('sponsor')
            .select('*')
            .order('amount', ascending: false);

        final List<Map<String, dynamic>> loadedSponsors = [];
        if (sponsorRes != null) {
          for (var item in sponsorRes) {
            loadedSponsors.add({
              'id': item['id']?.toString() ?? '',
              'name': item['sponsor_name']?.toString() ?? 'Sponsor',
              'amount': (item['amount'] as num?)?.toDouble() ?? 0.0,
              'tier': item['tier']?.toString() ?? 'GOLD',
            });
          }
        }

        // 2. Load vendor quotations
        final quoteRes = await supabase
            .from('vendor_quotation')
            .select('id, amount, quotation_file_url, vendor:vendor_id(name, service_type)')
            .order('amount', ascending: true);

        final List<Map<String, dynamic>> loadedQuotes = [];
        if (quoteRes != null) {
          for (var item in quoteRes) {
            final vendorMap = item['vendor'] as Map<String, dynamic>?;
            final vName = vendorMap?['name']?.toString() ?? 'Vendor';
            final vService = vendorMap?['service_type']?.toString() ?? 'Service';
            final fileUrl = item['quotation_file_url']?.toString() ?? '';
            final fileName = fileUrl.isNotEmpty ? fileUrl.split('/').last : 'quote_file.pdf';

            loadedQuotes.add({
              'id': item['id']?.toString() ?? '',
              'vendor': vName,
              'amount': (item['amount'] as num?)?.toDouble() ?? 0.0,
              'description': vService,
              'file': fileName
            });
          }
        }

        setState(() {
          _sponsors = loadedSponsors;
          _quotes = loadedQuotes;
        });
      } catch (e) {
        debugPrint('Error loading finance data: $e');
      } finally {
        setState(() => _isLoading = false);
      }
    }
  }

  void _addSponsor() async {
    if (!_sponsorFormKey.currentState!.validate()) return;

    setState(() => _isSaving = true);
    final appState = Provider.of<AppState>(context, listen: false);

    final name = _sponsorNameController.text.trim();
    final amt = double.tryParse(_sponsorAmountController.text.trim()) ?? 0.0;

    if (appState.activeSeasonId == 'demo-season-id') {
      // Offline Demo: Add to AppState list
      await Future.delayed(const Duration(milliseconds: 600));

      final Map<String, dynamic> newSpon = {
        'id': 'spon-${DateTime.now().millisecondsSinceEpoch}',
        'name': name,
        'amount': amt,
        'tier': _selectedTier,
      };

      appState.addSponsorInDemo(newSpon);
      
      _sponsorNameController.clear();
      _sponsorAmountController.clear();
      _selectedTier = 'GOLD';

      setState(() => _isSaving = false);
      Navigator.pop(context); // Close dialog
      _loadFinanceData(); // Reload list

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Sponsorship logged successfully! (Demo)'),
          backgroundColor: DesignSystem.successGreen,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } else {
      // Real Cloud: Write to core.sponsor
      try {
        final supabase = Supabase.instance.client;
        
        await supabase.from('sponsor').insert({
          'sponsor_name': name,
          'amount': amt,
          'tier': _selectedTier,
          'season_id': appState.activeSeasonId!,
        });

        _sponsorNameController.clear();
        _sponsorAmountController.clear();
        _selectedTier = 'GOLD';

        setState(() => _isSaving = false);
        Navigator.pop(context);
        _loadFinanceData();

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Sponsorship logged successfully!'),
            backgroundColor: DesignSystem.successGreen,
            behavior: SnackBarBehavior.floating,
          ),
        );
      } catch (e) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to save sponsor: ${e.toString()}'),
            backgroundColor: DesignSystem.accentCoral,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _submitVendorQuote() async {
    if (!_quoteFormKey.currentState!.validate() || !_isQuoteFileSelected) {
      if (!_isQuoteFileSelected) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Please select/attach the quotation PDF file!'),
            backgroundColor: DesignSystem.accentCoral,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
      return;
    }

    setState(() => _isSaving = true);
    final appState = Provider.of<AppState>(context, listen: false);

    final vendor = _quoteVendorController.text.trim();
    final amt = double.tryParse(_quoteAmountController.text.trim()) ?? 0.0;
    final desc = _quoteDescController.text.trim();

    if (appState.activeSeasonId == 'demo-season-id') {
      // Offline Demo: Add to AppState list
      await Future.delayed(const Duration(milliseconds: 1000));

      final Map<String, dynamic> newQuote = {
        'id': 'qte-${DateTime.now().millisecondsSinceEpoch}',
        'vendor': vendor,
        'amount': amt,
        'description': desc,
        'file': 'vendor_quote_${vendor.replaceAll(' ', '_').toLowerCase()}.pdf'
      };

      appState.addQuoteInDemo(newQuote);

      _quoteVendorController.clear();
      _quoteAmountController.clear();
      _quoteDescController.clear();
      _isQuoteFileSelected = false;

      setState(() => _isSaving = false);
      Navigator.pop(context);
      _loadFinanceData();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Vendor quotation uploaded to Google Drive & registered! (Demo)'),
          backgroundColor: DesignSystem.successGreen,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } else {
      // Real Cloud: Write to DB tables and trigger Drive uploads
      try {
        final supabase = Supabase.instance.client;

        // 1. Insert Vendor if needed or query placeholder vendor
        final vendorRes = await supabase.from('vendor').insert({
          'name': vendor,
          'service_type': desc,
          'contact_phone': '+919999988888',
        }).select('id').single();
        final String vendorId = vendorRes['id'];

        // 2. Insert Quotation
        await supabase.from('vendor_quotation').insert({
          'vendor_id': vendorId,
          'amount': amt,
          'quotation_file_url': 'https://drive.google.com/drive/mock-file-id-for-$vendor.pdf',
          'season_id': appState.activeSeasonId!,
        });

        _quoteVendorController.clear();
        _quoteAmountController.clear();
        _quoteDescController.clear();
        _isQuoteFileSelected = false;

        setState(() => _isSaving = false);
        Navigator.pop(context);
        _loadFinanceData();

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Vendor quotation uploaded successfully!'),
            backgroundColor: DesignSystem.successGreen,
            behavior: SnackBarBehavior.floating,
          ),
        );
      } catch (e) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to save vendor quote: ${e.toString()}'),
            backgroundColor: DesignSystem.accentCoral,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _showAddSponsorDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: DesignSystem.background,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
              title: Text(
                'Log Sponsorship',
                style: DesignSystem.headingStyle(fontSize: 18),
              ),
              content: Form(
                key: _sponsorFormKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextFormField(
                      controller: _sponsorNameController,
                      style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold),
                      decoration: InputDecoration(
                        labelText: 'Sponsor Brand Name',
                        labelStyle: DesignSystem.bodyStyle(color: DesignSystem.textMuted, fontSize: 13),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) return 'Enter sponsor name';
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _sponsorAmountController,
                      keyboardType: TextInputType.number,
                      style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold),
                      decoration: InputDecoration(
                        labelText: 'Sponsorship Amount (₹)',
                        labelStyle: DesignSystem.bodyStyle(color: DesignSystem.textMuted, fontSize: 13),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      validator: (val) {
                        if (val == null || double.tryParse(val) == null || double.parse(val) <= 0) {
                          return 'Enter valid amount';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      value: _selectedTier,
                      decoration: InputDecoration(
                        labelText: 'Branding Tier Package',
                        labelStyle: DesignSystem.bodyStyle(color: DesignSystem.textMuted, fontSize: 13),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      onChanged: (val) {
                        if (val != null) {
                          setDialogState(() {
                            _selectedTier = val;
                          });
                        }
                      },
                      items: const [
                        DropdownMenuItem(value: 'PLATINUM', child: Text('Platinum Tier (Logo on Jersey)')),
                        DropdownMenuItem(value: 'GOLD', child: Text('Gold Tier (Banners on Court)')),
                        DropdownMenuItem(value: 'SILVER', child: Text('Silver Tier (Social Broadcast)')),
                      ],
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text('CANCEL', style: DesignSystem.headingStyle(fontSize: 12, color: DesignSystem.textMuted)),
                ),
                ElevatedButton(
                  onPressed: _isSaving ? null : _addSponsor,
                  style: DesignSystem.buttonStyle(color: DesignSystem.primary),
                  child: _isSaving
                      ? const SizedBox(
                          height: 16,
                          width: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation(Colors.white),
                          ),
                        )
                      : Text('SAVE RECORD', style: DesignSystem.headingStyle(fontSize: 12, color: Colors.white)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _showAddQuoteDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: DesignSystem.background,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
              title: Text(
                'Upload Vendor Estimate',
                style: DesignSystem.headingStyle(fontSize: 18),
              ),
              content: Form(
                key: _quoteFormKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextFormField(
                      controller: _quoteVendorController,
                      style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold),
                      decoration: InputDecoration(
                        labelText: 'Vendor / Company Name',
                        labelStyle: DesignSystem.bodyStyle(color: DesignSystem.textMuted, fontSize: 13),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) return 'Enter vendor name';
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _quoteAmountController,
                      keyboardType: TextInputType.number,
                      style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold),
                      decoration: InputDecoration(
                        labelText: 'Quoted Total Amount (₹)',
                        labelStyle: DesignSystem.bodyStyle(color: DesignSystem.textMuted, fontSize: 13),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      validator: (val) {
                        if (val == null || double.tryParse(val) == null || double.parse(val) <= 0) {
                          return 'Enter valid amount';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _quoteDescController,
                      style: DesignSystem.bodyStyle(),
                      decoration: InputDecoration(
                        labelText: 'Description (e.g. Stage Sound)',
                        labelStyle: DesignSystem.bodyStyle(color: DesignSystem.textMuted, fontSize: 13),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) return 'Enter quote description';
                        return null;
                      },
                    ),
                    const SizedBox(height: 20),
                    InkWell(
                      onTap: () {
                        setDialogState(() {
                          _isQuoteFileSelected = !_isQuoteFileSelected;
                        });
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                        decoration: BoxDecoration(
                          color: _isQuoteFileSelected ? DesignSystem.successGreen.withOpacity(0.05) : Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: _isQuoteFileSelected ? DesignSystem.successGreen : DesignSystem.secondary.withOpacity(0.3),
                            width: 1.2,
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              _isQuoteFileSelected ? Icons.check_circle_rounded : Icons.attach_file_rounded,
                              color: _isQuoteFileSelected ? DesignSystem.successGreen : DesignSystem.secondary,
                              size: 20,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                _isQuoteFileSelected ? 'estimate_proposal.pdf attached' : 'Attach Quote Estimate PDF',
                                style: DesignSystem.bodyStyle(
                                  fontSize: 12,
                                  color: _isQuoteFileSelected ? DesignSystem.successGreen : DesignSystem.textMuted,
                                  fontWeight: _isQuoteFileSelected ? FontWeight.bold : FontWeight.normal,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text('CANCEL', style: DesignSystem.headingStyle(fontSize: 12, color: DesignSystem.textMuted)),
                ),
                ElevatedButton(
                  onPressed: _isSaving ? null : _submitVendorQuote,
                  style: DesignSystem.buttonStyle(color: DesignSystem.secondary),
                  child: _isSaving
                      ? const SizedBox(
                          height: 16,
                          width: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation(Colors.white),
                          ),
                        )
                      : Text('UPLOAD', style: DesignSystem.headingStyle(fontSize: 12, color: Colors.white)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: DesignSystem.background,
        appBar: const ScotHeaderBar(
          title: 'Sponsorships & Quotes',
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
                              Tab(text: 'Sponsorship Ledger'),
                              Tab(text: 'Vendor Estimates'),
                            ],
                          ),
                        ),
                        Expanded(
                          child: TabBarView(
                            children: [
                              _buildSponsorsTab(),
                              _buildQuotesTab(),
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

  Widget _buildSponsorsTab() {
    double totalSponsorRaised = 0.0;
    for (var sp in _sponsors) {
      totalSponsorRaised += sp['amount'];
    }

    return Scaffold(
      backgroundColor: DesignSystem.background,
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          // Total Sum Card
          Container(
            padding: const EdgeInsets.all(22),
            decoration: DesignSystem.glassDecoration(borderAccentColor: DesignSystem.successGreen, fillOpacity: 0.12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'TOTAL SPONSORSHIP FUNDING',
                  style: DesignSystem.headingStyle(fontSize: 10, color: Colors.white70).copyWith(letterSpacing: 1.5),
                ),
                const SizedBox(height: 10),
                Text(
                  '₹${totalSponsorRaised.toStringAsFixed(0)}',
                  style: DesignSystem.headingStyle(fontSize: 32, color: DesignSystem.successGreen),
                ),
              ],
            ),
          ),
          const SizedBox(height: 28),

          Text(
            'REGISTERED BRAND SPONSORS',
            style: DesignSystem.headingStyle(fontSize: 12, color: DesignSystem.textMuted).copyWith(letterSpacing: 2),
          ),
          const SizedBox(height: 16),

          _sponsors.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 40),
                    child: Text(
                      'No sponsors logged yet.',
                      style: DesignSystem.bodyStyle(color: DesignSystem.textMuted),
                    ),
                  ),
                )
              : ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _sponsors.length,
                  itemBuilder: (context, index) {
                    final sp = _sponsors[index];
                    final name = sp['name'];
                    final double amount = sp['amount'];
                    final tier = sp['tier'];

                    Color tierColor = DesignSystem.primary;
                    if (tier == 'PLATINUM') tierColor = const Color(0xFF10B981);
                    if (tier == 'GOLD') tierColor = const Color(0xFFD4AF37);

                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                      decoration: DesignSystem.glassDecoration(borderAccentColor: tierColor, fillOpacity: 0.12),
                      child: Row(
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                name,
                                style: DesignSystem.headingStyle(fontSize: 15, color: DesignSystem.textPrimary),
                              ),
                              const SizedBox(height: 2),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: tierColor.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  tier,
                                  style: DesignSystem.headingStyle(fontSize: 8, color: tierColor),
                                ),
                              ),
                            ],
                          ),
                          const Spacer(),
                          Text(
                            '₹${amount.toStringAsFixed(0)}',
                            style: DesignSystem.headingStyle(fontSize: 16, color: DesignSystem.textPrimary),
                          ),
                        ],
                      ),
                    );
                  },
                ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddSponsorDialog,
        backgroundColor: DesignSystem.successGreen,
        child: const Icon(Icons.add_business_rounded, color: Colors.white),
      ),
    );
  }

  Widget _buildQuotesTab() {
    return Scaffold(
      backgroundColor: DesignSystem.background,
      body: _quotes.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.request_quote_outlined, size: 64, color: DesignSystem.textMuted.withOpacity(0.3)),
                  const SizedBox(height: 12),
                  Text(
                    'No vendor quotes uploaded yet.',
                    style: DesignSystem.headingStyle(fontSize: 16, color: DesignSystem.textMuted),
                  ),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(24),
              itemCount: _quotes.length,
              itemBuilder: (context, index) {
                final q = _quotes[index];
                final vendor = q['vendor'];
                final double amount = q['amount'];
                final desc = q['description'];
                final file = q['file'];

                return Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(20),
                  decoration: DesignSystem.glassDecoration(borderAccentColor: DesignSystem.secondary, fillOpacity: 0.12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              vendor,
                              style: DesignSystem.headingStyle(fontSize: 16, color: DesignSystem.textPrimary),
                            ),
                          ),
                          Text(
                            '₹${amount.toStringAsFixed(0)}',
                            style: DesignSystem.headingStyle(fontSize: 18, color: DesignSystem.accentCoral),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        desc,
                        style: DesignSystem.bodyStyle(fontSize: 13, color: DesignSystem.textMuted),
                      ),
                      const SizedBox(height: 14),
                      const Divider(height: 1),
                      const SizedBox(height: 14),
                      
                      // File row
                      Row(
                        children: [
                          const Icon(Icons.picture_as_pdf_rounded, color: DesignSystem.accentCoral, size: 20),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              file,
                              style: DesignSystem.bodyStyle(
                                fontSize: 12,
                                color: DesignSystem.primary,
                                fontWeight: FontWeight.bold,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 8),
                          TextButton(
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Downloading $file from Google Drive...'),
                                  duration: const Duration(seconds: 1),
                                  behavior: SnackBarBehavior.floating,
                                ),
                              );
                            },
                            child: Text(
                              'DOWNLOAD',
                              style: DesignSystem.headingStyle(fontSize: 10, color: DesignSystem.secondary),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddQuoteDialog,
        backgroundColor: DesignSystem.secondary,
        child: const Icon(Icons.note_add_rounded, color: Colors.white),
      ),
    );
  }
}
