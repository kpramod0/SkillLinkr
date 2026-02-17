import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/request_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/loading_overlay.dart';

class RequestsScreen extends StatelessWidget {
  const RequestsScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Requests'),
          bottom: const TabBar(
            labelColor: AppTheme.primaryPink,
            unselectedLabelColor: AppTheme.textSecondary,
            indicatorColor: AppTheme.primaryPink,
            tabs: [
              Tab(text: 'Incoming'),
              Tab(text: 'Outgoing'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            _IncomingRequestsTab(),
            _OutgoingRequestsTab(),
          ],
        ),
      ),
    );
  }
}

class _IncomingRequestsTab extends StatelessWidget {
  const _IncomingRequestsTab();

  @override
  Widget build(BuildContext context) {
    return Consumer<RequestProvider?>(
      builder: (context, requestProvider, child) {
        if (requestProvider == null) {
          return const Center(child: CircularProgressIndicator());
        }

        if (requestProvider.isLoading) {
          return const LoadingOverlay(message: 'Loading requests...');
        }

        if (requestProvider.incomingRequests.isEmpty) {
          return const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.inbox_outlined, size: 80, color: AppTheme.iconColor),
                SizedBox(height: 16),
                Text(
                  'No incoming requests',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                ),
                SizedBox(height: 8),
                Text(
                  'When someone likes you, you'll see it here',
                  style: TextStyle(color: AppTheme.textSecondary),
                ),
              ],
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: requestProvider.incomingRequests.length,
          itemBuilder: (context, index) {
            final request = requestProvider.incomingRequests[index];
            final user = requestProvider.requestUsers[request.fromUid];

            if (user == null) {
              return const SizedBox();
            }

            return Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 30,
                          backgroundImage: user.profilePhotoUrl != null
                              ? NetworkImage(user.profilePhotoUrl!)
                              : null,
                          child: user.profilePhotoUrl == null
                              ? const Icon(Icons.person, size: 30)
                              : null,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                user.fullName,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              Text(
                                '${user.age} • Year ${user.yearOfStudy}',
                                style: const TextStyle(
                                  fontSize: 14,
                                  color: AppTheme.textSecondary,
                                ),
                              ),
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
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () async {
                              await requestProvider.rejectRequest(request);
                            },
                            icon: const Icon(Icons.close, color: Colors.red),
                            label: const Text('Reject', style: TextStyle(color: Colors.red)),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: Colors.red),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () async {
                              final success = await requestProvider.acceptRequest(request);
                              if (success && context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Match created! You can now chat'),
                                    backgroundColor: Colors.green,
                                  ),
                                );
                              }
                            },
                            icon: const Icon(Icons.check),
                            label: const Text('Accept'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.green,
                              foregroundColor: Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}

class _OutgoingRequestsTab extends StatelessWidget {
  const _OutgoingRequestsTab();

  @override
  Widget build(BuildContext context) {
    return Consumer<RequestProvider?>(
      builder: (context, requestProvider, child) {
        if (requestProvider == null) {
          return const Center(child: CircularProgressIndicator());
        }

        if (requestProvider.outgoingRequests.isEmpty) {
          return const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.send_outlined, size: 80, color: AppTheme.iconColor),
                SizedBox(height: 16),
                Text(
                  'No outgoing requests',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                ),
                SizedBox(height: 8),
                Text(
                  'Start swiping to send connection requests',
                  style: TextStyle(color: AppTheme.textSecondary),
                ),
              ],
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: requestProvider.outgoingRequests.length,
          itemBuilder: (context, index) {
            final request = requestProvider.outgoingRequests[index];
            final user = requestProvider.requestUsers[request.toUid];

            if (user == null) {
              return const SizedBox();
            }

            return Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundImage: user.profilePhotoUrl != null
                      ? NetworkImage(user.profilePhotoUrl!)
                      : null,
                  child: user.profilePhotoUrl == null
                      ? const Icon(Icons.person)
                      : null,
                ),
                title: Text(user.fullName),
                subtitle: Text('${user.age} • Year ${user.yearOfStudy}'),
                trailing: const Chip(
                  label: Text('Pending', style: TextStyle(fontSize: 12)),
                  backgroundColor: Colors.orange,
                  labelStyle: TextStyle(color: Colors.white),
                ),
              ),
            );
          },
        );
      },
    );
  }
}
