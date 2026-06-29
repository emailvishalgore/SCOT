import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../app_state.dart';
import '../theme/design_system.dart';

class VendorManagementView extends StatefulWidget {
  const VendorManagementView({super.key});

  @override
  State<VendorManagementView> createState() => _VendorManagementViewState();
}

class _VendorManagementViewState extends State<VendorManagementView> {
  final List<String> _categories = [
    'Catering',
    'Sound & DJ',
    'Tents & Stages',
    'Printing & Banners',
    'Prizes & Trophies',
    'Lighting',
    'Feta',
    'Pooja Pandit'
  ];

  String _selectedCategory = 'Catering';
  bool _isLoading = false;
  List<Map<String, dynamic>> _quotes = [];

  // Controllers for Add Quote Dialog
  final _formKey = GlobalKey<FormState>();
  final _vendorNameController = TextEditingController();
  final _amountController = TextEditingController();
  final _descController = TextEditingController();

  InputDecoration _buildInputDeco(String label, IconData icon) {
    return InputDecoration(
      filled: true,
      fillColor: Colors.white.withOpacity(0.08),
      labelText: label,
      labelStyle: DesignSystem.bodyStyle(color: Colors.white70, fontSize: 13),
      prefixIcon: Icon(icon, color: DesignSystem.secondary),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: Colors.white.withOpacity(0.2)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: DesignSystem.secondary, width: 2),
      ),
    );
  }

  @override
  void initState() {
    super.initState();
    _loadQuotes();
  }

  @override
  void dispose() {
    _vendorNameController.dispose();
    _amountController.dispose();
    _descController.dispose();
    super.dispose();
  }

  Future<void> _loadQuotes() async {
    setState(() => _isLoading = true);
    final appState = Provider.of<AppState>(context, listen: false);

    if (appState.activeSeasonId == 'demo-season-id') {
      // Filter offline demo quotes by active category
      final filtered = appState.demoQuotes
          .where((element) => element['service_category'] == _selectedCategory)
          .toList();
      setState(() {
        _quotes = List<Map<String, dynamic>>.from(filtered);
        _isLoading = false;
      });
    } else {
      // Real Cloud Mode
      try {
        final supabase = Supabase.instance.client;
        final res = await supabase
            .from('vendor_quotation')
            .select('*, vendor:vendor_id(*)')
            .eq('season_id', appState.activeSeasonId ?? '')
            .eq('service_category', _selectedCategory);

        if (res != null) {
          final List<Map<String, dynamic>> loaded = [];
          for (var item in res) {
            final vendorMap = item['vendor'] as Map<String, dynamic>?;
            loaded.add({
              'id': item['id'],
              'vendor': vendorMap?['name'] ?? 'Unknown Vendor',
              'service_category': item['service_category'] ?? _selectedCategory,
              'amount': (item['amount'] as num?)?.toDouble() ?? 0.0,
              'description': item['description'] ?? 'No description provided.',
              'status': item['status'] ?? 'SUBMITTED',
              'voter_ids': List<String>.from(item['voter_ids'] ?? []),
            });
          }
          setState(() {
            _quotes = loaded;
            _isLoading = false;
          });
        } else {
          setState(() {
            _quotes = [];
            _isLoading = false;
          });
        }
      } catch (e) {
        debugPrint('Error loading quotes: $e');
        setState(() {
          _quotes = [];
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _castVote(String quoteId) async {
    final appState = Provider.of<AppState>(context, listen: false);
    final voter = appState.userResidentId ?? 'unknown_user';

    if (appState.activeSeasonId == 'demo-season-id') {
      // Toggle demo vote
      appState.castVendorVoteInDemo(quoteId, voter);
      _loadQuotes();
    } else {
      // Real Cloud Mode update
      try {
        final supabase = Supabase.instance.client;
        
        // Load target quote first
        final quoteRes = await supabase
            .from('vendor_quotation')
            .select('voter_ids')
            .eq('id', quoteId)
            .single();

        final List<String> voters = List<String>.from(quoteRes['voter_ids'] ?? []);

        if (voters.contains(voter)) {
          voters.remove(voter);
        } else {
          // Clear voter from all other quotes in this category
          for (var q in _quotes) {
            final qId = q['id'] as String;
            final List<String> vList = List<String>.from(q['voter_ids'] ?? []);
            if (vList.contains(voter)) {
              vList.remove(voter);
              await supabase
                  .from('vendor_quotation')
                  .update({'voter_ids': vList})
                  .eq('id', qId);
            }
          }
          voters.add(voter);
        }

        await supabase
            .from('vendor_quotation')
            .update({'voter_ids': voters})
            .eq('id', quoteId);

        _loadQuotes();
      } catch (e) {
        debugPrint('Error casting vote: $e');
      }
    }
  }

  Future<void> _confirmQuote(String quoteId) async {
    final appState = Provider.of<AppState>(context, listen: false);

    if (appState.activeSeasonId == 'demo-season-id') {
      appState.confirmVendorQuoteInDemo(quoteId);
      _loadQuotes();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vendor quote successfully confirmed!')),
      );
    } else {
      // Cloud Mode confirmation
      try {
        final supabase = Supabase.instance.client;
        
        // Approve selected, reject others in the same category
        for (var q in _quotes) {
          final qId = q['id'] as String;
          final status = (qId == quoteId) ? 'APPROVED' : 'REJECTED';
          await supabase
              .from('vendor_quotation')
              .update({'status': status})
              .eq('id', qId);
        }
        _loadQuotes();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Vendor quote successfully confirmed!')),
        );
      } catch (e) {
        debugPrint('Error confirming quote: $e');
      }
    }
  }

  Future<void> _submitNewQuote() async {
    if (!_formKey.currentState!.validate()) return;

    final appState = Provider.of<AppState>(context, listen: false);
    final vendorName = _vendorNameController.text.trim();
    final amount = double.parse(_amountController.text.trim());
    final description = _descController.text.trim();

    if (appState.activeSeasonId == 'demo-season-id') {
      appState.addCustomQuoteInDemo(vendorName, _selectedCategory, amount, description);
      Navigator.pop(context);
      _loadQuotes();
    } else {
      // Cloud Mode insert
      try {
        final supabase = Supabase.instance.client;

        // 1. Ensure vendor exists, or create new vendor record
        final vendorCheck = await supabase
            .from('vendor')
            .select('id')
            .eq('name', vendorName)
            .maybeSingle();

        String vendorId;
        if (vendorCheck == null) {
          final newVendor = await supabase.from('vendor').insert({
            'name': vendorName,
            'contact_person': 'Local Representative',
            'phone': '9999999999',
            'service_category': _selectedCategory,
          }).select('id').single();
          vendorId = newVendor['id'];
        } else {
          vendorId = vendorCheck['id'];
        }

        // 2. Insert quotation record
        await supabase.from('vendor_quotation').insert({
          'season_id': appState.activeSeasonId ?? '',
          'vendor_id': vendorId,
          'service_category': _selectedCategory,
          'amount': amount,
          'description': description,
          'quotation_file_url': 'local_quote_attachment.pdf',
          'status': 'SUBMITTED',
          'voter_ids': [],
        });

        Navigator.pop(context);
        _loadQuotes();
      } catch (e) {
        debugPrint('Error submitting quote: $e');
      }
    }
  }

  void _showAddQuoteDialog() {
    _vendorNameController.clear();
    _amountController.clear();
    _descController.clear();

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: DesignSystem.background,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Colors.white24),
          ),
          title: Text(
            'Add Vendor Quotation',
            style: DesignSystem.headingStyle(fontSize: 18, color: Colors.white),
          ),
          content: SingleChildScrollView(
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Category Info (Read-only for selected context)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: DesignSystem.glassDecoration(
                      borderAccentColor: DesignSystem.primary,
                      fillOpacity: 0.05,
                    ),
                    child: Text(
                      'Category: $_selectedCategory',
                      style: DesignSystem.bodyStyle(fontSize: 13, color: DesignSystem.secondary),
                    ),
                  ),

                  // Vendor Name
                  TextFormField(
                    controller: _vendorNameController,
                    decoration: _buildInputDeco('Vendor Name', Icons.storefront_rounded),
                    style: const TextStyle(color: Colors.white),
                    validator: (val) =>
                        (val == null || val.trim().isEmpty) ? 'Enter vendor name' : null,
                  ),
                  const SizedBox(height: 16),

                  // Amount
                  TextFormField(
                    controller: _amountController,
                    keyboardType: TextInputType.number,
                    decoration: _buildInputDeco('Quote Amount (₹)', Icons.currency_rupee_rounded),
                    style: const TextStyle(color: Colors.white),
                    validator: (val) {
                      if (val == null || val.trim().isEmpty) return 'Enter quote amount';
                      if (double.tryParse(val.trim()) == null) return 'Enter a valid number';
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),

                  // Description
                  TextFormField(
                    controller: _descController,
                    maxLines: 3,
                    decoration: _buildInputDeco('Brief Description/Details', Icons.description_rounded),
                    style: const TextStyle(color: Colors.white),
                    validator: (val) =>
                        (val == null || val.trim().isEmpty) ? 'Enter bid description' : null,
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('CANCEL', style: TextStyle(color: Colors.white54)),
            ),
            ElevatedButton(
              onPressed: _submitNewQuote,
              style: DesignSystem.buttonStyle(color: DesignSystem.primary),
              child: const Text('SUBMIT BID'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final user = appState.userResidentId ?? '';

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header panel
            Container(
              padding: const EdgeInsets.all(20),
              decoration: DesignSystem.glassDecoration(
                borderAccentColor: DesignSystem.primary,
                fillOpacity: 0.1,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'VENDOR RELATIONS & BIDDING',
                        style: DesignSystem.headingStyle(fontSize: 11, color: DesignSystem.secondary),
                      ),
                      ElevatedButton.icon(
                        onPressed: _showAddQuoteDialog,
                        style: DesignSystem.buttonStyle(color: DesignSystem.primary),
                        icon: const Icon(Icons.add_rounded, size: 16, color: Colors.white),
                        label: Text(
                          'ADD QUOTE',
                          style: DesignSystem.headingStyle(fontSize: 12, color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Vendor Comparison Console',
                    style: DesignSystem.headingStyle(fontSize: 20, color: Colors.white),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Select a portfolio category below, compare quotations submitted by different vendors, and vote on the best options to confirm them.',
                    style: DesignSystem.bodyStyle(fontSize: 13, color: Colors.white70),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Dropdown selector
            Row(
              children: [
                Text(
                  'Service Type:  ',
                  style: DesignSystem.headingStyle(fontSize: 13, color: Colors.white70),
                ),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: DesignSystem.glassDecoration(
                      borderAccentColor: Colors.white30,
                      fillOpacity: 0.05,
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _selectedCategory,
                        dropdownColor: DesignSystem.background,
                        style: DesignSystem.bodyStyle(fontSize: 14, color: Colors.white),
                        icon: const Icon(Icons.arrow_drop_down_rounded, color: Colors.white),
                        items: _categories.map((String value) {
                          return DropdownMenuItem<String>(
                            value: value,
                            child: Text(value),
                          );
                        }).toList(),
                        onChanged: (newValue) {
                          if (newValue != null) {
                            setState(() {
                              _selectedCategory = newValue;
                            });
                            _loadQuotes();
                          }
                        },
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Comparison list
            if (_isLoading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(40.0),
                  child: CircularProgressIndicator(
                    valueColor: AlwaysStoppedAnimation<Color>(DesignSystem.primary),
                  ),
                ),
              )
            else if (_quotes.isEmpty)
              Container(
                padding: const EdgeInsets.all(32),
                decoration: DesignSystem.glassDecoration(
                  borderAccentColor: Colors.white12,
                  fillOpacity: 0.05,
                ),
                child: Column(
                  children: [
                    const Icon(Icons.store_mall_directory_rounded, size: 48, color: Colors.white24),
                    const SizedBox(height: 12),
                    Text(
                      'No quotations submitted for "$_selectedCategory" yet.',
                      style: DesignSystem.bodyStyle(fontSize: 13, color: Colors.white54),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _quotes.length,
                separatorBuilder: (context, index) => const SizedBox(height: 16),
                itemBuilder: (context, index) {
                  final quote = _quotes[index];
                  final quoteId = quote['id'] as String;
                  final List<String> votersList = List<String>.from(quote['voter_ids'] ?? []);
                  final hasVoted = votersList.contains(user);
                  final isApproved = quote['status'] == 'APPROVED';
                  final isRejected = quote['status'] == 'REJECTED';

                  // Determine card border colors based on status
                  Color cardBorder = Colors.white24;
                  Color statusColor = DesignSystem.secondary;
                  String statusText = 'VOTING ACTIVE';

                  if (isApproved) {
                    cardBorder = DesignSystem.successGreen;
                    statusColor = DesignSystem.successGreen;
                    statusText = 'CONFIRMED';
                  } else if (isRejected) {
                    cardBorder = Colors.white12;
                    statusColor = Colors.white30;
                    statusText = 'REJECTED';
                  }

                  return Container(
                    padding: const EdgeInsets.all(20),
                    decoration: DesignSystem.glassDecoration(
                      borderAccentColor: cardBorder,
                      fillOpacity: isRejected ? 0.03 : 0.08,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Row with vendor name & status badge
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                quote['vendor'] ?? '',
                                style: DesignSystem.headingStyle(fontSize: 16, color: Colors.white),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: statusColor.withOpacity(0.12),
                                border: Border.all(color: statusColor, width: 1),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                statusText,
                                style: DesignSystem.headingStyle(fontSize: 10, color: statusColor),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),

                        // Quote details
                        Text(
                          quote['description'] ?? '',
                          style: DesignSystem.bodyStyle(fontSize: 13, color: Colors.white70),
                        ),
                        const SizedBox(height: 12),
                        const Divider(color: Colors.white12),
                        const SizedBox(height: 12),

                        // Row with Price & Votes count
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'BID ESTIMATE',
                                  style: DesignSystem.headingStyle(fontSize: 10, color: Colors.white54),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '₹${(quote['amount'] as double).toStringAsFixed(0)}',
                                  style: DesignSystem.headingStyle(
                                    fontSize: 18,
                                    color: isRejected ? Colors.white54 : DesignSystem.secondary,
                                  ),
                                ),
                              ],
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  'VOTES RECEIVED',
                                  style: DesignSystem.headingStyle(fontSize: 10, color: Colors.white54),
                                ),
                                const SizedBox(height: 2),
                                Row(
                                  children: [
                                    const Icon(Icons.star_rounded, size: 16, color: Colors.amber),
                                    const SizedBox(width: 4),
                                    Text(
                                      '${votersList.length} votes',
                                      style: DesignSystem.headingStyle(fontSize: 15, color: Colors.white),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ],
                        ),

                        // Voter avatars/usernames list if any
                        if (votersList.isNotEmpty) ...[
                          const SizedBox(height: 12),
                          Text(
                            'Voted by: ${votersList.join(", ")}',
                            style: DesignSystem.bodyStyle(fontSize: 11, color: Colors.white54),
                          ),
                        ],

                        // Actions area
                        if (!isApproved && !isRejected) ...[
                          const SizedBox(height: 16),
                          const Divider(color: Colors.white12),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              // Confirm Button (visible for SCOT_ADMIN or CORE_TEAM members)
                              if (appState.userRole == 'SCOT_ADMIN' ||
                                  appState.userRole == 'CORE_TEAM')
                                ElevatedButton.icon(
                                  onPressed: () => _confirmQuote(quoteId),
                                  style: DesignSystem.buttonStyle(color: DesignSystem.successGreen).copyWith(
                                    padding: const MaterialStatePropertyAll(
                                      EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                    ),
                                  ),
                                  icon: const Icon(Icons.check_circle_outline_rounded, size: 16, color: Colors.white),
                                  label: Text(
                                    'CONFIRM VENDOR',
                                    style: DesignSystem.headingStyle(fontSize: 11, color: Colors.white),
                                  ),
                                ),
                              const SizedBox(width: 12),

                              // Vote Button
                              ElevatedButton.icon(
                                onPressed: () => _castVote(quoteId),
                                style: DesignSystem.buttonStyle(
                                  color: hasVoted ? DesignSystem.accentCoral : DesignSystem.primary,
                                ).copyWith(
                                  padding: const MaterialStatePropertyAll(
                                    EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                  ),
                                ),
                                icon: Icon(
                                  hasVoted ? Icons.star_border_rounded : Icons.star_rounded,
                                  size: 16,
                                  color: Colors.white,
                                ),
                                label: Text(
                                  hasVoted ? 'RETRACT VOTE' : 'CAST VOTE',
                                  style: DesignSystem.headingStyle(fontSize: 11, color: Colors.white),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
}
