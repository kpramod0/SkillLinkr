import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../core/theme/app_theme.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () {
              // TODO: Navigate to edit profile
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Edit profile coming soon!')),
              );
            },
          ),
        ],
      ),
      body: Consumer<AuthProvider>(
        builder: (context, authProvider, child) {
          final user = authProvider.userModel;

          if (user == null) {
            return const Center(child: Text('No profile data'));
          }

          return SingleChildScrollView(
            child: Column(
              children: [
                // Profile Header
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    gradient: AppTheme.primaryGradient,
                  ),
                  child: Column(
                    children: [
                      CircleAvatar(
                        radius: 60,
                        backgroundImage: user.profilePhotoUrl != null
                            ? NetworkImage(user.profilePhotoUrl!)
                            : null,
                        child: user.profilePhotoUrl == null
                            ? const Icon(Icons.person, size: 60, color: Colors.white)
                            : null,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        user.fullName,
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${user.age} years old • ${user.gender}',
                        style: const TextStyle(
                          fontSize: 16,
                          color: Colors.white70,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        user.email,
                        style: const TextStyle(
                          fontSize: 14,
                          color: Colors.white60,
                        ),
                      ),
                    ],
                  ),
                ),

                // Profile Details
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _InfoCard(
                        title: 'Academic',
                        items: [
                          _InfoItem(label: 'Year of Study', value: 'Year ${user.yearOfStudy}'),
                        ],
                      ),

                      if (user.bio != null) ...[
                        const SizedBox(height: 16),
                        _InfoCard(
                          title: 'About',
                          items: [
                            _InfoItem(label: '', value: user.bio!),
                          ],
                        ),
                      ],

                      const SizedBox(height: 16),
                      _InfoCard(
                        title: 'Skills',
                        child: Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: user.skills.map((skill) {
                            return Chip(label: Text(skill));
                          }).toList(),
                        ),
                      ),

                      const SizedBox(height: 16),
                      _InfoCard(
                        title: 'Interests',
                        child: Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: user.interests.map((interest) {
                            return Chip(label: Text(interest));
                          }).toList(),
                        ),
                      ),

                      const SizedBox(height: 16),
                      _InfoCard(
                        title: 'Programming Languages',
                        child: Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: user.languages.map((lang) {
                            return Chip(label: Text(lang));
                          }).toList(),
                        ),
                      ),

                      if (user.github != null || user.linkedin != null) ...[
                        const SizedBox(height: 16),
                        _InfoCard(
                          title: 'Links',
                          items: [
                            if (user.github != null) _InfoItem(label: 'GitHub', value: user.github!),
                            if (user.linkedin != null) _InfoItem(label: 'LinkedIn', value: user.linkedin!),
                          ],
                        ),
                      ],

                      if (user.projects.isNotEmpty) ...[
                        const SizedBox(height: 16),
                        _InfoCard(
                          title: 'Projects',
                          child: Column(
                            children: user.projects.map((project) {
                              return Card(
                                margin: const EdgeInsets.only(bottom: 8),
                                child: ListTile(
                                  title: Text(project.title),
                                  subtitle: Text(project.description),
                                  trailing: project.link != null
                                      ? const Icon(Icons.link)
                                      : null,
                                ),
                              );
                            }).toList(),
                          ),
                        ),
                      ],

                      const SizedBox(height: 24),

                      // Logout Button
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: () async {
                            final confirmed = await showDialog<bool>(
                              context: context,
                              builder: (context) => AlertDialog(
                                title: const Text('Logout'),
                                content: const Text('Are you sure you want to logout?'),
                                actions: [
                                  TextButton(
                                    onPressed: () => Navigator.pop(context, false),
                                    child: const Text('Cancel'),
                                  ),
                                  TextButton(
                                    onPressed: () => Navigator.pop(context, true),
                                    child: const Text('Logout'),
                                  ),
                                ],
                              ),
                            );

                            if (confirmed == true && context.mounted) {
                              await authProvider.signOut();
                              if (context.mounted) {
                                Navigator.of(context).pushReplacementNamed('/login');
                              }
                            }
                          },
                          icon: const Icon(Icons.logout, color: Colors.red),
                          label: const Text('Logout', style: TextStyle(color: Colors.red)),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Colors.red),
                            padding: const EdgeInsets.symmetric(vertical: 16),
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  final String title;
  final List<_InfoItem>? items;
  final Widget? child;

  const _InfoCard({
    required this.title,
    this.items,
    this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 12),
            if (items != null)
              ...items!
            else if (child != null)
              child!,
          ],
        ),
      ),
    );
  }
}

class _InfoItem extends StatelessWidget {
  final String label;
  final String value;

  const _InfoItem({
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: label.isEmpty
          ? Text(value, style: const TextStyle(fontSize: 14))
          : Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 100,
                  child: Text(
                    label,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                ),
                Expanded(
                  child: Text(
                    value,
                    style: const TextStyle(fontSize: 14),
                  ),
                ),
              ],
            ),
    );
  }
}
