import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/chat_provider.dart';
import '../../core/theme/app_theme.dart';
import 'chat_screen.dart';

class MessagesListScreen extends StatelessWidget {
  const MessagesListScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Messages'),
      ),
      body: Consumer<ChatProvider?>(
        builder: (context, chatProvider, child) {
          if (chatProvider == null) {
            return const Center(child: CircularProgressIndicator());
          }

          if (chatProvider.matches.isEmpty) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.chat_bubble_outline, size: 80, color: AppTheme.iconColor),
                  SizedBox(height: 16),
                  Text(
                    'No matches yet',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Start swiping and matching to chat',
                    style: TextStyle(color: AppTheme.textSecondary),
                  ),
                ],
              ),
            );
          }

          return ListView.builder(
            itemCount: chatProvider.matches.length,
            itemBuilder: (context, index) {
              final match = chatProvider.matches[index];
              final otherUserId = match.getOtherUserId(chatProvider.currentUserId);
              final user = chatProvider.matchedUsers[otherUserId];
              final lastMessage = chatProvider.lastMessages[match.id];

              if (user == null) {
                return const SizedBox();
              }

              return ListTile(
                leading: CircleAvatar(
                  radius: 28,
                  backgroundImage: user.profilePhotoUrl != null
                      ? NetworkImage(user.profilePhotoUrl!)
                      : null,
                  child: user.profilePhotoUrl == null
                      ? const Icon(Icons.person)
                      : null,
                ),
                title: Text(
                  user.fullName,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: Text(
                  lastMessage?.text ?? 'Start a conversation',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: lastMessage == null 
                        ? AppTheme.textSecondary 
                        : AppTheme.textPrimary,
                  ),
                ),
                trailing: lastMessage != null && 
                        lastMessage.senderId != chatProvider.currentUserId &&
                        !lastMessage.read
                    ? Container(
                        width: 12,
                        height: 12,
                        decoration: const BoxDecoration(
                          color: AppTheme.primaryPink,
                          shape: BoxShape.circle,
                        ),
                      )
                    : null,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => ChatScreen(
                        matchId: match.id,
                        otherUser: user,
                      ),
                    ),
                  );
                },
              );
            },
          );
        },
      ),
    );
  }
}
