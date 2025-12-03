'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { 
  Users, 
  TrendingUp,
  Award,
  MessageCircle,
  Camera,
  Zap,
  Target,
  Trophy,
  Sparkles,
  ArrowRight,
  Play,
  ImageIcon,
  Send,
} from 'lucide-react';
import { Icon } from '@/components/icons';
import { Button } from '@/components/ui';

interface CommunityStats {
  totalRiders: number;
  skateparks: number;
  photos: number;
  events: number;
}

interface FeaturedUser {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  stats: {
    parksVisited: number;
    photosShared: number;
    followers: number;
  };
  badges: string[];
}

interface CommunityPost {
  id: string;
  user: {
    name: string;
    avatar: string;
  };
  content: string;
  image?: string;
  location?: string;
  timestamp: string;
  likes: number;
  comments: number;
}

export default function CommunityPage() {
  const pathname = usePathname();
  const locale = useLocale();
  const isHebrew = locale === 'he';
  const t = useTranslations('common');
  
  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'feed' | 'stories' | 'events'>('feed');

  // Track scroll for sticky elements
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Mock data (replace with API calls)
  const stats: CommunityStats = {
    totalRiders: 12500,
    skateparks: 247,
    photos: 8340,
    events: 156,
  };

  const featuredUsers: FeaturedUser[] = [
    {
      id: '1',
      name: t('community.featuredUsers.user1.name'),
      avatar: '/avatars/user1.jpg',
      bio: t('community.featuredUsers.user1.bio'),
      stats: { parksVisited: 87, photosShared: 234, followers: 1240 },
      badges: [t('community.badges.veteran'), t('community.badges.photographer'), t('community.badges.explorer')],
    },
    {
      id: '2',
      name: t('community.featuredUsers.user2.name'),
      avatar: '/avatars/user2.jpg',
      bio: t('community.featuredUsers.user2.bio'),
      stats: { parksVisited: 52, photosShared: 189, followers: 890 },
      badges: [t('community.badges.coach'), t('community.badges.organizer'), t('community.badges.influencer')],
    },
    {
      id: '3',
      name: t('community.featuredUsers.user3.name'),
      avatar: '/avatars/user3.jpg',
      bio: t('community.featuredUsers.user3.bio'),
      stats: { parksVisited: 124, photosShared: 567, followers: 2100 },
      badges: [t('community.badges.photographer'), t('community.badges.contentCreator'), t('community.badges.veteran')],
    },
  ];

  const recentPosts: CommunityPost[] = [
    {
      id: '1',
      user: { name: t('community.featuredUsers.user1.name'), avatar: '/avatars/user1.jpg' },
      content: t('community.posts.post1.content'),
      image: '/posts/session1.jpg',
      location: t('community.posts.post1.location'),
      timestamp: t('community.posts.post1.timestamp'),
      likes: 47,
      comments: 12,
    },
    {
      id: '2',
      user: { name: t('community.featuredUsers.user2.name'), avatar: '/avatars/user2.jpg' },
      content: t('community.posts.post2.content'),
      location: t('community.posts.post2.location'),
      timestamp: t('community.posts.post2.timestamp'),
      likes: 89,
      comments: 23,
    },
    {
      id: '3',
      user: { name: t('community.featuredUsers.user3.name'), avatar: '/avatars/user3.jpg' },
      content: t('community.posts.post3.content'),
      image: '/posts/photo1.jpg',
      location: t('community.posts.post3.location'),
      timestamp: t('community.posts.post3.timestamp'),
      likes: 234,
      comments: 45,
    },
  ];

  return (
    <div 
      className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950"
      dir={isHebrew ? 'rtl' : 'ltr'}
    >
      
      {/* ========================================
          HERO SECTION
      ======================================== */}
      <div className="relative bg-gradient-to-br from-brand-main/10 via-transparent to-purple-500/10 dark:from-brand-main/5 dark:to-purple-500/5 border-b border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(13,115,119,0.1)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_30%_50%,rgba(13,115,119,0.05)_0%,transparent_50%)]" />
        
        <div className="relative max-w-7xl mx-auto px-4 py-12 lg:py-20">
          <div className="text-center space-y-6">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
              <Users className="w-4 h-4 text-brand-main" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {stats.totalRiders.toLocaleString()}+ {t('community.hero.activeRiders')}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white">
              {t('community.hero.title')}
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              {t('community.hero.subtitle')}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button variant="brand" size="lg" className="min-w-[200px]">
                <Users className={`w-5 h-5 ${isHebrew ? 'ml-2' : 'mr-2'}`} />
                {t('community.hero.joinButton')}
              </Button>
              <Button variant="outline" size="lg" className="min-w-[200px]">
                <Play className={`w-5 h-5 ${isHebrew ? 'ml-2' : 'mr-2'}`} />
                {t('community.hero.watchButton')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================
          COMMUNITY STATS BAR
      ======================================== */}
      <div className="bg-gradient-to-r from-brand-main to-green-500 dark:from-brand-main/90 dark:to-green-500/90 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Total Riders */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Users className="w-6 h-6" />
              </div>
              <div className="text-3xl md:text-4xl font-bold mb-1">
                {stats.totalRiders.toLocaleString()}+
              </div>
              <div className="text-sm opacity-90">
                {t('community.stats.riders')}
              </div>
            </div>

            {/* Skateparks */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Icon name="location" className="w-6 h-6" />
              </div>
              <div className="text-3xl md:text-4xl font-bold mb-1">
                {stats.skateparks}
              </div>
              <div className="text-sm opacity-90">
                {t('community.stats.parks')}
              </div>
            </div>

            {/* Photos */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Camera className="w-6 h-6" />
              </div>
              <div className="text-3xl md:text-4xl font-bold mb-1">
                {stats.photos.toLocaleString()}+
              </div>
              <div className="text-sm opacity-90">
                {t('community.stats.photos')}
              </div>
            </div>

            {/* Events */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Icon name="calendar" className="w-6 h-6" />
              </div>
              <div className="text-3xl md:text-4xl font-bold mb-1">
                {stats.events}
              </div>
              <div className="text-sm opacity-90">
                {t('community.stats.events')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================
          FEATURED MEMBERS
      ======================================== */}
      <section className="py-16 lg:py-20 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-full mb-4">
              <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-semibold text-purple-900 dark:text-purple-300">
                {t('community.featured.badge')}
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('community.featured.title')}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {t('community.featured.subtitle')}
            </p>
          </div>

          {/* Featured User Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredUsers.map((user, index) => (
              <div
                key={user.id}
                className="group relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand-main/5 to-purple-500/5 dark:from-brand-main/10 dark:to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative p-6">
                  {/* Avatar & Name */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-main to-purple-500 flex items-center justify-center text-white text-xl font-bold">
                        {user.name.charAt(0)}
                      </div>
                      {/* Online indicator */}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 truncate">
                        {user.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {user.bio}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {user.stats.parksVisited}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {t('community.featured.stats.parks')}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {user.stats.photosShared}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {t('community.featured.stats.photos')}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {user.stats.followers}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {t('community.featured.stats.followers')}
                      </div>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {user.badges.map((badge) => (
                      <div
                        key={badge}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 dark:bg-purple-900/20 rounded-full text-xs font-medium text-purple-900 dark:text-purple-300"
                      >
                        <Trophy className="w-3 h-3" />
                        {badge}
                      </div>
                    ))}
                  </div>

                  {/* Action Button */}
                  <Button variant="outline" className="w-full">
                    <Users className={`w-4 h-4 ${isHebrew ? 'ml-2' : 'mr-2'}`} />
                    {t('community.featured.followButton')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================
          COMMUNITY FEED
      ======================================== */}
      <section className="py-16 lg:py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-full mb-4">
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                {t('community.feed.badge')}
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('community.feed.title')}
            </h2>
          </div>

          {/* Tabs */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <button
              onClick={() => setSelectedTab('feed')}
              className={`px-6 py-3 rounded-full font-semibold transition-all ${
                selectedTab === 'feed'
                  ? 'bg-brand-main text-white shadow-lg'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {t('community.feed.tabs.feed')}
            </button>
            <button
              onClick={() => setSelectedTab('stories')}
              className={`px-6 py-3 rounded-full font-semibold transition-all ${
                selectedTab === 'stories'
                  ? 'bg-brand-main text-white shadow-lg'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {t('community.feed.tabs.stories')}
            </button>
            <button
              onClick={() => setSelectedTab('events')}
              className={`px-6 py-3 rounded-full font-semibold transition-all ${
                selectedTab === 'events'
                  ? 'bg-brand-main text-white shadow-lg'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {t('community.feed.tabs.events')}
            </button>
          </div>

          {/* Posts Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentPosts.map((post) => (
              <div
                key={post.id}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-xl transition-all duration-300"
              >
                {/* Post Image */}
                {post.image && (
                  <div className="relative aspect-square bg-gray-100 dark:bg-gray-800">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-gray-400" />
                    </div>
                  </div>
                )}

                {/* Post Content */}
                <div className="p-4">
                  {/* User Info */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-main to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                      {post.user.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-white truncate">
                        {post.user.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {post.timestamp}
                      </div>
                    </div>
                  </div>

                  {/* Post Text */}
                  <p className="text-gray-700 dark:text-gray-300 mb-3">
                    {post.content}
                  </p>

                  {/* Location */}
                  {post.location && (
                    <div className="flex items-center gap-1 text-sm text-brand-main mb-3">
                      <Icon name="location" className="w-4 h-4" />
                      {post.location}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-4 pt-3 border-t border-gray-200 dark:border-gray-800">
                    <button className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-red-500 transition-colors">
                      <Icon name="heart" className="w-5 h-5" />
                      <span className="text-sm font-medium">{post.likes}</span>
                    </button>
                    <button className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-brand-main transition-colors">
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">{post.comments}</span>
                    </button>
                    <button className="ml-auto text-gray-600 dark:text-gray-400 hover:text-brand-main transition-colors">
                      <Icon name="share" className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load More */}
          <div className="text-center mt-12">
            <Button variant="outline" size="lg">
              {t('community.feed.loadMore')}
              <ArrowRight className={`w-5 h-5 ${isHebrew ? 'mr-2' : 'ml-2'}`} />
            </Button>
          </div>
        </div>
      </section>

      {/* ========================================
          WHY JOIN SECTION
      ======================================== */}
      <section className="py-16 lg:py-20 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('community.whyJoin.title')}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {t('community.whyJoin.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Benefit 1 */}
            <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-brand-main/5 to-transparent dark:from-brand-main/10 hover:shadow-lg transition-all">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-brand-main to-green-500 text-white mb-4">
                <Icon name="location" className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {t('community.whyJoin.benefits.discover.title')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t('community.whyJoin.benefits.discover.description')}
              </p>
            </div>

            {/* Benefit 2 */}
            <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-purple-500/5 to-transparent dark:from-purple-500/10 hover:shadow-lg transition-all">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white mb-4">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {t('community.whyJoin.benefits.connect.title')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t('community.whyJoin.benefits.connect.description')}
              </p>
            </div>

            {/* Benefit 3 */}
            <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-green-500/5 to-transparent dark:from-green-500/10 hover:shadow-lg transition-all">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-teal-500 text-white mb-4">
                <Camera className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {t('community.whyJoin.benefits.share.title')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t('community.whyJoin.benefits.share.description')}
              </p>
            </div>

            {/* Benefit 4 */}
            <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-yellow-500/5 to-transparent dark:from-yellow-500/10 hover:shadow-lg transition-all">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 text-white mb-4">
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {t('community.whyJoin.benefits.grow.title')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t('community.whyJoin.benefits.grow.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================
          FINAL CTA SECTION
      ======================================== */}
      <section className="py-20 lg:py-28 bg-gradient-to-br from-brand-main to-green-500 dark:from-brand-main/90 dark:to-green-500/90 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_0%,transparent_50%)]" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-semibold">
              {t('community.cta.badge')}
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            {t('community.cta.title')}
          </h2>

          <p className="text-xl md:text-2xl mb-8 opacity-90">
            {t('community.cta.subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="secondary" size="lg" className="bg-white text-brand-main hover:bg-gray-100 min-w-[200px]">
              <Send className={`w-5 h-5 ${isHebrew ? 'ml-2' : 'mr-2'}`} />
              {t('community.cta.getStarted')}
            </Button>
            <Button variant="outline" size="lg" className="border-white text-white hover:bg-white/10 min-w-[200px]">
              {t('community.cta.learnMore')}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

