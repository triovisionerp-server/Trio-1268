'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, CheckCircle, XCircle, Package, 
  Calendar, TrendingUp, AlertCircle, FileText, LucideIcon
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/useAuthStore';

// --- TYPES ---
type DeliveryStatus = { status: string; days: number; color: string } | null;

type StatCardProps = {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
};

type ProjectCardProps = {
  project: CustomerProject;
  onViewDetails: () => void;
  deliveryStatus: DeliveryStatus;
};

interface CustomerProject {
  id: string;
  docNo: string;
  customerName: string;
  projectName: string;
  projectNumber: string;
  description: string;
  quantity: number;
  targetCost: number;
  deliverables: string;
  process: string;
  startDate: string;
  deliveryDate: string;
  originalDeliveryDate: string;
  status: 'Customer Requirements' | 'Under PM Review' | 'BOM Creation' | 'Approved' | 'In Production' | 'Completed' | 'Rejected';
  progress: number;
  createdAt: string;
  updatedAt: string;
  pmNotes?: string;
  rejectionReason?: string;
  delayDays?: number;
  completedStages?: string[];
  totalStages?: number;
  paymentTerms?: string;
}

const STATUS_COLORS = {
  'Customer Requirements': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'Under PM Review': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  'BOM Creation': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'Approved': 'bg-green-500/20 text-green-300 border-green-500/30',
  'In Production': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'Completed': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'Rejected': 'bg-red-500/20 text-red-300 border-red-500/30',
};

export default function CustomerDashboard() {
  const { user, initializeUser } = useAuthStore();
  const [projects, setProjects] = useState<CustomerProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<CustomerProject | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'in-progress' | 'completed'>('all');

  // Initialize user from localStorage on mount
  useEffect(() => {
    initializeUser();
  }, [initializeUser]);

  // Get user email from store or localStorage
  const userEmail = useMemo(() => {
    if (user?.email) return user.email;
    
    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      try {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          return parsed.email;
        }
      } catch (error) {
        console.error('Error reading user email:', error);
      }
    }
    return null;
  }, [user]);

  // Real-time listener for customer's projects with dynamic imports
  useEffect(() => {
    if (!userEmail) {
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    // Dynamic Firebase import for better performance
    (async () => {
      try {
        const [{ db }, { collection, query, where, orderBy, onSnapshot }] = await Promise.all([
          import('@/lib/firebase/client'),
          import('firebase/firestore')
        ]);

        const q = query(
          collection(db, 'customer_requirements'),
          where('customerEmail', '==', userEmail),
          orderBy('createdAt', 'desc')
        );

        unsubscribe = onSnapshot(q, (snapshot) => {
          const projectData: CustomerProject[] = [];
          snapshot.forEach((doc) => {
            projectData.push({ id: doc.id, ...doc.data() } as CustomerProject);
          });
          setProjects(projectData);
          setLoading(false);
        });
      } catch (error) {
        console.error('Failed to load projects:', error);
        setLoading(false);
      }
    })();

    return () => unsubscribe?.();
  }, [userEmail]);

  // Memoize filtered projects to avoid recalculating on every render
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      if (filter === 'all') return true;
      if (filter === 'pending') return ['Customer Requirements', 'Under PM Review', 'BOM Creation'].includes(project.status);
      if (filter === 'approved') return project.status === 'Approved';
      if (filter === 'in-progress') return project.status === 'In Production';
      if (filter === 'completed') return project.status === 'Completed';
      return true;
    });
  }, [projects, filter]);

  // Memoize statistics to avoid recalculating on every render
  const stats = useMemo(() => {
    return {
      total: projects.length,
      pending: projects.filter(p => ['Customer Requirements', 'Under PM Review', 'BOM Creation'].includes(p.status)).length,
      approved: projects.filter(p => p.status === 'Approved').length,
      inProgress: projects.filter(p => p.status === 'In Production').length,
      completed: projects.filter(p => p.status === 'Completed').length,
      rejected: projects.filter(p => p.status === 'Rejected').length,
    };
  }, [projects]);

  // Calculate delivery status
  const calculateDeliveryStatus = (project: CustomerProject) => {
    if (!project.deliveryDate) return null;
    
    const today = new Date();
    const deliveryDate = new Date(project.deliveryDate);
    const daysUntilDelivery = Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (project.status === 'Completed') return { status: 'delivered', days: 0, color: 'text-green-400' };
    if (daysUntilDelivery < 0) return { status: 'overdue', days: Math.abs(daysUntilDelivery), color: 'text-red-400' };
    if (daysUntilDelivery <= 7) return { status: 'urgent', days: daysUntilDelivery, color: 'text-yellow-400' };
    return { status: 'on-track', days: daysUntilDelivery, color: 'text-green-400' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-8 w-64 bg-white/10 rounded-lg mb-2 animate-pulse"></div>
          <div className="h-4 w-96 bg-white/5 rounded-lg animate-pulse"></div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white/5 rounded-xl border border-white/10 p-4 animate-pulse">
              <div className="h-5 w-5 bg-white/10 rounded mb-2"></div>
              <div className="h-4 w-16 bg-white/10 rounded"></div>
            </div>
          ))}
        </div>

        {/* Filter Skeleton */}
        <div className="flex gap-2 mb-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 w-32 bg-white/5 rounded-lg animate-pulse"></div>
          ))}
        </div>

        {/* Cards Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white/5 rounded-xl border border-white/10 p-6 animate-pulse">
              <div className="h-6 w-48 bg-white/10 rounded mb-2"></div>
              <div className="h-4 w-32 bg-white/10 rounded mb-4"></div>
              <div className="h-16 w-full bg-white/10 rounded mb-4"></div>
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-12 bg-white/10 rounded"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show message if no user email found
  if (!userEmail) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="text-center">
          <Package className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Unable to Load Dashboard</h3>
          <p className="text-zinc-400 mb-4">
            Please log in again to access your projects.
          </p>
          <a 
            href="/login" 
            className="inline-block px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-lg transition-colors"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          My Projects Dashboard
        </h1>
        <p className="text-zinc-400">
          Track your project requests and production progress
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard label="Total Projects" value={stats.total} icon={Package} color="bg-blue-500/10 border-blue-500/30" />
        <StatCard label="Pending Review" value={stats.pending} icon={Clock} color="bg-yellow-500/10 border-yellow-500/30" />
        <StatCard label="Approved" value={stats.approved} icon={CheckCircle} color="bg-green-500/10 border-green-500/30" />
        <StatCard label="In Production" value={stats.inProgress} icon={TrendingUp} color="bg-cyan-500/10 border-cyan-500/30" />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle} color="bg-emerald-500/10 border-emerald-500/30" />
        <StatCard label="Rejected" value={stats.rejected} icon={XCircle} color="bg-red-500/10 border-red-500/30" />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[
          { key: 'all', label: 'All Projects' },
          { key: 'pending', label: 'Pending Review' },
          { key: 'approved', label: 'Approved' },
          { key: 'in-progress', label: 'In Production' },
          { key: 'completed', label: 'Completed' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as typeof filter)}
            className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              filter === tab.key
                ? 'bg-cyan-500 text-white'
                : 'bg-white/5 text-zinc-400 hover:bg-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Projects Grid */}
      <AnimatePresence>
        {filteredProjects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white/5 rounded-xl border border-white/10 p-12 text-center"
          >
            <Package className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Projects Found</h3>
            <p className="text-zinc-400">
              {filter === 'all' 
                ? "You haven't submitted any project requirements yet."
                : `No projects with ${filter} status.`}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onViewDetails={() => setSelectedProject(project)}
                deliveryStatus={calculateDeliveryStatus(project)}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Project Details Modal */}
      <AnimatePresence>
        {selectedProject && (
          <ProjectDetailsModal
            project={selectedProject}
            onClose={() => setSelectedProject(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- STAT CARD COMPONENT ---
function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className={`${color} rounded-xl border p-4`}>

      <div className="flex items-center justify-between mb-2">
        <Icon className="w-5 h-5 text-white/70" />
        <span className="text-2xl font-bold text-white">{value}</span>
      </div>
      <p className="text-sm text-white/60">{label}</p>
    </div>
  );
}

// --- PROJECT CARD COMPONENT ---
function ProjectCard({ project, onViewDetails, deliveryStatus }: ProjectCardProps) {
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-white/5 rounded-xl border border-white/10 p-6 hover:bg-white/[0.07] transition-all cursor-pointer"
      onClick={onViewDetails}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">{project.projectName}</h3>
          <p className="text-sm text-zinc-400">{project.docNo}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[project.status as keyof typeof STATUS_COLORS]}`}>
          {project.status}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-zinc-300 mb-4 line-clamp-2">
        {project.description || 'No description provided'}
      </p>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-xs text-zinc-500 mb-1">Quantity</p>
          <p className="text-sm font-medium text-white">{project.quantity} units</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-1">Process</p>
          <p className="text-sm font-medium text-white">{project.process}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-1">Deliverables</p>
          <p className="text-sm font-medium text-white">{project.deliverables}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-1">Target Cost</p>
          <p className="text-sm font-medium text-white">₹{project.targetCost?.toLocaleString() || 'N/A'}</p>
        </div>
      </div>

      {/* Progress Bar (Only show if in production or completed) */}
      {['In Production', 'Completed'].includes(project.status) && (
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-zinc-400">Progress</span>
            <span className="text-white font-medium">{project.progress || 0}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div
              style={{ width: `${project.progress || 0}%` }}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-300"
            />
          </div>
        </div>
      )}

      {/* Delivery Status */}
      {deliveryStatus && deliveryStatus.status !== 'delivered' && (
        <div className={`flex items-center gap-2 text-sm ${deliveryStatus.color}`}>
          <Calendar className="w-4 h-4" />
          {deliveryStatus.status === 'overdue' && (
            <span>Overdue by {deliveryStatus.days} days</span>
          )}
          {deliveryStatus.status === 'urgent' && (
            <span>Due in {deliveryStatus.days} days</span>
          )}
          {deliveryStatus.status === 'on-track' && (
            <span>On track - {deliveryStatus.days} days remaining</span>
          )}
        </div>
      )}

      {/* Rejection Reason */}
      {project.status === 'Rejected' && project.rejectionReason && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium">Reason: </span>
            {project.rejectionReason}
          </p>
        </div>
      )}
    </motion.div>
  );
}

// --- PROJECT DETAILS MODAL ---
function ProjectDetailsModal({ project, onClose }: { project: CustomerProject; onClose: () => void }) {
  const calculateDelayDays = () => {
    if (!project.originalDeliveryDate || !project.deliveryDate) return 0;
    const original = new Date(project.originalDeliveryDate);
    const current = new Date(project.deliveryDate);
    return Math.ceil((current.getTime() - original.getTime()) / (1000 * 60 * 60 * 24));
  };

  const delayDays = calculateDelayDays();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="bg-zinc-900 rounded-2xl border border-white/20 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 border-b border-white/10 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{project.projectName}</h2>
              <p className="text-zinc-400">{project.docNo}</p>
            </div>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
          <div className={`mt-4 inline-block px-4 py-2 rounded-full text-sm font-medium border ${STATUS_COLORS[project.status as keyof typeof STATUS_COLORS]}`}>
            {project.status}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Project Information */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              Project Information
            </h3>
            <div className="bg-white/5 rounded-lg p-4 space-y-3">
              <InfoRow label="Project Number" value={project.projectNumber} />
              <InfoRow label="Description" value={project.description || 'N/A'} />
              <InfoRow label="Quantity" value={`${project.quantity} units`} />
              <InfoRow label="Target Cost" value={`₹${project.targetCost?.toLocaleString() || 'N/A'}`} />
              <InfoRow label="Payment Terms" value={project.paymentTerms || 'N/A'} />
              <InfoRow label="Process" value={project.process} />
              <InfoRow label="Deliverables" value={project.deliverables} />
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-400" />
              Timeline
            </h3>
            <div className="bg-white/5 rounded-lg p-4 space-y-3">
              <InfoRow label="Start Date" value={project.startDate || 'Not set'} />
              <InfoRow 
                label="Delivery Date" 
                value={project.deliveryDate || 'Not set'}
                highlight={delayDays > 0}
              />
              {delayDays > 0 && (
                <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  <span className="text-sm text-yellow-300">
                    Delivery date extended by {delayDays} days
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Tracking */}
          {['In Production', 'Completed'].includes(project.status) && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                Progress Tracking
              </h3>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-zinc-400">Overall Progress</span>
                    <span className="text-white font-medium">{project.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                    <div
                      style={{ width: `${project.progress || 0}%` }}
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-300"
                    />
                  </div>
                </div>
                {project.completedStages && project.completedStages.length > 0 && (
                  <div>
                    <p className="text-sm text-zinc-400 mb-2">Completed Stages:</p>
                    <div className="space-y-2">
                      {project.completedStages.map((stage: string, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-green-300">
                          <CheckCircle className="w-4 h-4" />
                          <span>{stage}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PM Notes */}
          {project.pmNotes && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                PM Notes
              </h3>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-sm text-blue-200">{project.pmNotes}</p>
              </div>
            </div>
          )}

          {/* Rejection Reason */}
          {project.status === 'Rejected' && project.rejectionReason && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                Rejection Reason
              </h3>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-sm text-red-200">{project.rejectionReason}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-zinc-900 border-t border-white/10 p-6">
          <button
            onClick={onClose}
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-3 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// --- INFO ROW COMPONENT ---
function InfoRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className={`text-sm font-medium ${highlight ? 'text-yellow-300' : 'text-white'}`}>
        {value}
      </span>
    </div>
  );
}
