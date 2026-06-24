import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../app_state.dart';
import '../theme/design_system.dart';

class ApproveExpensesScreen extends StatefulWidget {
  const ApproveExpensesScreen({super.key});

  @override
  State<ApproveExpensesScreen> createState() => _ApproveExpensesScreenState();
}

class _ApproveExpensesScreenState extends State<ApproveExpensesScreen> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _expenses = [];

  @override
  void initState() {
    super.initState();
    _loadExpenses();
  }

  Future<void> _loadExpenses() async {
    final appState = Provider.of<AppState>(context, listen: false);
    
    if (appState.activeSeasonId == 'demo-season-id') {
      // Offline Demo Mode: Pull from AppState
      setState(() {
        _expenses = List<Map<String, dynamic>>.from(appState.demoExpenses);
        _isLoading = false;
      });
    } else {
      // Real Cloud Mode: Query Supabase
      try {
        final supabase = Supabase.instance.client;
        final response = await supabase
            .from('expense')
            .select('*')
            .order('created_at', ascending: false);

        if (response != null) {
          final List<Map<String, dynamic>> loaded = [];
          for (var item in response) {
            loaded.add({
              'id': item['id']?.toString() ?? '',
              'title': item['title']?.toString() ?? item['description']?.toString() ?? 'Vendor Bill',
              'vendor': item['vendor_name']?.toString() ?? 'Vendor',
              'amount': (item['amount'] as num?)?.toDouble() ?? 0.0,
              'status': item['status']?.toString() ?? 'PENDING',
              'requires_role': 'CORE_TEAM',
            });
          }
          setState(() {
            _expenses = loaded;
          });
        }
      } catch (e) {
        debugPrint('Error fetching expenses: $e');
      } finally {
        setState(() => _isLoading = false);
      }
    }
  }

  void _approveExpense(String expenseId, String title) async {
    setState(() => _isLoading = true);

    final appState = Provider.of<AppState>(context, listen: false);

    if (appState.activeSeasonId == 'demo-season-id') {
      // Offline Demo Mode: Approve in AppState
      await Future.delayed(const Duration(milliseconds: 600));
      appState.approveExpenseInDemo(expenseId);
      
      // Reload from state
      setState(() {
        _expenses = List<Map<String, dynamic>>.from(appState.demoExpenses);
        _isLoading = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Expense "$title" approved successfully! (Demo Mode)'),
            backgroundColor: DesignSystem.successGreen,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } else {
      // Real Cloud Mode: Invoke approve_expense RPC database function
      try {
        final supabase = Supabase.instance.client;
        await supabase.rpc('approve_expense', params: {
          'target_expense_id': expenseId,
          'approver_member_id': appState.userMemberId ?? '00000000-0000-0000-0000-000000000000',
        });

        // Reload data from DB
        await _loadExpenses();

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Expense "$title" approved successfully!'),
              backgroundColor: DesignSystem.successGreen,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          setState(() => _isLoading = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to approve expense: ${e.toString()}'),
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
    final pendingCount = _expenses.where((element) => element['status'] == 'PENDING').length;

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: DesignSystem.background,
        appBar: AppBar(
          title: Text(
            'Expense Approvals Board',
            style: DesignSystem.headingStyle(fontSize: 20),
          ),
          backgroundColor: DesignSystem.background,
          elevation: 0,
          iconTheme: const IconThemeData(color: DesignSystem.textPrimary),
          bottom: TabBar(
            labelColor: DesignSystem.primary,
            unselectedLabelColor: DesignSystem.textMuted,
            indicatorColor: DesignSystem.primary,
            indicatorWeight: 3,
            labelStyle: DesignSystem.headingStyle(fontSize: 14),
            tabs: [
              Tab(text: 'Pending ($pendingCount)'),
              Tab(text: 'History'),
            ],
          ),
        ),
        body: _isLoading
            ? const Center(
                child: CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(DesignSystem.primary),
                ),
              )
            : TabBarView(
                children: [
                  // Tab 1: Pending Approvals
                  _buildExpensesList(
                    _expenses.where((element) => element['status'] == 'PENDING').toList(),
                    isHistory: false,
                  ),
                  // Tab 2: Approved History
                  _buildExpensesList(
                    _expenses.where((element) => element['status'] == 'APPROVED').toList(),
                    isHistory: true,
                  ),
                ],
              ),
      ),
    );
  }

  Widget _buildExpensesList(List<Map<String, dynamic>> list, {required bool isHistory}) {
    if (list.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              isHistory ? Icons.history_rounded : Icons.check_circle_outline_rounded,
              size: 64,
              color: DesignSystem.textMuted.withOpacity(0.3),
            ),
            const SizedBox(height: 12),
            Text(
              isHistory ? 'No approval history found.' : 'All clear! No pending approvals.',
              style: DesignSystem.headingStyle(fontSize: 16, color: DesignSystem.textMuted),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(24),
      itemCount: list.length,
      itemBuilder: (context, index) {
        final exp = list[index];
        final double amount = exp['amount'];
        final String title = exp['title'];
        final String vendor = exp['vendor'];
        final String status = exp['status'];
        final String expenseId = exp['id'];

        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(20),
          decoration: DesignSystem.cardDecoration(
            borderAccentColor: isHistory ? DesignSystem.successGreen : DesignSystem.accentCoral,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style: DesignSystem.headingStyle(fontSize: 16, color: DesignSystem.textPrimary),
                    ),
                  ),
                  Text(
                    '₹${amount.toStringAsFixed(0)}',
                    style: DesignSystem.headingStyle(
                      fontSize: 18,
                      color: isHistory ? DesignSystem.successGreen : DesignSystem.accentCoral,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Vendor: $vendor',
                    style: DesignSystem.bodyStyle(fontSize: 13, color: DesignSystem.textMuted, fontWeight: FontWeight.bold),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: (isHistory ? DesignSystem.successGreen : DesignSystem.accentCoral).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      status,
                      style: DesignSystem.headingStyle(
                        fontSize: 9,
                        color: isHistory ? DesignSystem.successGreen : DesignSystem.accentCoral,
                      ),
                    ),
                  ),
                ],
              ),
              if (!isHistory) ...[
                const SizedBox(height: 16),
                const Divider(height: 1),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    ElevatedButton.icon(
                      onPressed: () => _approveExpense(expenseId, title),
                      style: DesignSystem.buttonStyle(color: DesignSystem.primary).copyWith(
                        padding: MaterialStateProperty.all(
                          const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        ),
                      ),
                      icon: const Icon(Icons.done_rounded, size: 18, color: Colors.white),
                      label: Text(
                        'APPROVE EXPENSE',
                        style: DesignSystem.headingStyle(fontSize: 12, color: Colors.white),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}
