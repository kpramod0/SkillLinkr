import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_card_swiper/flutter_card_swiper.dart';
import '../../providers/swipe_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/user_model.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/loading_overlay.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadFeed();
    });
  }

  Future<void> _loadFeed() async {
    final swipeProvider = Provider.of<SwipeProvider?>(context, listen: false);
    if (swipeProvider != null) {
      await swipeProvider.loadSwipeFeed();
    }
  }

  void _showFilterDialog() {
    // TODO: Implement filter dialog
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Filters'),
        content: const Text('Filter dialog coming soon!'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Peerzaa'),
        actions: [
          IconButton(
            icon: Image.asset('assets/icons/filter.png', width: 24, height: 24),
            onPressed: _showFilterDialog,
          ),
        ],
      ),
      body: Consumer<SwipeProvider?>(
        builder: (context, swipeProvider, child) {
          if (swipeProvider == null) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          if (swipeProvider.isLoading) {
            return const LoadingOverlay(message: 'Loading profiles...');
          }

          if (swipeProvider.swipeFeed.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.people_outline, size: 80, color: AppTheme.iconColor),
                  const SizedBox(height: 16),
                  const Text(
                    'No more profiles to show',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Check back later or adjust your filters',
                    style: TextStyle(color: AppTheme.textSecondary),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: _loadFeed,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Refresh'),
                  ),
                ],
              ),
            );
          }

          return Column(
            children: [
              Expanded(
                child: CardSwiper(
                  cardsCount: swipeProvider.swipeFeed.length,
                  cardBuilder: (context, index, _, __) {
                    final user = swipeProvider.swipeFeed[index];
                    return _ProfileCard(user: user);
                  },
                  onSwipe: (previousIndex, currentIndex, direction) {
                    final user = swipeProvider.swipeFeed[previousIndex];
                    
                    if (direction == CardSwiperDirection.right) {
                      swipeProvider.likeUser(user.uid);
                    } else if (direction == CardSwiperDirection.left) {
                      swipeProvider.rejectUser(user.uid);
                    } else if (direction == CardSwiperDirection.top) {
                      swipeProvider.bookmarkUser(user.uid);
                    }
                    
                    return true;
                  },
                ),
              ),
              
              // Action Buttons
              Padding(
                padding: const EdgeInsets.all(24.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _ActionButton(
                      icon: 'assets/icons/reject.png',
                      color: Colors.red,
                      onPressed: () {
                        if (swipeProvider.swipeFeed.isNotEmpty) {
                          swipeProvider.rejectUser(swipeProvider.swipeFeed.first.uid);
                        }
                      },
                    ),
                    _ActionButton(
                      icon: 'assets/icons/bookmark.png',
                      color: AppTheme.accentBlue,
                      onPressed: () {
                        if (swipeProvider.swipeFeed.isNotEmpty) {
                          swipeProvider.bookmarkUser(swipeProvider.swipeFeed.first.uid);
                        }
                      },
                    ),
                    _ActionButton(
                      icon: 'assets/icons/like.png',
                      color: AppTheme.primaryPink,
                      onPressed: () {
                        if (swipeProvider.swipeFeed.isNotEmpty) {
                          swipeProvider.likeUser(swipeProvider.swipeFeed.first.uid);
                        }
                      },
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _ProfileCard extends StatelessWidget {
  final UserModel user;

  const _ProfileCard({required this.user});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(16),
      decoration: AppTheme.cardDecoration,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Column(
          children: [
            // Profile Photo
            Expanded(
              flex: 2,
              child: Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  gradient: AppTheme.primaryGradient,
                ),
                child: user.profilePhotoUrl != null
                    ? Image.network(
                        user.profilePhotoUrl!,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) => _defaultAvatar(),
                      )
                    : _defaultAvatar(),
              ),
            ),

            // Profile Info
            Expanded(
              flex: 1,
              child: Container(
                padding: const EdgeInsets.all(20),
                width: double.infinity,
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${user.fullName}, ${user.age}',
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Year ${user.yearOfStudy} • ${user.gender}',
                        style: const TextStyle(
                          fontSize: 14,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 12),
                      
                      if (user.bio != null) ...[
                        Text(
                          user.bio!,
                          style: const TextStyle(fontSize: 14),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 12),
                      ],

                      // Skills
                      const Text(
                        'Skills',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: user.skills.take(5).map((skill) {
                          return Chip(
                            label: Text(skill, style: const TextStyle(fontSize: 10)),
                            padding: const EdgeInsets.all(2),
                            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 12),

                      // Interests
                      const Text(
                        'Interests',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: user.interests.take(3).map((interest) {
                          return Chip(
                            label: Text(interest, style: const TextStyle(fontSize: 10)),
                            padding: const EdgeInsets.all(2),
                            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          );
                        }).toList(),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _defaultAvatar() {
    return const Center(
      child: Icon(Icons.person, size: 100, color: Colors.white),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String icon;
  final Color color;
  final VoidCallback onPressed;

  const _ActionButton({
    required this.icon,
    required this.color,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 64,
      height: 64,
      decoration: BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(32),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Image.asset(
              icon,
              color: color,
              errorBuilder: (context, error, stackTrace) => Icon(Icons.favorite, color: color),
            ),
          ),
        ),
      ),
    );
  }
}
