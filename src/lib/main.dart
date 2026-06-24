import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'app_state.dart';
import 'theme/design_system.dart';
import 'screens/login_screen.dart';
import 'screens/resident_dashboard.dart';
import 'screens/coordinator_dashboard.dart';

// --- CONFIGURATION ---
const bool useLocalSupabase = false; // Set to true to test against local Supabase container

const String cloudUrl = 'https://ptpxhvohifkphcgiujox.supabase.co';
// Replace this placeholder with your cloud anon key from the Supabase Dashboard
const String cloudAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0cHhodm9oaWZrcGhjZ2l1am94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMjE2OTYsImV4cCI6MjA5Nzc5NzY5Nn0.qukz4r_RIov7b5o7AzF3xfpuaUrqXMQhIMhlP18O_EQ'; 

const String localUrl = 'http://10.0.2.2:54321'; // 10.0.2.2 is Android emulator loopback for localhost
const String localAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final url = useLocalSupabase ? localUrl : cloudUrl;
  final anonKey = useLocalSupabase ? localAnonKey : cloudAnonKey;

  await Supabase.initialize(
    url: url,
    anonKey: anonKey,
  );

  runApp(
    ChangeNotifierProvider(
      create: (_) => AppState(),
      child: const ScotApp(),
    ),
  );
}

class ScotApp extends StatelessWidget {
  const ScotApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SCOT TOPAZ',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.light,
        scaffoldBackgroundColor: DesignSystem.background,
        primaryColor: DesignSystem.primary,
        colorScheme: const ColorScheme.light(
          primary: DesignSystem.primary,
          secondary: DesignSystem.secondary,
          surface: DesignSystem.surface,
          background: DesignSystem.background,
          error: Color(0xFFEF4444),
        ),
        textTheme: GoogleFonts.nunitoTextTheme(
          ThemeData.light().textTheme,
        ),
      ),
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    final supabase = Supabase.instance.client;
    final session = supabase.auth.currentSession;
    final appState = Provider.of<AppState>(context, listen: false);

    if (session != null) {
      await appState.decodeJwtClaims(session.accessToken);
      await appState.fetchActiveSeason(supabase);
      
      if (!mounted) return;
      _routeUser(appState.userRole);
    } else {
      if (!mounted) return;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );
    }
  }

  void _routeUser(String? role) {
    if (role == 'SCOT_ADMIN' ||
        role == 'CORE_TEAM' ||
        role == 'EVENT_CHAMPION' ||
        role == 'WING_COMMANDER') {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const CoordinatorDashboard()),
      );
    } else {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const ResidentDashboard()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation<Color>(DesignSystem.primary),
        ),
      ),
    );
  }
}
