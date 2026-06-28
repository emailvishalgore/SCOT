import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../app_state.dart';
import '../theme/design_system.dart';

class AnnouncementsScreen extends StatefulWidget {
  const AnnouncementsScreen({super.key});

  @override
  State<AnnouncementsScreen> createState() => _AnnouncementsScreenState();
}

class _AnnouncementsScreenState extends State<AnnouncementsScreen> {
  bool _isLoading = true;
  bool _isPosting = false;
  List<Map<String, dynamic>> _announcements = [];

  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _contentController = TextEditingController();
  String _selectedScope = 'GLOBAL';

  @override
  void initState() {
    super.initState();
    _loadAnnouncements();
  }

  @override
  void dispose() {
    _titleController.dispose();
    _contentController.dispose();
    super.dispose();
  }

  Future<void> _loadAnnouncements() async {
    final appState = Provider.of<AppState>(context, listen: false);

    if (appState.activeSeasonId == 'demo-season-id') {
      // Offline Demo: Load from AppState
      setState(() {
        // Filter announcements: show GLOBAL or matching user's Wing
        _announcements = appState.demoAnnouncements.where((ann) {
          if (ann['scope'] == 'GLOBAL') return true;
          // In demo mode we match Wing N
          if (appState.userRole == 'WING_COMMANDER' || appState.userRole == 'WING_CAPTAIN') {
            return true; // Let coordinators see all
          }
          return ann['wing_id'] == 'demo-wing-N-id' || ann['wing_id'] == appState.userWingId;
        }).toList();
        _isLoading = false;
      });
    } else {
      // Real Cloud: Query Supabase
      try {
        final supabase = Supabase.instance.client;
        
        // Load announcements for active season
        // Note: RLS will automatically restrict WING-specific rows
        final response = await supabase
            .from('announcement')
            .select('*')
            .eq('season_id', appState.activeSeasonId!)
            .order('created_at', ascending: false);

        if (response != null) {
          final List<Map<String, dynamic>> loaded = [];
          for (var item in response) {
            loaded.add({
              'id': item['id']?.toString() ?? '',
              'title': item['title']?.toString() ?? '',
              'content': item['content']?.toString() ?? '',
              'scope': item['target_scope']?.toString() ?? 'GLOBAL',
              'wing_id': item['target_wing_id']?.toString() ?? '',
              'date': item['created_at'] != null ? DateTime.parse(item['created_at']).toLocal().toString().substring(0, 10) : 'Recent',
              'author': 'Organizer'
            });
          }
          setState(() {
            _announcements = loaded;
          });
        }
      } catch (e) {
        debugPrint('Error loading announcements: $e');
      } finally {
        setState(() => _isLoading = false);
      }
    }
  }

  void _postAnnouncement() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isPosting = true);
    final appState = Provider.of<AppState>(context, listen: false);

    final title = _titleController.text.trim();
    final content = _contentController.text.trim();

    if (appState.activeSeasonId == 'demo-season-id') {
      // Offline Demo: Add to AppState
      await Future.delayed(const Duration(milliseconds: 600));
      
      final Map<String, dynamic> newAnn = {
        'id': 'demo-ann-${DateTime.now().millisecondsSinceEpoch}',
        'title': title,
        'content': content,
        'scope': _selectedScope,
        'wing_id': _selectedScope == 'WING' ? 'demo-wing-N-id' : '',
        'date': 'Just Now',
        'author': appState.userRole == 'SCOT_ADMIN' ? 'SCOT Admin' : 'Wing Coordinator'
      };

      appState.addAnnouncementInDemo(newAnn);
      
      // Reset inputs
      _titleController.clear();
      _contentController.clear();
      _selectedScope = 'GLOBAL';

      setState(() => _isPosting = false);
      Navigator.pop(context); // Close bottom sheet
      _loadAnnouncements(); // Refresh list

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Announcement published successfully! (Demo)'),
          backgroundColor: DesignSystem.successGreen,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } else {
      // Real Cloud: Write to Supabase table
      try {
        final supabase = Supabase.instance.client;
        
        await supabase.from('announcement').insert({
          'season_id': appState.activeSeasonId!,
          'title': title,
          'content': content,
          'target_scope': _selectedScope,
          'target_wing_id': _selectedScope == 'WING' ? appState.userWingId : null,
          'author_member_id': appState.userMemberId ?? '00000000-0000-0000-0000-000000000000',
        });

        _titleController.clear();
        _contentController.clear();
        _selectedScope = 'GLOBAL';

        setState(() => _isPosting = false);
        Navigator.pop(context);
        _loadAnnouncements();

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Announcement published successfully!'),
            backgroundColor: DesignSystem.successGreen,
            behavior: SnackBarBehavior.floating,
          ),
        );
      } catch (e) {
        setState(() => _isPosting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to publish: ${e.toString()}'),
            backgroundColor: DesignSystem.accentCoral,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _showAddAnnouncementBottomSheet() {
    final appState = Provider.of<AppState>(context, listen: false);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
              child: Container(
                decoration: const BoxDecoration(
                  color: DesignSystem.background,
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(32),
                    topRight: Radius.circular(32),
                  ),
                ),
                padding: const EdgeInsets.all(24),
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Center(
                        child: Container(
                          width: 50,
                          height: 5,
                          decoration: BoxDecoration(
                            color: DesignSystem.textMuted.withOpacity(0.3),
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      Text(
                        'Draft Announcement',
                        style: DesignSystem.headingStyle(fontSize: 20, color: DesignSystem.textPrimary),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 20),

                      // Title Field
                      TextFormField(
                        controller: _titleController,
                        style: DesignSystem.bodyStyle(fontWeight: FontWeight.bold),
                        decoration: InputDecoration(
                          labelText: 'Title',
                          labelStyle: DesignSystem.bodyStyle(color: DesignSystem.textMuted, fontSize: 14),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) return 'Please enter a title';
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // Content Field
                      TextFormField(
                        controller: _contentController,
                        style: DesignSystem.bodyStyle(),
                        maxLines: 4,
                        decoration: InputDecoration(
                          labelText: 'Content',
                          labelStyle: DesignSystem.bodyStyle(color: DesignSystem.textMuted, fontSize: 14),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) return 'Please enter content';
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // Scope Selector
                      DropdownButtonFormField<String>(
                        value: _selectedScope,
                        decoration: InputDecoration(
                          labelText: 'Target Scope',
                          labelStyle: DesignSystem.bodyStyle(color: DesignSystem.textMuted, fontSize: 14),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                        onChanged: (val) {
                          if (val != null) {
                            setModalState(() {
                              _selectedScope = val;
                            });
                          }
                        },
                        items: [
                          const DropdownMenuItem(value: 'GLOBAL', child: Text('Global (All Wings)')),
                          // WING scope selection available for organizers
                          if (appState.userRole == 'WING_COMMANDER' || appState.userRole == 'WING_CAPTAIN')
                            DropdownMenuItem(value: 'WING', child: Text('My Wing Only (Wing ${appState.userWingId ?? 'N'})')),
                        ],
                      ),
                      const SizedBox(height: 24),

                      // Publish Button
                      ElevatedButton(
                        onPressed: _isPosting ? null : _postAnnouncement,
                        style: DesignSystem.buttonStyle(color: DesignSystem.primary),
                        child: _isPosting
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.5,
                                  valueColor: AlwaysStoppedAnimation(Colors.white),
                                ),
                              )
                            : Text(
                                'PUBLISH BULLETIN',
                                style: DesignSystem.headingStyle(fontSize: 14, color: Colors.white),
                              ),
                      ),
                      const SizedBox(height: 12),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final canDraft = appState.userRole == 'SCOT_ADMIN' ||
        appState.userRole == 'CORE_TEAM' ||
        appState.userRole == 'WING_COMMANDER' ||
        appState.userRole == 'WING_CAPTAIN';

    return Scaffold(
      backgroundColor: DesignSystem.background,
      appBar: const ScotHeaderBar(
        title: 'Society Bulletin Board',
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
                : _announcements.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.campaign_outlined, size: 64, color: DesignSystem.textMuted.withOpacity(0.3)),
                            const SizedBox(height: 12),
                            Text(
                              'No announcements posted yet.',
                              style: DesignSystem.headingStyle(fontSize: 16, color: DesignSystem.textMuted),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(24),
                        itemCount: _announcements.length,
                        itemBuilder: (context, index) {
                          final ann = _announcements[index];
                          final isGlobal = ann['scope'] == 'GLOBAL';

                          return Container(
                            margin: const EdgeInsets.only(bottom: 16),
                            padding: const EdgeInsets.all(20),
                            decoration: DesignSystem.glassDecoration(
                              borderAccentColor: isGlobal ? DesignSystem.primary : DesignSystem.secondary,
                              fillOpacity: 0.12,
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: (isGlobal ? DesignSystem.primary : DesignSystem.secondary).withOpacity(0.15),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        isGlobal ? 'GLOBAL' : 'WING SPECIFIC',
                                        style: DesignSystem.headingStyle(
                                          fontSize: 8,
                                          color: isGlobal ? DesignSystem.primary : DesignSystem.secondary,
                                        ),
                                      ),
                                    ),
                                    Text(
                                      ann['date'],
                                      style: DesignSystem.bodyStyle(fontSize: 11, color: Colors.white70, fontWeight: FontWeight.bold),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  ann['title'],
                                  style: DesignSystem.headingStyle(fontSize: 16, color: Colors.white),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  ann['content'],
                                  style: DesignSystem.bodyStyle(fontSize: 13, color: Colors.white70),
                                ),
                                const SizedBox(height: 12),
                                const Divider(height: 1, color: Colors.white24),
                                const SizedBox(height: 8),
                                Text(
                                  'Published by: ${ann['author']}',
                                  style: DesignSystem.bodyStyle(fontSize: 11, color: Colors.white60, fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
      floatingActionButton: canDraft
          ? FloatingActionButton(
              onPressed: _showAddAnnouncementBottomSheet,
              backgroundColor: DesignSystem.primary,
              child: const Icon(Icons.add_comment_rounded, color: Colors.white),
            )
          : null,
    );
  }
}
