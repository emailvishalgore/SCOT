import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AppState extends ChangeNotifier {
  String? activeSeasonId;
  String? userRole;
  String? userWingId;
  String? userFlatId;
  String? userResidentId;
  String? userMemberId;
  bool isLoading = false;

  final List<Map<String, String>> customTestAccounts = [];

  // --- Demo Mode States ---
  final Set<String> demoPaidFlats = {};
  int demoPendingApprovals = 3;
  
  final List<Map<String, dynamic>> demoExpenses = [
    {
      'id': 'exp-1',
      'title': 'Cricket Kit Purchase',
      'vendor': 'Topaz Sports Academy',
      'amount': 12000.0,
      'status': 'PENDING',
      'requires_role': 'CORE_TEAM',
    },
    {
      'id': 'exp-2',
      'title': 'Catering for Wing Meet',
      'vendor': 'Tasty Treats',
      'amount': 3500.0,
      'status': 'PENDING',
      'requires_role': 'WING_COMMANDER',
    },
    {
      'id': 'exp-3',
      'title': 'Sound System Rental',
      'vendor': 'Vibe Sounds',
      'amount': 28000.0,
      'status': 'PENDING',
      'requires_role': 'CORE_TEAM',
    },
  ];

  void addCustomTestAccount(Map<String, String> account) {
    customTestAccounts.add(account);
    notifyListeners();
  }

  void markFlatAsPaidInDemo(String flatNumber) {
    demoPaidFlats.add(flatNumber);
    notifyListeners();
  }

  bool isFlatPaidInDemo(String flatNumber) {
    return demoPaidFlats.contains(flatNumber);
  }

  void approveExpenseInDemo(String expenseId) {
    final idx = demoExpenses.indexWhere((element) => element['id'] == expenseId);
    if (idx != -1 && demoExpenses[idx]['status'] == 'PENDING') {
      demoExpenses[idx]['status'] = 'APPROVED';
      demoPendingApprovals = demoPendingApprovals > 0 ? demoPendingApprovals - 1 : 0;
      notifyListeners();
    }
  }

  void setLoading(bool val) {
    isLoading = val;
    notifyListeners();
  }

  /// Decodes the JWT access token and extracts custom claims from user metadata.
  Future<void> decodeJwtClaims(String token) async {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return;

      // Decode Base64 URL normalized payload
      var normalized = base64Url.normalize(parts[1]);
      var payloadDecoded = utf8.decode(base64Url.decode(normalized));
      final Map<String, dynamic> payload = json.decode(payloadDecoded);

      final metadata = payload['user_metadata'] as Map<String, dynamic>?;
      if (metadata == null) return;

      userRole = metadata['role'] ?? 'HOME_MEMBER';
      userWingId = metadata['wing_id'] ?? '';
      userFlatId = metadata['flat_id'] ?? '';
      userResidentId = metadata['resident_id'] ?? '';
      userMemberId = metadata['member_id'] ?? '';

      notifyListeners();
    } catch (e) {
      debugPrint("Error decoding JWT: $e");
    }
  }

  /// Fetches the currently active season from Supabase core.season
  Future<void> fetchActiveSeason(SupabaseClient supabase) async {
    try {
      final seasonResponse = await supabase
          .from('season')
          .select('id')
          .eq('status', 'ACTIVE')
          .maybeSingle();

      if (seasonResponse != null) {
        activeSeasonId = seasonResponse['id'];
        notifyListeners();
      }
    } catch (e) {
      debugPrint("Error fetching active season: $e");
    }
  }

  /// Clears state on user logout
  void clear() {
    activeSeasonId = null;
    userRole = null;
    userWingId = null;
    userFlatId = null;
    userResidentId = null;
    userMemberId = null;
    isLoading = false;
    notifyListeners();
  }
}
