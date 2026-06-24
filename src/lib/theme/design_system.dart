import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class DesignSystem {
  // Brand Colors (Playful, Vibrant & Colorful)
  static const Color background = Color(0xFFFFFDF9); // Warm cream off-white
  static const Color surface = Color(0xFFFFFFFF);    // Card background
  
  static const Color primary = Color(0xFF6C63FF);    // Cheerful Indigo/Purple
  static const Color secondary = Color(0xFF4ECDC4);  // Bright Turquoise
  static const Color accentCoral = Color(0xFFFF6F61); // Energetic Coral
  static const Color accentYellow = Color(0xFFFFE66D); // Sunny Yellow
  static const Color accentPurple = Color(0xFFA78BFA); // Soft Lavender
  static const Color successGreen = Color(0xFF2ECC71); // Friendly Leaf Green
  
  static const Color textPrimary = Color(0xFF2C3E50); // Deep slate for readability
  static const Color textMuted = Color(0xFF7F8C8D);   // Muted slate-grey

  /// Card styling: Rounded cards with a colorful border and soft double shadows
  static BoxDecoration cardDecoration({
    required Color borderAccentColor,
    double borderRadius = 24.0,
  }) {
    return BoxDecoration(
      color: surface,
      borderRadius: BorderRadius.circular(borderRadius),
      border: Border.all(
        color: borderAccentColor.withOpacity(0.35),
        width: 2.0, // Friendly, slightly chunky borders
      ),
      boxShadow: [
        BoxShadow(
          color: borderAccentColor.withOpacity(0.06),
          blurRadius: 16,
          offset: const Offset(0, 8),
        ),
        BoxShadow(
          color: borderAccentColor.withOpacity(0.03),
          blurRadius: 4,
          offset: const Offset(0, 2),
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
        borderRadius: BorderRadius.circular(20), // Highly rounded bubbly buttons
      ),
    );
  }

  /// Headings Typography: Bubbly Fredoka Font
  static TextStyle headingStyle({
    double fontSize = 24,
    Color color = textPrimary,
    FontWeight fontWeight = FontWeight.bold,
  }) {
    return GoogleFonts.fredoka(
      fontSize: fontSize,
      color: color,
      fontWeight: fontWeight,
    );
  }

  /// Body Typography: Friendly and soft Nunito Font
  static TextStyle bodyStyle({
    double fontSize = 16,
    Color color = textPrimary,
    FontWeight fontWeight = FontWeight.normal,
  }) {
    return GoogleFonts.nunito(
      fontSize: fontSize,
      color: color,
      fontWeight: fontWeight,
    );
  }
}
