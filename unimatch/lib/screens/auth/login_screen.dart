import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../core/widgets/gradient_button.dart';
import '../../core/theme/app_theme.dart';
import '../../core/constants/app_constants.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool _isLoading = false;

  Future<void> _handleGoogleSignIn() async {
    setState(() => _isLoading = true);

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    
    try {
      final success = await authProvider.signInWithGoogle();
      
      if (!mounted) return;
      
      if (success) {
        // Check if user has completed profile
        if (authProvider.hasCompletedProfile) {
          // Navigate to home
          Navigator.of(context).pushReplacementNamed('/home');
        } else {
          // Navigate to onboarding
          Navigator.of(context).pushReplacementNamed('/onboarding');
        }
      } else if (authProvider.errorMessage != null) {
        // Show error
        _showError(authProvider.errorMessage!);
      }
    } catch (e) {
      if (e.toString().contains(AppConstants.errorKIITEmail)) {
        _showError(AppConstants.errorKIITEmail);
      } else {
        _showError(AppConstants.errorGeneric);
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: AppTheme.primaryGradient,
        ),
        child: SafeArea(
          child: Column(
            children: [
              Expanded(
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Logo
                      Container(
                        width: 120,
                        height: 120,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(30),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.2),
                              blurRadius: 20,
                              offset: const Offset(0, 10),
                            ),
                          ],
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(30),
                          child: Image.asset(
                            'assets/logo/unimatch_logo.png',
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                      const SizedBox(height: 32),
                      
                      // App Name
                      const Text(
                        'Peerzaa',
                        style: TextStyle(
                          fontFamily: 'Poppins',
                          fontSize: 48,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 8),
                      
                      // Tagline
                      const Text(
                        'Connect • Collaborate • Create',
                        style: TextStyle(
                          fontFamily: 'Poppins',
                          fontSize: 16,
                          fontWeight: FontWeight.w400,
                          color: Colors.white,
                          letterSpacing: 1.5,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              
              // Sign In Button
              Padding(
                padding: const EdgeInsets.all(32.0),
                child: Column(
                  children: [
                    Container(
                      width: double.infinity,
                      height: 56,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.1),
                            blurRadius: 10,
                            offset: const Offset(0, 5),
                          ),
                        ],
                      ),
                      child: Material(
                        color: Colors.transparent,
                        child: InkWell(
                          onTap: _isLoading ? null : _handleGoogleSignIn,
                          borderRadius: BorderRadius.circular(12),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 24),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                if (_isLoading)
                                  const SizedBox(
                                    width: 24,
                                    height: 24,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: AppTheme.primaryPink,
                                    ),
                                  )
                                else ...[
                                  Image.asset(
                                    'assets/icons/google.png',
                                    width: 24,
                                    height: 24,
                                    errorBuilder: (context, error, stackTrace) {
                                      return const Icon(
                                        Icons.login,
                                        color: AppTheme.primaryPink,
                                      );
                                    },
                                  ),
                                  const SizedBox(width: 12),
                                  const Text(
                                    'Sign in with Google',
                                    style: TextStyle(
                                      fontFamily: 'Poppins',
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                      color: AppTheme.textPrimary,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    const Text(
                      'Only KIIT email accounts (@kiit.ac.in)',
                      style: TextStyle(
                        fontFamily: 'Poppins',
                        fontSize: 12,
                        color: Colors.white70,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
