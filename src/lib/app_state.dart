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
  List<String> userPortfolios = [];
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

  // --- Registration Requests Mocks ---
  final List<Map<String, dynamic>> demoPendingRegistrations = [
    {
      'id': 'req-mock-1',
      'username': 'smith_family',
      'mobile': '+919876543212',
      'wing': 'N',
      'flat': '104',
      'flat_id': 'demo-flat-N-104',
      'pin': '1234',
      'members': [
        {'name': 'Carol Smith', 'gender': 'FEMALE', 'age_group': 'OVER_18'},
        {'name': 'Timmy Smith', 'gender': 'MALE', 'age_group': 'UNDER_12'},
      ],
      'status': 'PENDING',
      'date': 'Recent'
    }
  ];

  // --- Organizer/Coordinator Registration Requests Mocks ---
  final List<Map<String, dynamic>> demoPendingCoordinators = [];

  // --- Hashed Credentials Accounts Mocks ---
  final Map<String, Map<String, dynamic>> demoResidentAccounts = {};

  // --- Coordinator pre-seeded accounts ---
  final Map<String, Map<String, dynamic>> demoCoordinatorAccounts = {
    'scotadmin1': {
      'pin': '0122',
      'role': 'SCOT_ADMIN',
      'name': 'SCOT Admin 1',
      'member_id': 'mem-admin1-id',
      'portfolios': [],
    },
    'scotadmin2': {
      'pin': '0133',
      'role': 'SCOT_ADMIN',
      'name': 'SCOT Admin 2',
      'member_id': 'mem-admin2-id',
      'portfolios': [],
    },
    'coremember1': {
      'pin': '1111',
      'role': 'CORE_TEAM',
      'name': 'Alice Core',
      'member_id': 'mem-core-alice-id',
      'portfolios': ['Finance', 'Sponsorship'],
    },
    'eventchamp1': {
      'pin': '2222',
      'role': 'EVENT_CHAMPION',
      'name': 'Bob Champion',
      'member_id': 'mem-event-bob-id',
      'portfolios': ['Sports events'],
    },
    'wingcomm1': {
      'pin': '3333',
      'role': 'WING_COMMANDER',
      'name': 'Charlie Commander',
      'member_id': 'mem-comm-charlie-id',
      'wing_id': 'N',
    },
    'wingcapt1': {
      'pin': '4444',
      'role': 'WING_CAPTAIN',
      'name': 'David Captain',
      'member_id': 'mem-capt-david-id',
      'wing_id': 'N',
    }
  };

  // --- Live Registrations Mocks ---
  final Set<String> demoRegisteredEvents = {};

  // --- Announcements Mocks ---
  final List<Map<String, dynamic>> demoAnnouncements = [
    {
      'id': 'ann-1',
      'title': 'SCOT TOPAZ Sports Fiesta Registration Open!',
      'content': 'We are excited to announce that registration for the upcoming Sports Fiesta is now open. Onboard your family members and sign up for football, badminton, and carrom!',
      'scope': 'GLOBAL',
      'wing_id': '',
      'date': 'June 24, 2026',
      'author': 'SCOT Core Team'
    },
    {
      'id': 'ann-2',
      'title': 'Wing N Water Tank Cleaning',
      'content': 'Please note that the main water tank for Wing N will undergo maintenance this Friday from 10:00 AM to 2:00 PM. Please store water in advance.',
      'scope': 'WING',
      'wing_id': 'demo-wing-N-id', // Match mock wing N
      'date': 'June 23, 2026',
      'author': 'Commander Jack (Wing N)'
    }
  ];

  // --- Sponsorships & Quotes Mocks ---
  final List<Map<String, dynamic>> demoSponsors = [
    {
      'id': 'spon-1',
      'name': 'Topaz Supermarket',
      'amount': 25000.0,
      'tier': 'PLATINUM',
    },
    {
      'id': 'spon-2',
      'name': 'Organic Greens Inc.',
      'amount': 10000.0,
      'tier': 'GOLD',
    }
  ];

  final List<Map<String, dynamic>> demoQuotes = [
    {
      'id': 'qte-1',
      'vendor': 'Tasty Catering Service',
      'amount': 15000.0,
      'description': 'Food and drinks estimate for 100 residents.',
      'file': 'catering_quote_v2.pdf'
    }
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

  void registerForEventInDemo(String subEventId) {
    demoRegisteredEvents.add(subEventId);
    notifyListeners();
  }

  bool isRegisteredInDemo(String subEventId) {
    return demoRegisteredEvents.contains(subEventId);
  }

  void addAnnouncementInDemo(Map<String, dynamic> ann) {
    demoAnnouncements.insert(0, ann);
    notifyListeners();
  }

  void addSponsorInDemo(Map<String, dynamic> spon) {
    demoSponsors.insert(0, spon);
    notifyListeners();
  }

  void addQuoteInDemo(Map<String, dynamic> quote) {
    demoQuotes.insert(0, quote);
    notifyListeners();
  }

  void addPendingRegistrationInDemo(Map<String, dynamic> req) {
    demoPendingRegistrations.add(req);
    notifyListeners();
  }

  void approveRegistrationRequestInDemo(String requestId) {
    final idx = demoPendingRegistrations.indexWhere((element) => element['id'] == requestId);
    if (idx != -1) {
      final req = demoPendingRegistrations[idx];
      final String lowerUsername = (req['username'] as String).toLowerCase();
      
      // Add primary resident account
      demoResidentAccounts[lowerUsername] = {
        'pin': req['pin'],
        'role': 'HOME_CHIEF',
        'name': req['username'],
        'flat': req['flat'],
        'wing': req['wing'],
        'flat_id': req['flat_id'] ?? 'demo-flat-${req['wing']}-${req['flat']}',
        'resident_id': 'res-gen-${req['username']}',
      };

      // Add family roster members
      final members = req['members'] as List<dynamic>?;
      if (members != null) {
        for (var m in members) {
          final mName = m['name'] as String;
          final mUsername = mName.replaceAll(' ', '_').toLowerCase();
          demoResidentAccounts[mUsername] = {
            'pin': req['pin'],
            'role': 'HOME_MEMBER',
            'name': mName,
            'flat': req['flat'],
            'wing': req['wing'],
            'flat_id': req['flat_id'] ?? 'demo-flat-${req['wing']}-${req['flat']}',
            'resident_id': 'res-gen-$mUsername',
          };
        }
      }

      demoPendingRegistrations.removeAt(idx);
      notifyListeners();
    }
  }

  void addPendingOrganizerRegistrationInDemo(Map<String, dynamic> req) {
    demoPendingCoordinators.add(req);
    notifyListeners();
  }

  void approveOrganizerRegistrationRequestInDemo(String requestId) {
    final idx = demoPendingCoordinators.indexWhere((element) => element['id'] == requestId);
    if (idx != -1) {
      final req = demoPendingCoordinators[idx];
      final String lowerUsername = (req['username'] as String).toLowerCase();
      
      demoCoordinatorAccounts[lowerUsername] = {
        'pin': req['pin'],
        'role': req['role'],
        'name': req['username'],
        'wing_id': req['wing_id'] ?? 'N',
        'member_id': 'mem-gen-${req['username']}',
      };
      demoPendingCoordinators.removeAt(idx);
      notifyListeners();
    }
  }

  void deleteFlatEntryInDemo(String wingName, String flatNumber) {
    demoResidentAccounts.removeWhere((key, value) => value['flat'] == flatNumber && value['wing'] == wingName);
    demoPaidFlats.remove(flatNumber);
    notifyListeners();
  }

  Map<String, dynamic> authenticateUserInDemo(String username, String pin) {
    final lowerUsername = username.trim().toLowerCase();
    // Check resident accounts
    if (demoResidentAccounts.containsKey(lowerUsername)) {
      final acc = demoResidentAccounts[lowerUsername]!;
      if (acc['pin'] == pin) {
        userRole = acc['role'];
        userResidentId = acc['resident_id'];
        userMemberId = '';
        userWingId = acc['wing'];
        userFlatId = acc['flat_id'];
        activeSeasonId = 'demo-season-id';
        notifyListeners();
        return {'success': true, 'type': 'RESIDENT', 'role': userRole, 'name': acc['name']};
      }
    }

    // Check coordinator accounts
    if (demoCoordinatorAccounts.containsKey(lowerUsername)) {
      final acc = demoCoordinatorAccounts[lowerUsername]!;
      if (acc['pin'] == pin) {
        userRole = acc['role'];
        userResidentId = acc['member_id'];
        userMemberId = acc['member_id'];
        userWingId = acc['wing_id'] ?? 'N';
        userFlatId = 'demo-flat-id';
        userPortfolios = List<String>.from(acc['portfolios'] ?? []);
        activeSeasonId = 'demo-season-id';
        notifyListeners();
        return {'success': true, 'type': 'COORDINATOR', 'role': userRole, 'name': acc['name']};
      }
    }

    return {'success': false, 'message': 'Invalid username or PIN'};
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

      final rawPorts = metadata['portfolios'];
      if (rawPorts is List) {
        userPortfolios = List<String>.from(rawPorts);
      } else {
        userPortfolios = [];
      }

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

  void updateCoordinatorPortfoliosInDemo(String username, List<String> portfolios) {
    final lowerUsername = username.trim().toLowerCase();
    if (demoCoordinatorAccounts.containsKey(lowerUsername)) {
      demoCoordinatorAccounts[lowerUsername]!['portfolios'] = portfolios;
      notifyListeners();
    }
  }

  void addFamilyMemberInDemo(String pin, String name, String flat, String wing, String flatId) {
    final String lowerUsername = name.replaceAll(' ', '_').toLowerCase();
    demoResidentAccounts[lowerUsername] = {
      'pin': pin,
      'role': 'HOME_MEMBER',
      'name': name,
      'flat': flat,
      'wing': wing,
      'flat_id': flatId,
      'resident_id': 'res-gen-$lowerUsername',
    };
    notifyListeners();
  }

  void removeFamilyMemberInDemo(String username) {
    demoResidentAccounts.remove(username.toLowerCase());
    notifyListeners();
  }

  /// Clears state on user logout
  void clear() {
    activeSeasonId = null;
    userRole = null;
    userWingId = null;
    userFlatId = null;
    userResidentId = null;
    userMemberId = null;
    userPortfolios = [];
    isLoading = false;
    notifyListeners();
  }
}
