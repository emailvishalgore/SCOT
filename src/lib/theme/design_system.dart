import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class DesignSystem {
  // Brand Colors (Playful, Vibrant & Colorful)
  static const Color background = Color(0xFF0F172A); // Modern dark slate background
  static const Color surface = Color(0xFF1E293B);    // Premium card background
  
  static const Color primary = Color(0xFF7C3AED);    // Vibrant Purple/Indigo
  static const Color secondary = Color(0xFF38BDF8);  // Vibrant Sky Blue
  static const Color accentCoral = Color(0xFFFF6F61); // Energetic Coral
  static const Color accentYellow = Color(0xFFFFE66D); // Sunny Yellow
  static const Color accentPurple = Color(0xFFA78BFA); // Soft Lavender
  static const Color successGreen = Color(0xFF10B981); // Friendly Emerald Green
  
  static const Color textPrimary = Color(0xFFF8FAFC); // High contrast off-white text
  static const Color textMuted = Color(0xFF94A3B8);   // Muted slate-grey text

  // High-Quality Sports & Cultural Imagery from Unsplash CDN
  static const String imgFootball = 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80';
  static const String imgCricket = 'https://images.unsplash.com/photo-1531415080290-b9b68265b76b?auto=format&fit=crop&w=600&q=80';
  static const String imgBadminton = 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=600&q=80';
  static const String imgTableTennis = 'https://images.unsplash.com/photo-1534158914592-062992fbe900?auto=format&fit=crop&w=600&q=80';
  static const String imgChess = 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&w=600&q=80';
  static const String imgCarrom = 'https://images.unsplash.com/photo-1611195974226-a6a9be9dd763?auto=format&fit=crop&w=600&q=80';
  static const String imgSinging = 'https://images.unsplash.com/photo-1516280440614-37939bbacd6a?auto=format&fit=crop&w=600&q=80';
  static const String imgDance = 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80';
  static const String imgGeneralSports = 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=600&q=80';

  /// Standard card decoration: Glassmorphism look
  static BoxDecoration cardDecoration({
    required Color borderAccentColor,
    double borderRadius = 24.0,
  }) {
    return BoxDecoration(
      color: const Color(0xFF1E293B).withOpacity(0.7),
      borderRadius: BorderRadius.circular(borderRadius),
      border: Border.all(
        color: borderAccentColor.withOpacity(0.35),
        width: 1.5,
      ),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withOpacity(0.2),
          blurRadius: 16,
          offset: const Offset(0, 8),
        ),
      ],
    );
  }

  /// Reusable Glassmorphism decoration with specific opacity
  static BoxDecoration glassDecoration({
    required Color borderAccentColor,
    double borderRadius = 24.0,
    double fillOpacity = 0.15,
  }) {
    return BoxDecoration(
      color: Colors.white.withOpacity(fillOpacity),
      borderRadius: BorderRadius.circular(borderRadius),
      border: Border.all(
        color: Colors.white.withOpacity(0.15),
        width: 1.5,
      ),
      boxShadow: [
        BoxShadow(
          color: borderAccentColor.withOpacity(0.08),
          blurRadius: 20,
          offset: const Offset(0, 10),
        ),
      ],
    );
  }

  /// Button style: Bubbly, highly rounded elevate style
  static ButtonStyle buttonStyle({
    required Color color,
    Color textColor = Colors.white,
  }) {
    return ElevatedButton.styleFrom(
      backgroundColor: color,
      foregroundColor: textColor,
      elevation: 2,
      shadowColor: color.withOpacity(0.3),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
      ),
    );
  }

  /// Headings Typography: Barlow Condensed
  static TextStyle headingStyle({
    double fontSize = 24,
    Color color = textPrimary,
    FontWeight fontWeight = FontWeight.bold,
  }) {
    return GoogleFonts.barlowCondensed(
      fontSize: fontSize,
      color: color,
      fontWeight: fontWeight,
    );
  }

  /// Body Typography: Barlow
  static TextStyle bodyStyle({
    double fontSize = 16,
    Color color = textPrimary,
    FontWeight fontWeight = FontWeight.normal,
  }) {
    return GoogleFonts.barlow(
      fontSize: fontSize,
      color: color,
      fontWeight: fontWeight,
    );
  }
}

/// Standardized Top Header Bar for all authenticated screens with SCOT logo and dynamic themes
class ScotHeaderBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final String? subtitle;
  final bool showBackButton;
  final VoidCallback? onBackPressed;
  final List<Widget>? actions;
  final Color primaryColor;

  const ScotHeaderBar({
    super.key,
    required this.title,
    this.subtitle,
    this.showBackButton = true,
    this.onBackPressed,
    this.actions,
    this.primaryColor = DesignSystem.primary,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(top: MediaQuery.of(context).padding.top + 8, bottom: 8, left: 16, right: 16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A).withOpacity(0.85),
        border: Border(
          bottom: BorderSide(
            color: primaryColor.withOpacity(0.2),
            width: 1.5,
          ),
        ),
      ),
      child: Row(
        children: [
          if (showBackButton) ...[
            ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: Material(
                color: Colors.white.withOpacity(0.1),
                child: IconButton(
                  icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 18),
                  onPressed: onBackPressed ?? () => Navigator.of(context).pop(),
                ),
              ),
            ),
            const SizedBox(width: 12),
          ],
          // SCOT Logo
          Image.asset(
            'assets/images/logo.png',
            height: 40,
            width: 40,
            fit: BoxFit.contain,
            errorBuilder: (context, error, stackTrace) => Container(
              height: 40,
              width: 40,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(colors: [primaryColor, DesignSystem.secondary]),
              ),
              child: const Icon(Icons.sports_soccer_rounded, color: Colors.white, size: 20),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Text(
                      title,
                      style: GoogleFonts.barlowCondensed(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      height: 6,
                      width: 6,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: primaryColor,
                      ),
                    )
                  ],
                ),
                if (subtitle != null && subtitle!.isNotEmpty)
                  Text(
                    subtitle!,
                    style: GoogleFonts.barlow(
                      fontSize: 12,
                      color: DesignSystem.textMuted,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
              ],
            ),
          ),
          if (actions != null) ...actions!,
        ],
      ),
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(76);
}
