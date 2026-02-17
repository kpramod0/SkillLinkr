import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');

    if (!username) {
        return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    try {
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'KIIT-Social-App' // GitHub requires a User-Agent
        };

        // 1. Fetch User Profile
        const userRes = await fetch(`https://api.github.com/users/${username}`, { headers });
        if (!userRes.ok) {
            if (userRes.status === 404) return NextResponse.json({ error: 'GitHub user not found' }, { status: 404 });
            // Rate limit check
            if (userRes.status === 403) return NextResponse.json({ error: 'GitHub API rate limit exceeded. Try again later.' }, { status: 429 });
            throw new Error('Failed to fetch user');
        }
        const user = await userRes.json();

        // 2. Fetch Repositories (Up to 100, sorted by updated)
        // We fetch recently updated to get active projects, but we'll sort by stars locally for "Top Repos"
        const reposRes = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, { headers });
        if (!reposRes.ok) throw new Error('Failed to fetch repos');
        const repos = await reposRes.json();

        // 3. Aggregate Data
        let totalStars = 0;
        const languageCounts: Record<string, number> = {};

        // Process repos
        const processedRepos = repos
            .filter((r: any) => !r.fork) // Filter out forks to show original work? Or keep them? Let's keep original work for "Stats" typically.
            .map((r: any) => {
                totalStars += r.stargazers_count;

                if (r.language) {
                    languageCounts[r.language] = (languageCounts[r.language] || 0) + 1;
                }

                return {
                    name: r.name,
                    description: r.description,
                    stars: r.stargazers_count,
                    language: r.language,
                    url: r.html_url,
                    updatedAt: r.updated_at
                };
            });

        // Sort by stars for "Top Repos"
        const topRepos = [...processedRepos]
            .sort((a, b) => b.stars - a.stars)
            .slice(0, 6); // Top 6

        // Calculate Language Percentages
        const totalLanguages = Object.values(languageCounts).reduce((a, b) => a + b, 0);
        const topLanguages = Object.entries(languageCounts)
            .map(([name, count]) => ({
                name,
                percentage: totalLanguages > 0 ? Math.round((count / totalLanguages) * 100) : 0,
                color: getLanguageColor(name)
            }))
            .sort((a, b) => b.percentage - a.percentage)
            .slice(0, 5); // Top 5 languages

        // Construct Response
        const stats = {
            username: user.login,
            followers: user.followers,
            publicRepos: user.public_repos,
            totalStars,
            topLanguages,
            topRepos
        };

        return NextResponse.json(stats);

    } catch (error) {
        console.error('GitHub API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch GitHub stats' }, { status: 500 });
    }
}

// Simple color map for common languages
function getLanguageColor(language: string): string {
    const colors: Record<string, string> = {
        'JavaScript': '#f1e05a',
        'TypeScript': '#3178c6',
        'Python': '#3572A5',
        'Java': '#b07219',
        'C++': '#f34b7d',
        'C': '#555555',
        'C#': '#178600',
        'Go': '#00ADD8',
        'Rust': '#dea584',
        'HTML': '#e34c26',
        'CSS': '#563d7c',
        'PHP': '#4F5D95',
        'Ruby': '#701516',
        'Swift': '#ffac45',
        'Kotlin': '#A97BFF',
        'Dart': '#00B4AB',
        'Shell': '#89e051'
    };
    return colors[language] || '#8b949e'; // Default gray
}
