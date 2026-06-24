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

  void addCustomTestAccount(Map<String, String> account) {
    customTestAccounts.add(account);
    notifyListeners();
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
