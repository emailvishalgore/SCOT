import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../app_state.dart';
import '../theme/design_system.dart';

class RecordPaymentScreen extends StatefulWidget {
  const RecordPaymentScreen({super.key});

  @override
  State<RecordPaymentScreen> createState() => _RecordPaymentScreenState();
}

class _RecordPaymentScreenState extends State<RecordPaymentScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController(text: '5000');

  String? _selectedFlatId;
  String _selectedFlatNumber = '';
  List<Map<String, String>> _flats = [];
  bool _isFetchingFlats = true;
  bool _isLoading = false;
  bool _receiptSelected = false;

  @override
  void initState() {
    super.initState();
    _loadFlats();
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _loadFlats() async {
    final appState = Provider.of<AppState>(context, listen: false);
    final wingId = appState.userWingId ?? 'N';

    final isUuid = RegExp(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$').hasMatch(wingId);

    if (!isUuid) {
      // Offline Demo Mode: Generate 28 mock flats (numbered 101 to 704)
      final List<Map<String, String>> mockFlats = [];
      for (int floor = 1; floor <= 7; floor++) {
        for (int flatNum = 1; flatNum <= 4; flatNum++) {
          final number = '$floor${flatNum.toString().padLeft(2, '0')}';
          mockFlats.add({
            'id': 'demo-flat-$number',
            'number': number,
          });
        }
      }
      setState(() {
        _flats = mockFlats;
        if (_flats.isNotEmpty) {
          _selectedFlatId = _flats.first['id'];
          _selectedFlatNumber = _flats.first['number']!;
        }
        _isFetchingFlats = false;
      });
    } else {
      // Real Cloud Mode: Query Supabase flats
      try {
        final supabase = Supabase.instance.client;
        final response = await supabase
            .from('flat')
            .select('id, number')
            .eq('wing_id', wingId)
            .order('number');

        if (response != null) {
          final List<Map<String, String>> loadedFlats = [];
          for (var item in response) {
            loadedFlats.add({
              'id': item['id']?.toString() ?? '',
              'number': item['number']?.toString() ?? '',
            });
          }
          setState(() {
            _flats = loadedFlats;
            if (_flats.isNotEmpty) {
              _selectedFlatId = _flats.first['id'];
              _selectedFlatNumber = _flats.first['number']!;
            }
          });
        }
      } catch (e) {
        debugPrint('Error loading flats: $e');
      } finally {
        setState(() => _isFetchingFlats = false);
      }
    }
  }

  void _submitPayment() async {
    if (!_formKey.currentState!.validate() || _selectedFlatId == null) return;

    setState(() => _isLoading = true);
    final amount = double.tryParse(_amountController.text.trim()) ?? 5000.0;

    final appState = Provider.of<AppState>(context, listen: false);

    if (appState.activeSeasonId == 'demo-season-id') {
      // Offline Demo Mode: Mark flat as paid in state
      await Future.delayed(const Duration(milliseconds: 600));
      appState.markFlatAsPaidInDemo(_selectedFlatNumber);
      
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Contribution logged successfully for Flat $_selectedFlatNumber! (Demo Mode)'),
            backgroundColor: DesignSystem.successGreen,
            behavior: SnackBarBehavior.floating,
          ),
        );
        Navigator.pop(context);
      }
    } else {
      // Real Cloud Mode: Invoke record_payment RPC database procedure
      try {
        final supabase = Supabase.instance.client;
        await supabase.rpc('record_payment', params: {
          'target_flat_id': _selectedFlatId!,
          'active_season_id': appState.activeSeasonId!,
          'payment_amount': amount,
          'recorder_member_id': appState.userMemberId ?? '00000000-0000-0000-0000-000000000000',
        });

        if (mounted) {
          setState(() => _isLoading = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Contribution recorded successfully for Flat $_selectedFlatNumber!'),
              backgroundColor: DesignSystem.successGreen,
              behavior: SnackBarBehavior.floating,
            ),
          );
          Navigator.pop(context);
        }
      } catch (e) {
        if (mounted) {
          setState(() => _isLoading = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to record contribution: ${e.toString()}'),
              backgroundColor: DesignSystem.accentCoral,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DesignSystem.background,
      appBar: AppBar(
        title: Text(
          'Record Flat Contribution',
          style: DesignSystem.headingStyle(fontSize: 20),
        ),
        backgroundColor: DesignSystem.background,
        elevation: 0,
        iconTheme: const IconThemeData(color: DesignSystem.textPrimary),
      ),
      body: _isFetchingFlats
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
                  // Form Container Card
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: DesignSystem.cardDecoration(borderAccentColor: DesignSystem.secondary),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            'CONTRIBUTION OVERRIDE',
                            style: DesignSystem.headingStyle(fontSize: 14, color: DesignSystem.textMuted),
                          ),
                          const SizedBox(height: 20),

                          // Flat Selector dropdown
                          Text(
                            'SELECT FLAT NUMBER',
                            style: DesignSystem.headingStyle(fontSize: 12, color: DesignSystem.textMuted),
                          ),
                          const SizedBox(height: 8),
                          _flats.isEmpty
                              ? Text(
                                  'No flats found in your Wing.',
                                  style: DesignSystem.bodyStyle(color: DesignSystem.accentCoral, fontWeight: FontWeight.bold),
                                )
                              : Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(color: DesignSystem.secondary.withOpacity(0.3), width: 1.5),
                                  ),
                                  child: DropdownButtonHideUnderline(
                                    child: DropdownButton<String>(
                                      value: _selectedFlatId,
                                      isExpanded: true,
                                      style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold),
                                      onChanged: (value) {
                                        if (value != null) {
                                          final matched = _flats.firstWhere((element) => element['id'] == value);
                                          setState(() {
                                            _selectedFlatId = value;
                                            _selectedFlatNumber = matched['number']!;
                                          });
                                        }
                                      },
                                      items: _flats.map((flat) {
                                        return DropdownMenuItem<String>(
                                          value: flat['id'],
                                          child: Text('Flat ${flat['number']}'),
                                        );
                                      }).toList(),
                                    ),
                                  ),
                                ),
                          const SizedBox(height: 20),

                          // Payment Amount
                          TextFormField(
                            controller: _amountController,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold),
                            decoration: InputDecoration(
                              labelText: 'Contribution Amount (₹)',
                              labelStyle: DesignSystem.bodyStyle(color: DesignSystem.textMuted),
                              prefixIcon: const Icon(Icons.currency_rupee_rounded, color: DesignSystem.secondary),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(20),
                                borderSide: const BorderSide(color: DesignSystem.secondary, width: 2),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(20),
                                borderSide: BorderSide(color: DesignSystem.secondary.withOpacity(0.3), width: 1.5),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(20),
                                borderSide: const BorderSide(color: DesignSystem.secondary, width: 2),
                              ),
                              filled: true,
                              fillColor: Colors.white,
                            ),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'Please enter the payment amount';
                              }
                              if (double.tryParse(value) == null || double.parse(value) <= 0) {
                                return 'Please enter a valid amount';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 24),

                          // Mock Receipt Picker Box
                          Text(
                            'ATTACH TRANSACTION RECEIPT',
                            style: DesignSystem.headingStyle(fontSize: 12, color: DesignSystem.textMuted),
                          ),
                          const SizedBox(height: 8),
                          InkWell(
                            onTap: () {
                              setState(() => _receiptSelected = !_receiptSelected);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(_receiptSelected ? 'Receipt image loaded!' : 'Receipt removed!'),
                                  duration: const Duration(seconds: 1),
                                  behavior: SnackBarBehavior.floating,
                                ),
                              );
                            },
                            child: Container(
                              height: 120,
                              decoration: BoxDecoration(
                                color: _receiptSelected ? DesignSystem.successGreen.withOpacity(0.05) : Colors.white,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: _receiptSelected ? DesignSystem.successGreen : DesignSystem.secondary.withOpacity(0.3),
                                  width: _receiptSelected ? 2.0 : 1.5,
                                  style: BorderStyle.solid,
                                ),
                              ),
                              child: Center(
                                child: _receiptSelected
                                    ? Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          const Icon(Icons.check_circle_rounded, color: DesignSystem.successGreen, size: 32),
                                          const SizedBox(height: 6),
                                          Text(
                                            'receipt_10293.png attached',
                                            style: DesignSystem.bodyStyle(
                                              color: DesignSystem.successGreen,
                                              fontSize: 13,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ],
                                      )
                                    : Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          const Icon(Icons.cloud_upload_outlined, color: DesignSystem.secondary, size: 32),
                                          const SizedBox(height: 6),
                                          Text(
                                            'Tap to select a screenshot/receipt',
                                            style: DesignSystem.bodyStyle(color: DesignSystem.textMuted, fontSize: 13),
                                          ),
                                        ],
                                      ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 28),

                          // Submit Button
                          ElevatedButton(
                            onPressed: (_isLoading || _selectedFlatId == null) ? null : _submitPayment,
                            style: DesignSystem.buttonStyle(color: DesignSystem.secondary),
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
                                    'LOG CONTRIBUTION',
                                    style: DesignSystem.headingStyle(
                                      fontSize: 16,
                                      color: Colors.white,
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
    );
  }
}
