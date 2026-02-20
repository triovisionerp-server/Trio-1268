/**
 * What's New - Recent Updates & Feature Releases
 * Shows all new features and improvements from last 5 days
 */
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Calendar, CheckCircle, Zap, Rocket, TrendingUp,
  MessageCircle, FileText, Camera, Smartphone, Bell, Download,
  BarChart3, Shield, Clock, Users, Package, ChevronRight,
  ExternalLink, Play
} from 'lucide-react';

interface Update {
  id: string;
  date: string;
  version: string;
  title: string;
  category: 'feature' | 'improvement' | 'fix';
  items: {
    icon: any;
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    link?: string;
  }[];
}

const RECENT_UPDATES: Update[] = [
  {
    id: '1',
    date: '2026-02-20',
    version: 'v2.5.0',
    title: '🚀 GAME-CHANGING RELEASE: AI & Mobile Features',
    category: 'feature',
    items: [
      {
        icon: TrendingUp,
        title: 'AI Predictive Analytics',
        description: 'Machine learning powered insights that predict stock shortages, demand surges, supplier delays, cost increases, and efficiency drops 14 days in advance. Includes confidence scoring and actionable recommendations.',
        impact: 'high',
        link: '/store'
      },
      {
        icon: MessageCircle,
        title: 'WhatsApp & SMS Notifications',
        description: 'Instant alerts via WhatsApp Business API and SMS. 8 pre-built templates for low stock, PO approvals, delivery delays, work order deadlines, and emergency broadcasts to management.',
        impact: 'high',
        link: '/admin/modules'
      },
      {
        icon: FileText,
        title: 'Professional PDF Generator',
        description: 'Generate branded PDFs for POs, invoices, delivery challans, work orders, and inventory reports. Includes GST calculations, signatures, terms & conditions, and custom branding.',
        impact: 'medium',
        link: '/purchase'
      },
      {
        icon: Camera,
        title: 'Barcode & QR Scanner',
        description: 'Camera-based scanning using device camera (no hardware needed!). Supports QR codes, Code 128, EAN-13, UPC. Auto-lookup materials in Firebase with visual feedback and continuous scan mode.',
        impact: 'high',
        link: '/empStore'
      },
      {
        icon: Smartphone,
        title: 'Progressive Web App (PWA)',
        description: 'Install ERP as native app on mobile/desktop. Full offline support with smart caching, push notifications, background sync, and app shortcuts. Works without internet connection.',
        impact: 'high'
      }
    ]
  },
  {
    id: '2',
    date: '2026-02-19',
    version: 'v2.4.0',
    title: '🎨 Enterprise Edition Release',
    category: 'feature',
    items: [
      {
        icon: Package,
        title: 'Module Registry System',
        description: '10+ production modules: Manufacturing, Inventory, Purchase, Quality, Sales, HR, Finance, Maintenance, Analytics, Integration Hub. Role-based access control and dynamic loading.',
        impact: 'high',
        link: '/admin/modules'
      },
      {
        icon: BarChart3,
        title: 'Advanced Analytics Dashboard',
        description: 'Real-time business intelligence with 8 KPI metrics, purchase trends, inventory distribution, and production overview. Time-range filters and interactive charts.',
        impact: 'medium',
        link: '/store'
      },
      {
        icon: Bell,
        title: 'Notification Center',
        description: 'Enterprise notification system with real-time Firebase sync, category filters, pin/unpin, mark read/unread, search, and action buttons.',
        impact: 'medium'
      },
      {
        icon: Zap,
        title: 'Workflow Automation Engine',
        description: 'Trigger-based automation with 3 pre-built templates: auto-approve POs <₹10k, low stock alerts, deadline reminders. Supports notification, email, webhook actions.',
        impact: 'high'
      }
    ]
  },
  {
    id: '3',
    date: '2026-02-18',
    version: 'v2.3.2',
    title: '🔧 Critical Bug Fixes',
    category: 'fix',
    items: [
      {
        icon: Shield,
        title: 'Authentication Fix',
        description: 'Resolved "expired limit" error caused by uid/id mismatch. Now stores both uid and id for backwards compatibility with legacy user objects.',
        impact: 'high'
      },
      {
        icon: CheckCircle,
        title: 'Firebase Query Optimization',
        description: 'Fixed composite index errors by using orderBy only and filtering status in memory. Improves query performance across PO approval workflows.',
        impact: 'medium'
      },
      {
        icon: CheckCircle,
        title: 'Runtime TypeError Fixes',
        description: 'Fixed 11 instances of unsafe toUpperCase() calls in PurchaseDynamic.tsx. Added fallback values for undefined urgency and status fields.',
        impact: 'medium'
      }
    ]
  },
  {
    id: '4',
    date: '2026-02-17',
    version: 'v2.3.0',
    title: '⚡ Performance Improvements',
    category: 'improvement',
    items: [
      {
        icon: Rocket,
        title: 'Build Optimization',
        description: 'Turbopack integration for 10x faster builds. Next.js 16.1.5 with optimized CSS. 46 routes compile in under 40 seconds.',
        impact: 'medium'
      },
      {
        icon: Clock,
        title: 'Real-time Sync Enhancement',
        description: 'Firebase long polling enabled for improved reliability. Onyx client implementation with 5-second latency optimization.',
        impact: 'low'
      },
      {
        icon: Users,
        title: 'User Experience Updates',
        description: 'Dark mode refinements, animations with Framer Motion, improved mobile responsiveness, loading states, and error handling.',
        impact: 'low'
      }
    ]
  }
];

const STATS = [
  { label: 'New Features', value: '13', icon: Sparkles, color: 'blue' },
  { label: 'Bug Fixes', value: '15', icon: CheckCircle, color: 'green' },
  { label: 'Code Added', value: '5.8K', icon: FileText, color: 'purple' },
  { label: 'Performance', value: '+300%', icon: Zap, color: 'yellow' }
];

export default function UpdatesPage() {
  const [filter, setFilter] = useState<'all' | 'feature' | 'improvement' | 'fix'>('all');

  const filteredUpdates = filter === 'all' 
    ? RECENT_UPDATES 
    : RECENT_UPDATES.filter(u => u.category === filter);

  const categoryColors = {
    feature: 'from-blue-500 to-purple-500',
    improvement: 'from-green-500 to-teal-500',
    fix: 'from-red-500 to-orange-500'
  };

  const categoryIcons = {
    feature: Rocket,
    improvement: TrendingUp,
    fix: Shield
  };

  const impactColors = {
    high: 'bg-red-500/20 text-red-400 border-red-500/50',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/50'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              What's New
            </h1>
            <p className="text-zinc-400 mt-1">Recent updates & feature releases (Last 5 days)</p>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {STATS.map((stat, index) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: 'from-blue-600 to-blue-700 border-blue-500',
            green: 'from-green-600 to-green-700 border-green-500',
            purple: 'from-purple-600 to-purple-700 border-purple-500',
            yellow: 'from-yellow-600 to-yellow-700 border-yellow-500'
          };
          
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-gradient-to-br ${colorClasses[stat.color as keyof typeof colorClasses]} border rounded-xl p-6 hover:scale-105 transition-transform`}
            >
              <div className="flex items-center justify-between mb-3">
                <Icon className="w-6 h-6 text-white/80" />
                <span className="text-3xl font-bold">{stat.value}</span>
              </div>
              <p className="text-sm text-white/80">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <span className="text-zinc-400 text-sm">Filter:</span>
        {(['all', 'feature', 'improvement', 'fix'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === cat
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Updates Timeline */}
      <div className="space-y-6">
        {filteredUpdates.map((update, updateIndex) => {
          const CategoryIcon = categoryIcons[update.category];
          
          return (
            <motion.div
              key={update.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: updateIndex * 0.1 }}
              className="relative"
            >
              {/* Timeline Line */}
              {updateIndex < filteredUpdates.length - 1 && (
                <div className="absolute left-7 top-16 w-0.5 h-full bg-zinc-800" />
              )}

              {/* Update Card */}
              <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors">
                {/* Header */}
                <div className="flex items-start gap-4 mb-6">
                  <div className={`p-3 bg-gradient-to-br ${categoryColors[update.category]} rounded-xl flex-shrink-0`}>
                    <CategoryIcon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded-full text-sm font-mono">
                        {update.version}
                      </span>
                      <span className="flex items-center gap-1 text-zinc-500 text-sm">
                        <Calendar className="w-4 h-4" />
                        {new Date(update.date).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold mb-1">{update.title}</h2>
                    <p className="text-zinc-400 text-sm capitalize">
                      {update.items.length} {update.category === 'feature' ? 'new features' : update.category === 'improvement' ? 'improvements' : 'bug fixes'}
                    </p>
                  </div>
                </div>

                {/* Items */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-16">
                  {update.items.map((item, itemIndex) => {
                    const ItemIcon = item.icon;
                    
                    return (
                      <motion.div
                        key={itemIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: updateIndex * 0.1 + itemIndex * 0.05 }}
                        className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 hover:border-zinc-600 transition-colors group cursor-pointer"
                        onClick={() => item.link && window.location.href = item.link}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className="p-2 bg-blue-500/20 rounded-lg">
                            <ItemIcon className="w-5 h-5 text-blue-400" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold group-hover:text-blue-400 transition-colors">
                                {item.title}
                              </h3>
                              {item.link && (
                                <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-blue-400 transition-colors" />
                              )}
                            </div>
                            <span className={`inline-block px-2 py-0.5 rounded text-xs border ${impactColors[item.impact]} mb-2`}>
                              {item.impact.toUpperCase()} IMPACT
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-zinc-400 leading-relaxed">
                          {item.description}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Links */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-12 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/50 rounded-xl p-8"
      >
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Play className="w-6 h-6 text-blue-400" />
          Try New Features
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/store"
            className="flex items-center gap-3 p-4 bg-zinc-900/80 hover:bg-zinc-800 rounded-lg transition-colors group"
          >
            <TrendingUp className="w-8 h-8 text-purple-400 group-hover:scale-110 transition-transform" />
            <div>
              <p className="font-semibold">AI Predictions</p>
              <p className="text-sm text-zinc-400">View ML insights</p>
            </div>
          </a>
          <a
            href="/empStore"
            className="flex items-center gap-3 p-4 bg-zinc-900/80 hover:bg-zinc-800 rounded-lg transition-colors group"
          >
            <Camera className="w-8 h-8 text-blue-400 group-hover:scale-110 transition-transform" />
            <div>
              <p className="font-semibold">Scan Barcode</p>
              <p className="text-sm text-zinc-400">Quick material lookup</p>
            </div>
          </a>
          <a
            href="/purchase"
            className="flex items-center gap-3 p-4 bg-zinc-900/80 hover:bg-zinc-800 rounded-lg transition-colors group"
          >
            <Download className="w-8 h-8 text-green-400 group-hover:scale-110 transition-transform" />
            <div>
              <p className="font-semibold">Generate PDF</p>
              <p className="text-sm text-zinc-400">Professional reports</p>
            </div>
          </a>
        </div>
      </motion.div>

      {/* Documentation Link */}
      <div className="mt-8 text-center">
        <a
          href="https://github.com/triovisionerp-server/Trio-1268"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          View Complete Documentation on GitHub
        </a>
      </div>
    </div>
  );
}
