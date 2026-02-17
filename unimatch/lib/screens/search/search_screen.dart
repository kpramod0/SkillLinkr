import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/firestore_service.dart';
import '../../models/user_model.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/loading_overlay.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({Key? key}) : super(key: key);

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final TextEditingController _searchController = TextEditingController();
  final FirestoreService _firestoreService = FirestoreService();
  List<UserModel> _searchResults = [];
  bool _isLoading = false;
  bool _hasSearched = false;

  Future<void> _performSearch() async {
    final query = _searchController.text.trim();
    if (query.isEmpty) return;

    setState(() {
      _isLoading = true;
      _hasSearched = true;
    });

    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final currentUid = authProvider.firebaseUser!.uid;

      final results = await _firestoreService.searchUsers(
        currentUid: currentUid,
        query: query,
      );

      setState(() {
        _searchResults = results;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Search'),
      ),
      body: Column(
        children: [
          // Search Bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search by name, skill, or interest...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          setState(() {
                            _searchResults = [];
                            _hasSearched = false;
                          });
                        },
                      )
                    : null,
              ),
              textInputAction: TextInputAction.search,
              onSubmitted: (_) => _performSearch(),
              onChanged: (_) => setState(() {}),
            ),
          ),

          // Results
          if (_isLoading)
            const Expanded(
              child: LoadingOverlay(message: 'Searching...'),
            )
          else if (!_hasSearched)
            const Expanded(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.search, size: 80, color: AppTheme.iconColor),
                    SizedBox(height: 16),
                    Text(
                      'Search for students',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Find by name, skill, or interest',
                      style: TextStyle(color: AppTheme.textSecondary),
                    ),
                  ],
                ),
              ),
            )
          else if (_searchResults.isEmpty)
            const Expanded(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.search_off, size: 80, color: AppTheme.iconColor),
                    SizedBox(height: 16),
                    Text(
                      'No results found',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Try a different search term',
                      style: TextStyle(color: AppTheme.textSecondary),
                    ),
                  ],
                ),
              ),
            )
          else
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: _searchResults.length,
                itemBuilder: (context, index) {
                  final user = _searchResults[index];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: ListTile(
                      leading: CircleAvatar(
                        radius: 28,
                        backgroundImage: user.profilePhotoUrl != null
                            ? NetworkImage(user.profilePhotoUrl!)
                            : null,
                        child: user.profilePhotoUrl == null
                            ? const Icon(Icons.person)
                            : null,
                      ),
                      title: Text(user.fullName),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${user.age} • Year ${user.yearOfStudy}'),
                          const SizedBox(height: 4),
                          Wrap(
                            spacing: 4,
                            children: user.skills.take(3).map((skill) {
                              return Chip(
                                label: Text(skill, style: const TextStyle(fontSize: 10)),
                                padding: const EdgeInsets.all(2),
                                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              );
                            }).toList(),
                          ),
                        ],
                      ),
                      isThreeLine: true,
                      onTap: () {
                        // TODO: Show full profile dialog
                        showDialog(
                          context: context,
                          builder: (context) => AlertDialog(
                            title: Text(user.fullName),
                            content: SingleChildScrollView(
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Age: ${user.age}'),
                                  Text('Year: ${user.yearOfStudy}'),
                                  const SizedBox(height: 8),
                                  if (user.bio != null) ...[
                                    const Text('Bio:', style: TextStyle(fontWeight: FontWeight.bold)),
                                    Text(user.bio!),
                                    const SizedBox(height: 8),
                                  ],
                                  const Text('Skills:', style: TextStyle(fontWeight: FontWeight.bold)),
                                  Wrap(
                                    spacing: 4,
                                    children: user.skills.map((s) => Chip(label: Text(s))).toList(),
                                  ),
                                  const SizedBox(height: 8),
                                  const Text('Interests:', style: TextStyle(fontWeight: FontWeight.bold)),
                                  Wrap(
                                    spacing: 4,
                                    children: user.interests.map((i) => Chip(label: Text(i))).toList(),
                                  ),
                                ],
                              ),
                            ),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(context),
                                child: const Text('Close'),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }
}
