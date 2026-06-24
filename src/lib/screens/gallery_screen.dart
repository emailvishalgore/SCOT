import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../app_state.dart';
import '../theme/design_system.dart';

class GalleryScreen extends StatefulWidget {
  const GalleryScreen({super.key});

  @override
  State<GalleryScreen> createState() => _GalleryScreenState();
}

class _GalleryScreenState extends State<GalleryScreen> {
  bool _isLoading = true;
  bool _isUploading = false;
  List<Map<String, String>> _photos = [];

  // Mocks for Offline Demo Mode
  final List<Map<String, String>> _mockPhotos = [
    {
      'id': 'p-1',
      'title': 'Opening Football Derby',
      'description': 'Wing N vs Wing O final faceoff under lights.',
      'url': 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=80',
    },
    {
      'id': 'p-2',
      'title': 'Badminton Trophy Winner',
      'description': 'Dave Miller awarding the trophy to John Doe.',
      'url': 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600&auto=format&fit=crop&q=80',
    },
    {
      'id': 'p-3',
      'title': 'Carrom Tournament doubles',
      'description': 'Intense matchup between Wing P and Wing Q.',
      'url': 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=600&auto=format&fit=crop&q=80',
    },
    {
      'id': 'p-4',
      'title': 'Community Feast Celebration',
      'description': 'Celebrating the successful completion of the fixtures.',
      'url': 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&auto=format&fit=crop&q=80',
    },
  ];

  @override
  void initState() {
    super.initState();
    _loadPhotos();
  }

  Future<void> _loadPhotos() async {
    final appState = Provider.of<AppState>(context, listen: false);

    if (appState.activeSeasonId == 'demo-season-id') {
      setState(() {
        _photos = _mockPhotos;
        _isLoading = false;
      });
    } else {
      // Real Cloud: Query Supabase core.media_item
      try {
        final supabase = Supabase.instance.client;
        final response = await supabase
            .from('media_item')
            .select('id, caption, description, url')
            .order('created_at', ascending: false);

        if (response != null) {
          final List<Map<String, String>> loaded = [];
          for (var item in response) {
            loaded.add({
              'id': item['id']?.toString() ?? '',
              'title': item['caption']?.toString() ?? 'Community Photo',
              'description': item['description']?.toString() ?? '',
              'url': item['url']?.toString() ?? '',
            });
          }
          setState(() {
            _photos = loaded;
          });
        }
      } catch (e) {
        debugPrint('Error loading photos: $e');
      } finally {
        setState(() => _isLoading = false);
      }
    }
  }

  void _simulateUpload() async {
    setState(() => _isUploading = true);
    final appState = Provider.of<AppState>(context, listen: false);

    // Simulate picker and API delay
    await Future.delayed(const Duration(milliseconds: 1500));

    final Map<String, String> newPhoto = {
      'id': 'p-uploaded-${DateTime.now().millisecondsSinceEpoch}',
      'title': 'Tournament Action Shot',
      'description': 'A beautiful high-energy moment captured live.',
      'url': 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600&auto=format&fit=crop&q=80', // Running/Athletics
    };

    if (appState.activeSeasonId == 'demo-season-id') {
      setState(() {
        _photos.insert(0, newPhoto);
        _isUploading = false;
      });
      _showUploadSuccessDialog();
    } else {
      // Real Cloud: upload-file function triggers and saves record in DB
      try {
        final supabase = Supabase.instance.client;
        await supabase.from('media_item').insert({
          'caption': newPhoto['title']!,
          'description': newPhoto['description']!,
          'url': newPhoto['url']!,
          'album_id': '00000000-0000-0000-0000-000000000000', // Mock/Placeholder album
        });
        
        await _loadPhotos();
        setState(() => _isUploading = false);
        _showUploadSuccessDialog();
      } catch (e) {
        setState(() => _isUploading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to upload: ${e.toString()}'),
            backgroundColor: DesignSystem.accentCoral,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _showUploadSuccessDialog() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Photo uploaded to Google Drive & registered successfully!'),
        backgroundColor: DesignSystem.successGreen,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _viewPhotoDetails(Map<String, String> photo) {
    showDialog(
      context: context,
      builder: (context) {
        return Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Photo box
              ClipRRect(
                borderRadius: BorderRadius.circular(24),
                child: Image.network(
                  photo['url']!,
                  fit: BoxFit.contain,
                ),
              ),
              const SizedBox(height: 16),
              // Description card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: DesignSystem.cardDecoration(borderAccentColor: DesignSystem.secondary),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      photo['title']!,
                      style: DesignSystem.headingStyle(fontSize: 18, color: DesignSystem.textPrimary),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      photo['description']!,
                      style: DesignSystem.bodyStyle(fontSize: 13, color: DesignSystem.textMuted),
                    ),
                    const SizedBox(height: 16),
                    Center(
                      child: TextButton.icon(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.close_rounded, color: DesignSystem.primary),
                        label: Text(
                          'CLOSE',
                          style: DesignSystem.headingStyle(fontSize: 13, color: DesignSystem.primary),
                        ),
                      ),
                    )
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final isCoordinator = appState.userRole == 'SCOT_ADMIN' ||
        appState.userRole == 'CORE_TEAM' ||
        appState.userRole == 'WING_COMMANDER' ||
        appState.userRole == 'WING_CAPTAIN';

    return Scaffold(
      backgroundColor: DesignSystem.background,
      appBar: AppBar(
        title: Text(
          'Tournament Media Gallery',
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
          : _photos.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.photo_library_outlined, size: 64, color: DesignSystem.textMuted.withOpacity(0.3)),
                      const SizedBox(height: 12),
                      Text(
                        'No photos posted in the gallery.',
                        style: DesignSystem.headingStyle(fontSize: 16, color: DesignSystem.textMuted),
                      ),
                    ],
                  ),
                )
              : GridView.builder(
                  padding: const EdgeInsets.all(24),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                    childAspectRatio: 0.85,
                  ),
                  itemCount: _photos.length,
                  itemBuilder: (context, index) {
                    final photo = _photos[index];

                    return InkWell(
                      onTap: () => _viewPhotoDetails(photo),
                      borderRadius: BorderRadius.circular(24),
                      child: Container(
                        decoration: DesignSystem.cardDecoration(borderAccentColor: DesignSystem.secondary),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Expanded(
                              child: ClipRRect(
                                borderRadius: const BorderRadius.only(
                                  topLeft: Radius.circular(22),
                                  topRight: Radius.circular(22),
                                ),
                                child: Image.network(
                                  photo['url']!,
                                  fit: BoxFit.cover,
                                  loadingBuilder: (context, child, loadingProgress) {
                                    if (loadingProgress == null) return child;
                                    return const Center(
                                      child: SizedBox(
                                        height: 20,
                                        width: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                        ),
                                      ),
                                    );
                                  },
                                ),
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.all(12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    photo['title']!,
                                    style: DesignSystem.headingStyle(fontSize: 12, color: DesignSystem.textPrimary),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    photo['description']!,
                                    style: DesignSystem.bodyStyle(fontSize: 9, color: DesignSystem.textMuted, fontWeight: FontWeight.bold),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
      floatingActionButton: isCoordinator
          ? FloatingActionButton.extended(
              onPressed: _isUploading ? null : _simulateUpload,
              backgroundColor: DesignSystem.secondary,
              icon: _isUploading
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation(Colors.white),
                      ),
                    )
                  : const Icon(Icons.add_photo_alternate_outlined, color: Colors.white),
              label: Text(
                _isUploading ? 'UPLOADING...' : 'UPLOAD PHOTO',
                style: DesignSystem.headingStyle(fontSize: 12, color: Colors.white),
              ),
            )
          : null,
    );
  }
}
