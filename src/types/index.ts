export type Domain =
    | 'Frontend'
    | 'Backend'
    | 'Database'
    | 'API'
    | 'Full-Stack'
    | 'Mobile'
    | 'DevOps'
    | 'Data Engineering'
    | 'AI/ML'
    | 'Cybersecurity'
    | 'Cloud'
    | 'Game Dev'
    | 'IoT'
    | 'QA'
    | 'Architecture';

export type PortfolioProject = {
    projectTitle: string;
    projectDescription?: string;
    projectLink?: string;          // Clickable → opens project
    projectScreenshot?: string;    // 1 screenshot URL per project
    githubRepoLink?: string;       // Clickable → opens GitHub repo
    topContributions?: string[];   // Key contributions list
};

export type Skill = {
    name: string;
    level: 1 | 2 | 3; // 1 = Beginner, 2 = Intermediate, 3 = Expert
};

export type ProfessionalDetails = {
    year: '1st' | '2nd' | '3rd' | '4th' | 'Graduated';
    domains: Domain[];
    languages: string[]; // e.g. "JavaScript", "Python"
    skills: Skill[];
    openTo: string[]; // e.g., "Mentorship", "Collaboration", "Job Opportunities"
};

export type UserProfile = {
    id: string; // Email is used as ID
    personal: {
        firstName: string;
        middleName?: string;
        lastName: string;
        gender: 'Male' | 'Female' | 'Other';
        age: number;
        branch?: string; // e.g. CS, CSE, IT, ECE, etc.
    };
    professionalDetails: ProfessionalDetails;
    visuals: {
        photos: string[]; // URLs (placeholders for now)
        github?: string;
        linkedin?: string;
        bio?: string;
    };
    portfolio?: PortfolioProject[]; // Max 5 projects
    preferences: {
        interestedIn: ('Male' | 'Female' | 'Other')[]; // For matching
        interestedDomains?: Domain[]; // Tech stack preferences
    };
    onboardingCompleted: boolean;
    lastActive?: number; // Timestamp of last activity
    reputation?: number;
    achievements?: Achievement[];
};

export type Match = {
    id: string;
    users: [string, string]; // [email1, email2]
    createdAt: Date;
    lastMessageAt?: Date;
    lastMessage?: string;
};

export type Message = {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    timestamp: number;
};

export type GitHubRepo = {
    name: string;
    description: string | null;
    stars: number;
    language: string | null;
    url: string;
};

export type GitHubStats = {
    username: string;
    followers: number;
    publicRepos: number;
    totalStars: number;
    topLanguages: { name: string; percentage: number; color: string }[];
    topRepos: GitHubRepo[];
};

export type Achievement = {
    id: string;
    title: string;
    description: string;
    icon: string; // Lucide icon name or emoji
    color: string; // Tailwind color class or hex
    dateEarned?: number; // Timestamp
};
