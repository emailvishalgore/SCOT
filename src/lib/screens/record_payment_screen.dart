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

  String? _selectedWingId;
  String _selectedWingName = 'N';
  List<Map<String, String>> _wings = [];

  String? _selectedFlatId;
  String _selectedFlatNumber = '';
  List<Map<String, String>> _flats = [];
  
  bool _isFetchingFlats = true;
  bool _isLoading = false;
  bool _receiptSelected = false;

  @override
  void initState() {
    super.initState();
    _loadWingsAndFlats();
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _loadWingsAndFlats() async {
    final appState = Provider.of<AppState>(context, listen: false);
    final isCoreOrAdmin = appState.userRole == 'CORE_TEAM' || appState.userRole == 'SCOT_ADMIN';

    if (appState.activeSeasonId == 'demo-season-id') {
      // Offline Demo Mode
      if (isCoreOrAdmin) {
        final List<Map<String, String>> mockWings = ['N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W'].map((w) {
          return {'id': w, 'name': 'Wing $w'};
        }).toList();

        setState(() {
          _wings = mockWings;
          _selectedWingId = 'N';
          _selectedWingName = 'N';
        });
      } else {
        setState(() {
          _selectedWingId = appState.userWingId ?? 'N';
          _selectedWingName = appState.userWingId ?? 'N';
        });
      }
      await _loadFlatsForWing(_selectedWingId!);
    } else {
      // Real Cloud Mode
      try {
        final supabase = Supabase.instance.client;
        if (isCoreOrAdmin) {
          final wingRes = await supabase.from('wing').select('id, name').order('name');
          if (wingRes != null) {
            final List<Map<String, String>> loadedWings = [];
            for (var w in wingRes) {
              loadedWings.add({
                'id': w['id']?.toString() ?? '',
                'name': 'Wing ${w['name']}',
              });
            }
            setState(() {
              _wings = loadedWings;
              if (_wings.isNotEmpty) {
                _selectedWingId = _wings.first['id'];
                final matched = wingRes.first;
                _selectedWingName = matched['name']?.toString() ?? 'N';
              }
            });
          }
        } else {
          final wingId = appState.userWingId ?? '';
          setState(() {
            _selectedWingId = wingId;
          });
        }
        await _loadFlatsForWing(_selectedWingId!);
      } catch (e) {
        debugPrint('Error loading wings: $e');
        setState(() => _isFetchingFlats = false);
      }
    }
  }

  Future<void> _loadFlatsForWing(String wingId) async {
    setState(() => _isFetchingFlats = true);
    final appState = Provider.of<AppState>(context, listen: false);

    if (appState.activeSeasonId == 'demo-season-id') {
      final List<Map<String, String>> mockFlats = [];
      for (int floor = 1; floor <= 7; floor++) {
        for (int flatNum = 1; flatNum <= 4; flatNum++) {
          final number = '$floor${flatNum.toString().padLeft(2, '0')}';
          mockFlats.add({
            'id': 'demo-flat-$wingId-$number',
            'number': number,
          });
        }
      }
      setState(() {
        _flats = mockFlats;
        if (_flats.isNotEmpty) {
          _selectedFlatId = _flats.first['id'];
          _selectedFlatNumber = _flats.first['number']!;
        } else {
          _selectedFlatId = null;
          _selectedFlatNumber = '';
        }
        _isFetchingFlats = false;
      });
    } else {
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
            } else {
              _selectedFlatId = null;
              _selectedFlatNumber = '';
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
      await Future.delayed(const Duration(milliseconds: 600));
      appState.markFlatAsPaidInDemo(_selectedFlatNumber);
      
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Contribution logged successfully for Flat $_selectedWingName-$_selectedFlatNumber! (Demo Mode)'),
            backgroundColor: DesignSystem.successGreen,
            behavior: SnackBarBehavior.floating,
          ),
        );
        Navigator.pop(context);
      }
    } else {
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
              content: Text('Contribution recorded successfully for Flat $_selectedWingName-$_selectedFlatNumber!'),
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
    final appState = Provider.of<AppState>(context);
    final isCoreOrAdmin = appState.userRole == 'CORE_TEAM' || appState.userRole == 'SCOT_ADMIN';

    return Scaffold(
      backgroundColor: DesignSystem.background,
      appBar: const ScotHeaderBar(
        title: 'Record Flat Contribution',
        showBackButton: true,
        primaryColor: DesignSystem.secondary,
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
            child: _isFetchingFlats
                ? const Center(
                    child: CircularProgressIndicator(
                      valueColor: AlwaysStoppedAnimation<Color>(DesignSystem.secondary),
                    ),
                  )
                : SingleChildScrollView(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(24),
                          decoration: DesignSystem.glassDecoration(borderAccentColor: DesignSystem.secondary, fillOpacity: 0.12),
                          child: Form(
                            key: _formKey,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Text(
                                  'CONTRIBUTION OVERRIDE',
                                  style: DesignSystem.headingStyle(fontSize: 14, color: Colors.white70),
                                ),
                                const SizedBox(height: 20),

                                // Wing Selector dropdown (Visible to Core / Admin)
                                if (isCoreOrAdmin) ...[
                                  Text(
                                    'SELECT WING',
                                    style: DesignSystem.headingStyle(fontSize: 12, color: Colors.white70),
                                  ),
                                  const SizedBox(height: 8),
                                  _wings.isEmpty
                                      ? Text(
                                          'No wings loaded.',
                                          style: DesignSystem.bodyStyle(color: DesignSystem.accentCoral, fontWeight: FontWeight.bold),
                                        )
                                      : DropdownButtonFormField<String>(
                                          value: _selectedWingId,
                                          dropdownColor: const Color(0xFF1E293B),
                                          style: DesignSystem.bodyStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                          decoration: InputDecoration(
                                            filled: true,
                                            fillColor: Colors.white.withOpacity(0.08),
                                            labelText: 'Wing',
                                            labelStyle: DesignSystem.bodyStyle(color: Colors.white70, fontSize: 13),
                                            enabledBorder: OutlineInputBorder(
                                              borderRadius: BorderRadius.circular(16),
                                              borderSide: BorderSide(color: Colors.white.withOpacity(0.2)),
                                            ),
                                            focusedBorder: OutlineInputBorder(
                                              borderRadius: BorderRadius.circular(16),
                                              borderSide: const BorderSide(color: DesignSystem.secondary, width: 2),
                                            ),
                                          ),
                                          onChanged: (value) {
                                            if (value != null) {
                                              setState(() {
                                                _selectedWingId = value;
                                                final matched = _wings.firstWhere((w) => w['id'] == value, orElse: () => {'name': 'Wing N'});
                                                _selectedWingName = matched['name']!.replaceAll('Wing ', '');
                                              });
                                              _loadFlatsForWing(value);
                                            }
                                          },
                                          items: _wings.map((w) {
                                            return DropdownMenuItem<String>(
                                              value: w['id'],
                                              child: Text(w['name']!),
                                            );
                                          }).toList(),
                                        ),
                                  const SizedBox(height: 20),
                                ],

                                // Flat Selector dropdown
                                Text(
                                  'SELECT FLAT NUMBER',
                                  style: DesignSystem.headingStyle(fontSize: 12, color: Colors.white70),
                                ),
                                const SizedBox(height: 8),
                                _flats.isEmpty
                                    ? Text(
                                        'No flats found in the selected Wing.',
                                        style: DesignSystem.bodyStyle(color: DesignSystem.accentCoral, fontWeight: FontWeight.bold),
                                      )
                                    : DropdownButtonFormField<String>(
                                        value: _selectedFlatId,
                                        dropdownColor: const Color(0xFF1E293B),
                                        style: DesignSystem.bodyStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                        decoration: InputDecoration(
                                          filled: true,
                                          fillColor: Colors.white.withOpacity(0.08),
                                          labelText: 'Flat',
                                          labelStyle: DesignSystem.bodyStyle(color: Colors.white70, fontSize: 13),
                                          enabledBorder: OutlineInputBorder(
                                            borderRadius: BorderRadius.circular(16),
                                            borderSide: BorderSide(color: Colors.white.withOpacity(0.2)),
                                          ),
                                          focusedBorder: OutlineInputBorder(
                                            borderRadius: BorderRadius.circular(16),
                                            borderSide: const BorderSide(color: DesignSystem.secondary, width: 2),
                                          ),
                                        ),
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
                                            child: Text('Flat $selectedFlatPrefix${flat['number']}'),
                                          );
                                        }).toList(),
                                      ),
                                const SizedBox(height: 20),

                                // Payment Amount
                                TextFormField(
                                  controller: _amountController,
                                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                  style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold, color: Colors.white),
                                  decoration: InputDecoration(
                                    filled: true,
                                    fillColor: Colors.white.withOpacity(0.08),
                                    labelText: 'Contribution Amount (₹)',
                                    labelStyle: DesignSystem.bodyStyle(color: Colors.white70, fontSize: 13),
                                    prefixIcon: const Icon(Icons.currency_rupee_rounded, color: DesignSystem.secondary),
                                    enabledBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(16),
                                      borderSide: BorderSide(color: Colors.white.withOpacity(0.2)),
                                    ),
                                    focusedBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(16),
                                      borderSide: const BorderSide(color: DesignSystem.secondary, width: 2),
                                    ),
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
                                  style: DesignSystem.headingStyle(fontSize: 12, color: Colors.white70),
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
                                    decoration: DesignSystem.glassDecoration(
                                      borderAccentColor: _receiptSelected ? DesignSystem.successGreen : DesignSystem.secondary,
                                      fillOpacity: _receiptSelected ? 0.08 : 0.04,
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
                                                  style: DesignSystem.bodyStyle(color: Colors.white70, fontSize: 13),
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
          ),
        ],
      ),
    );
  }

  String get selectedFlatPrefix {
    final appState = Provider.of<AppState>(context, listen: false);
    final isCoreOrAdmin = appState.userRole == 'CORE_TEAM' || appState.userRole == 'SCOT_ADMIN';
    return isCoreOrAdmin ? '$_selectedWingName-' : '';
  }
}
