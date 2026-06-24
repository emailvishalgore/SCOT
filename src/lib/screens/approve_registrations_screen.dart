import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../app_state.dart';
import '../theme/design_system.dart';

class ApproveRegistrationsScreen extends StatefulWidget {
  const ApproveRegistrationsScreen({super.key});

  @override
  State<ApproveRegistrationsScreen> createState() => _ApproveRegistrationsScreenState();
}

class _ApproveRegistrationsScreenState extends State<ApproveRegistrationsScreen> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _requests = [];

  @override
  void initState() {
    super.initState();
    _loadRequests();
  }

  Future<void> _loadRequests() async {
    final appState = Provider.of<AppState>(context, listen: false);

    if (appState.activeSeasonId == 'demo-season-id') {
      // Offline Demo: load from AppState list
      setState(() {
        _requests = List<Map<String, dynamic>>.from(appState.demoPendingRegistrations);
        _isLoading = false;
      });
    } else {
      // Real Cloud: Query Supabase core.registration_request
      try {
        final supabase = Supabase.instance.client;
        
        final response = await supabase
            .from('registration_request')
            .select('id, username, mobile, status, wing:wing_id(name), flat:flat_id(number)')
            .eq('status', 'PENDING')
            .order('created_at', ascending: true);

        if (response != null) {
          final List<Map<String, dynamic>> loaded = [];
          for (var item in response) {
            final wing = item['wing'] as Map<String, dynamic>?;
            final flat = item['flat'] as Map<String, dynamic>?;

            // Load members roster for this request
            final membersRes = await supabase
                .from('registration_member_request')
                .select('name, gender, age_group')
                .eq('request_id', item['id']);

            final List<Map<String, dynamic>> members = [];
            if (membersRes != null) {
              for (var m in membersRes) {
                members.add({
                  'name': m['name']?.toString() ?? '',
                  'gender': m['gender']?.toString() ?? '',
                  'age_group': m['age_group']?.toString() ?? '',
                });
              }
            }

            loaded.add({
              'id': item['id']?.toString() ?? '',
              'username': item['username']?.toString() ?? '',
              'mobile': item['mobile']?.toString() ?? '',
              'wing': wing?['name']?.toString() ?? '',
              'flat': flat?['number']?.toString() ?? '',
              'members': members,
              'status': item['status']?.toString() ?? 'PENDING',
              'date': 'Recent'
            });
          }
          setState(() {
            _requests = loaded;
          });
        }
      } catch (e) {
        debugPrint('Error loading registrations: $e');
      } finally {
        setState(() => _isLoading = false);
      }
    }
  }

  void _approveRequest(Map<String, dynamic> request) async {
    setState(() => _isLoading = true);
    final appState = Provider.of<AppState>(context, listen: false);
    final requestId = request['id'] as String;

    if (appState.activeSeasonId == 'demo-season-id') {
      // Offline Demo: Approve request and create mock login details in AppState
      await Future.delayed(const Duration(milliseconds: 600));
      appState.approveRegistrationRequestInDemo(requestId);
      
      await _loadRequests();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Registration approved for Flat ${request['wing']}-${request['flat']}!'),
          backgroundColor: DesignSystem.successGreen,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } else {
      // Real Cloud: Call Supabase RPC core.approve_registration_request
      try {
        final supabase = Supabase.instance.client;
        await supabase.rpc('approve_registration_request', params: {
          'p_request_id': requestId,
          'p_approver_member_id': appState.userMemberId ?? '00000000-0000-0000-0000-000000000000',
        });

        await _loadRequests();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Registration approved for Flat ${request['wing']}-${request['flat']}!'),
            backgroundColor: DesignSystem.successGreen,
            behavior: SnackBarBehavior.floating,
          ),
        );
      } catch (e) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to approve request: ${e.toString()}'),
            backgroundColor: DesignSystem.accentCoral,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _rejectRequest(Map<String, dynamic> request) async {
    setState(() => _isLoading = true);
    final appState = Provider.of<AppState>(context, listen: false);
    final requestId = request['id'] as String;

    if (appState.activeSeasonId == 'demo-season-id') {
      await Future.delayed(const Duration(milliseconds: 600));
      // Simply delete from list in state
      appState.demoPendingRegistrations.removeWhere((element) => element['id'] == requestId);
      appState.notifyListeners();

      await _loadRequests();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Registration rejected for Flat ${request['wing']}-${request['flat']}.'),
          backgroundColor: DesignSystem.accentCoral,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } else {
      try {
        final supabase = Supabase.instance.client;
        await supabase
            .from('registration_request')
            .update({'status': 'REJECTED'})
            .eq('id', requestId);

        await _loadRequests();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Registration request rejected.'),
            backgroundColor: DesignSystem.accentCoral,
            behavior: SnackBarBehavior.floating,
          ),
        );
      } catch (e) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to reject: ${e.toString()}'),
            backgroundColor: DesignSystem.accentCoral,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _viewFamilyRoster(Map<String, dynamic> request) {
    final List<dynamic> members = request['members'] ?? [];

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: DesignSystem.background,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
          title: Text(
            'Family Roster (${members.length + 1} Members)',
            style: DesignSystem.headingStyle(fontSize: 18),
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Head of Flat
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: DesignSystem.primary.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: DesignSystem.primary.withOpacity(0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.stars_rounded, color: DesignSystem.primary, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              request['username'] as String,
                              style: DesignSystem.headingStyle(fontSize: 13),
                            ),
                            const Text('Primary User • Home Chief', style: TextStyle(fontSize: 10, color: DesignSystem.textMuted)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                const Divider(height: 1),
                const SizedBox(height: 12),

                // Family members
                ...members.map((m) {
                  final name = m['name'] as String;
                  final gender = m['gender'] as String;
                  final ageGroup = m['age_group'] == 'UNDER_12' 
                      ? 'Below 12' 
                      : (m['age_group'] == 'BETWEEN_12_18' ? '12-18' : 'Above 18');

                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: DesignSystem.secondary.withOpacity(0.15)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.person_outline_rounded, color: DesignSystem.secondary, size: 16),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(name, style: DesignSystem.headingStyle(fontSize: 12)),
                              Text('$gender • Age: $ageGroup', style: const TextStyle(fontSize: 9, color: DesignSystem.textMuted)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(
                'CLOSE',
                style: DesignSystem.headingStyle(fontSize: 12, color: DesignSystem.textMuted),
              ),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DesignSystem.background,
      appBar: AppBar(
        title: Text(
          'Verification Queue',
          style: DesignSystem.headingStyle(fontSize: 20),
        ),
        backgroundColor: DesignSystem.background,
        elevation: 0,
        iconTheme: const IconThemeData(color: DesignSystem.textPrimary),
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(DesignSystem.primary),
              ),
            )
          : _requests.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.checklist_rtl_rounded, size: 64, color: DesignSystem.textMuted.withOpacity(0.3)),
                      const SizedBox(height: 12),
                      Text(
                        'All clear! No pending registrations.',
                        style: DesignSystem.headingStyle(fontSize: 16, color: DesignSystem.textMuted),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(24),
                  itemCount: _requests.length,
                  itemBuilder: (context, index) {
                    final req = _requests[index];
                    final username = req['username'] as String;
                    final mobile = req['mobile'] as String;
                    final wing = req['wing'] as String;
                    final flat = req['flat'] as String;
                    final List<dynamic> members = req['members'] ?? [];

                    return Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.all(20),
                      decoration: DesignSystem.cardDecoration(borderAccentColor: DesignSystem.primary),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Flat $wing-$flat',
                                style: DesignSystem.headingStyle(fontSize: 18, color: DesignSystem.textPrimary),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: DesignSystem.primary.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  'PENDING VERIFICATION',
                                  style: DesignSystem.headingStyle(fontSize: 8, color: DesignSystem.primary),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Head Username: $username',
                            style: DesignSystem.bodyStyle(fontSize: 13, color: DesignSystem.textMuted, fontWeight: FontWeight.bold),
                          ),
                          Text(
                            'Contact: $mobile',
                            style: DesignSystem.bodyStyle(fontSize: 12, color: DesignSystem.textMuted),
                          ),
                          const SizedBox(height: 12),
                          const Divider(height: 1),
                          const SizedBox(height: 12),

                          // Roster preview trigger button
                          InkWell(
                            onTap: () => _viewFamilyRoster(req),
                            child: Row(
                              children: [
                                const Icon(Icons.people_outline_rounded, color: DesignSystem.secondary, size: 18),
                                const SizedBox(width: 8),
                                Text(
                                  'View Family Roster (${members.length + 1} members)',
                                  style: DesignSystem.headingStyle(
                                    fontSize: 12,
                                    color: DesignSystem.secondary,
                                  ),
                                ),
                                const Spacer(),
                                const Icon(Icons.arrow_forward_ios_rounded, color: DesignSystem.secondary, size: 10),
                              ],
                            ),
                          ),

                          const SizedBox(height: 16),
                          Row(
                            children: [
                              // Reject Button
                              Expanded(
                                child: OutlinedButton(
                                  onPressed: () => _rejectRequest(req),
                                  style: OutlinedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                    side: const BorderSide(color: DesignSystem.accentCoral),
                                  ),
                                  child: Text(
                                    'REJECT',
                                    style: DesignSystem.headingStyle(fontSize: 12, color: DesignSystem.accentCoral),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),

                              // Approve Button
                              Expanded(
                                child: ElevatedButton(
                                  onPressed: () => _approveRequest(req),
                                  style: DesignSystem.buttonStyle(color: DesignSystem.successGreen).copyWith(
                                    padding: MaterialStateProperty.all(const EdgeInsets.symmetric(vertical: 12)),
                                    shape: MaterialStateProperty.all(
                                      RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                    ),
                                  ),
                                  child: Text(
                                    'APPROVE FLAT',
                                    style: DesignSystem.headingStyle(fontSize: 12, color: Colors.white),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
    );
  }
}
