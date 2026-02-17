import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'dart:io';
import 'package:image_picker/image_picker.dart';
import '../../providers/auth_provider.dart';
import '../../models/user_model.dart';
import '../../core/widgets/gradient_button.dart';
import '../../core/widgets/skill_chip.dart';
import '../../core/theme/app_theme.dart';
import '../../core/constants/app_constants.dart';
import '../../services/storage_service.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({Key? key}) : super(key: key);

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _ageController = TextEditingController();
  final _bioController = TextEditingController();
  final _githubController = TextEditingController();
  final _linkedinController = TextEditingController();

  String? _selectedGender;
  int? _selectedYear;
  String _selectedPreferredGender = 'Both';
  List<String> _selectedSkills = [];
  List<String> _selectedInterests = [];
  List<String> _selectedLanguages = [];
  File? _profileImage;
  List<Project> _projects = [];
  bool _isLoading = false;

  final ImagePicker _picker = ImagePicker();
  final StorageService _storageService = StorageService();

  Future<void> _pickImage() async {
    final XFile? image = await _picker.pickImage(source: ImageSource.gallery);
    if (image != null) {
      setState(() {
        _profileImage = File(image.path);
      });
    }
  }

  void _addProject() {
    final titleController = TextEditingController();
    final descController = TextEditingController();
    final linkController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Project'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: titleController,
              decoration: const InputDecoration(labelText: 'Project Title'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: descController,
              decoration: const InputDecoration(labelText: 'Description'),
              maxLines: 3,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: linkController,
              decoration: const InputDecoration(labelText: 'Link (optional)'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              if (titleController.text.isNotEmpty && descController.text.isNotEmpty) {
                setState(() {
                  _projects.add(Project(
                    title: titleController.text,
                    description: descController.text,
                    link: linkController.text.isEmpty ? null : linkController.text,
                  ));
                });
                Navigator.pop(context);
              }
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  void _addLanguage() {
    final controller = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Programming Language'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(labelText: 'Language'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              if (controller.text.isNotEmpty && !_selectedLanguages.contains(controller.text)) {
                setState(() {
                  _selectedLanguages.add(controller.text);
                });
                Navigator.pop(context);
              }
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    // Validate required fields
    if (_selectedGender == null) {
      _showError('Please select your gender');
      return;
    }
    if (_selectedYear == null) {
      _showError('Please select your year of study');
      return;
    }
    if (_selectedSkills.isEmpty) {
      _showError('Please select at least one skill');
      return;
    }
    if (_selectedInterests.isEmpty) {
      _showError('Please select at least one interest');
      return;
    }
    if (_selectedLanguages.isEmpty) {
      _showError('Please add at least one programming language');
      return;
    }

    setState(() => _isLoading = true);

    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final uid = authProvider.firebaseUser!.uid;
      final email = authProvider.firebaseUser!.email!;

      // Upload profile photo if selected
      String? photoUrl;
      if (_profileImage != null) {
        photoUrl = await _storageService.uploadProfilePhoto(uid, _profileImage!);
      }

      // Create user profile
      final user = UserModel(
        uid: uid,
        email: email,
        fullName: _nameController.text,
        age: int.parse(_ageController.text),
        gender: _selectedGender!,
        yearOfStudy: _selectedYear!,
        skills: _selectedSkills,
        interests: _selectedInterests,
        languages: _selectedLanguages,
        preferredGender: _selectedPreferredGender,
        profilePhotoUrl: photoUrl,
        github: _githubController.text.isEmpty ? null : _githubController.text,
        linkedin: _linkedinController.text.isEmpty ? null : _linkedinController.text,
        bio: _bioController.text.isEmpty ? null : _bioController.text,
        projects: _projects,
      );

      final success = await authProvider.createUserProfile(user);

      if (!mounted) return;

      if (success) {
        // Navigate to home
        Navigator.of(context).pushReplacementNamed('/home');
      } else {
        _showError('Failed to create profile. Please try again.');
      }
    } catch (e) {
      _showError('An error occurred: $e');
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
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Complete Your Profile'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Profile Photo
              Center(
                child: GestureDetector(
                  onTap: _pickImage,
                  child: Container(
                    width: 120,
                    height: 120,
                    decoration: BoxDecoration(
                      color: AppTheme.backgroundColor,
                      shape: BoxShape.circle,
                      border: Border.all(color: AppTheme.primaryPink, width: 3),
                      image: _profileImage != null
                          ? DecorationImage(
                              image: FileImage(_profileImage!),
                              fit: BoxFit.cover,
                            )
                          : null,
                    ),
                    child: _profileImage == null
                        ? const Icon(Icons.add_a_photo, size: 40, color: AppTheme.iconColor)
                        : null,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              const Center(
                child: Text(
                  'Tap to add photo (optional)',
                  style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                ),
              ),
              const SizedBox(height: 32),

              // Full Name
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Full Name *'),
                validator: (value) => value?.isEmpty ?? true ? 'Required' : null,
              ),
              const SizedBox(height: 16),

              // Age
              TextFormField(
                controller: _ageController,
                decoration: const InputDecoration(labelText: 'Age *'),
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value?.isEmpty ?? true) return 'Required';
                  final age = int.tryParse(value!);
                  if (age == null || age < 16 || age > 30) return 'Invalid age';
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Gender
              DropdownButtonFormField<String>(
                value: _selectedGender,
                decoration: const InputDecoration(labelText: 'Gender *'),
                items: AppConstants.genders.map((gender) {
                  return DropdownMenuItem(value: gender, child: Text(gender));
                }).toList(),
                onChanged: (value) => setState(() => _selectedGender = value),
              ),
              const SizedBox(height: 16),

              // Year of Study
              DropdownButtonFormField<int>(
                value: _selectedYear,
                decoration: const InputDecoration(labelText: 'Year of Study *'),
                items: AppConstants.years.map((year) {
                  return DropdownMenuItem(value: year, child: Text('Year $year'));
                }).toList(),
                onChanged: (value) => setState(() => _selectedYear = value),
              ),
              const SizedBox(height: 24),

              // Skills
              const Text('Skills *', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: AppConstants.skills.map((skill) {
                  final isSelected = _selectedSkills.contains(skill);
                  return SkillChip(
                    label: skill,
                    isSelected: isSelected,
                    onTap: () {
                      setState(() {
                        if (isSelected) {
                          _selectedSkills.remove(skill);
                        } else {
                          _selectedSkills.add(skill);
                        }
                      });
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 24),

              // Interests
              const Text('Interests *', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: AppConstants.interests.map((interest) {
                  final isSelected = _selectedInterests.contains(interest);
                  return SkillChip(
                    label: interest,
                    isSelected: isSelected,
                    onTap: () {
                      setState(() {
                        if (isSelected) {
                          _selectedInterests.remove(interest);
                        } else {
                          _selectedInterests.add(interest);
                        }
                      });
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 24),

              // Preferred Match Gender
              const Text('Preferred Match Gender *', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: AppConstants.preferredGenders.map((gender) {
                  final isSelected = _selectedPreferredGender == gender;
                  return SkillChip(
                    label: gender,
                    isSelected: isSelected,
                    onTap: () => setState(() => _selectedPreferredGender = gender),
                  );
                }).toList(),
              ),
              const SizedBox(height: 24),

              // Programming Languages
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Programming Languages *', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                  IconButton(
                    icon: const Icon(Icons.add_circle, color: AppTheme.primaryPink),
                    onPressed: _addLanguage,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _selectedLanguages.map((lang) {
                  return Chip(
                    label: Text(lang),
                    onDeleted: () {
                      setState(() => _selectedLanguages.remove(lang));
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 24),

              // Optional Fields
              const Divider(),
              const SizedBox(height: 16),
              const Text('Optional Information', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 16),

              // Bio
              TextFormField(
                controller: _bioController,
                decoration: const InputDecoration(labelText: 'Bio / About'),
                maxLines: 3,
              ),
              const SizedBox(height: 16),

              // GitHub
              TextFormField(
                controller: _githubController,
                decoration: const InputDecoration(labelText: 'GitHub URL'),
              ),
              const SizedBox(height: 16),

              // LinkedIn
              TextFormField(
                controller: _linkedinController,
                decoration: const InputDecoration(labelText: 'LinkedIn URL'),
              ),
              const SizedBox(height: 24),

              // Projects
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Projects', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                  IconButton(
                    icon: const Icon(Icons.add_circle, color: AppTheme.primaryPink),
                    onPressed: _addProject,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ..._projects.map((project) {
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    title: Text(project.title),
                    subtitle: Text(project.description),
                    trailing: IconButton(
                      icon: const Icon(Icons.delete, color: Colors.red),
                      onPressed: () {
                        setState(() => _projects.remove(project));
                      },
                    ),
                  ),
                );
              }).toList(),
              const SizedBox(height: 32),

              // Save Button
              GradientButton(
                text: 'Complete Profile',
                onPressed: _saveProfile,
                isLoading: _isLoading,
                width: double.infinity,
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _nameController.dispose();
    _ageController.dispose();
    _bioController.dispose();
    _githubController.dispose();
    _linkedinController.dispose();
    super.dispose();
  }
}
