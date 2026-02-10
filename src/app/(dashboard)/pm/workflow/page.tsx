'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, User, Package, Layers,
  AlertTriangle, CheckCircle, Target, SendHorizontal
} from 'lucide-react';

// ========================================
// WORKFLOW STATUS
// ========================================
type WorkflowStatus =
  | 'draft'
  | 'pm_review'
  | 'cross_dept_review'
  | 'pm_revision'
  | 'md_approval'
  | 'approved'
  | 'rejected'
  | 'in_production';

// ========================================
// INTERFACES
// ========================================
interface CustomerRequirement {
  customerName: string;
  projectName: string;
  projectNumber: string;
  startDate: string;
  endDate: string;
  patternMaterial: string;
  deliverables: string;
  process: string;
  description: string;
  targetCost?: number;
  quantity?: number;
  paymentTerms?: string;
}

interface FeasibilityCheck {
  machinesAvailable: boolean | null;
  machinesNotes: string;
  toolingAvailable: boolean | null;
  toolingNotes: string;
  manpowerAvailable: boolean | null;
  manpowerNotes: string;
  materialsAvailable: boolean | null;
  materialsNotes: string;
  timelineRealistic: boolean | null;
  timelineNotes: string;
  roughCostEstimate: number;
  overallFeasible: boolean | null;
  risksIdentified: string;
  recommendations: string;
}

interface WBSStage {
  id: string;
  stageName: string;
  responsiblePerson: string;
  startDate: string;
  endDate: string;
  status: 'not_started' | 'in_progress' | 'completed';
  notes: string;
}

interface Risk {
  id: string;
  description: string;
  impact: 'High' | 'Medium' | 'Low';
  probability: 'High' | 'Medium' | 'Low';
  mitigation: string;
  owner: string;
  status: 'open' | 'mitigated' | 'closed';
}

interface BOMItem {
  id: string;
  category: 'Material' | 'Tooling' | 'Manpower' | 'Machine';
  itemName: string;
  specification: string;
  quantity: number;
  unit: string;
  wastagePercent: number;
  netQuantity: number;
  unitCost: number;
  totalCost: number;
  supplier: string;
  leadTime: string;
  notes: string;
}

interface DepartmentReview {
  department: 'Design' | 'Production' | 'Purchase' | 'Store';
  reviewer: string;
  status: 'pending' | 'approved' | 'rejected' | 'revision_needed';
  comments: string;
  reviewedAt?: string;
}

interface MDDecision {
  status: 'approved' | 'rejected' | 'revision_required';
  approver: string;
  comments: string;
  decidedAt: string;
}

interface ProjectWorkflow {
  id: string;
  workflowStatus: WorkflowStatus;
  customerRequirement: CustomerRequirement;
  feasibilityReport: FeasibilityCheck;
  wbs: WBSStage[];
  riskRegister: Risk[];
  bom: BOMItem[];
  departmentReviews: DepartmentReview[];
  mdDecision?: MDDecision;
  estimatedTotalCost: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ========================================
// MAIN COMPONENT
// ========================================
export default function ProjectWorkflowManager() {
  const [currentStep, setCurrentStep] = useState(1);
  const [workflow, setWorkflow] = useState<ProjectWorkflow>(() => ({
    id: `PRJ-${Date.now()}`,
    workflowStatus: 'draft',
    customerRequirement: {
      customerName: '',
      projectName: '',
      projectNumber: '',
      startDate: '',
      endDate: '',
      patternMaterial: '',
      deliverables: '',
      process: '',
      description: ''
    },
    feasibilityReport: {
      machinesAvailable: null,
      machinesNotes: '',
      toolingAvailable: null,
      toolingNotes: '',
      manpowerAvailable: null,
      manpowerNotes: '',
      materialsAvailable: null,
      materialsNotes: '',
      timelineRealistic: null,
      timelineNotes: '',
      roughCostEstimate: 0,
      overallFeasible: null,
      risksIdentified: '',
      recommendations: ''
    },
    wbs: [],
    riskRegister: [],
    bom: [],
    departmentReviews: [
      { department: 'Design', reviewer: '', status: 'pending', comments: '' },
      { department: 'Production', reviewer: '', status: 'pending', comments: '' },
      { department: 'Purchase', reviewer: '', status: 'pending', comments: '' },
      { department: 'Store', reviewer: '', status: 'pending', comments: '' }
    ],
    estimatedTotalCost: 0,
    createdBy: 'PM User', // TODO: Get from auth
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));

  // Calculate total cost from BOM - computed value (will be used in Step 6)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const estimatedTotalCost = workflow.bom.reduce((sum, item) => sum + item.totalCost, 0);

  const steps = [
    { number: 1, title: 'Customer Requirements', icon: User },
    { number: 2, title: 'Feasibility Study', icon: Target },
    { number: 3, title: 'WBS Planning', icon: Layers },
    { number: 4, title: 'Risk Register', icon: AlertTriangle },
    { number: 5, title: 'BOM Creation', icon: Package },
    { number: 6, title: 'Review & Submit', icon: SendHorizontal }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center">
          <ClipboardList className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Project Workflow Manager</h1>
          <p className="text-zinc-400">Customer Requirements → Feasibility → Planning → Approval</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;

            return (
              <React.Fragment key={step.number}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                      isCompleted
                        ? 'bg-green-600 border-green-600'
                        : isActive
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6 text-white" />
                    ) : (
                      <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-zinc-600'}`} />
                    )}
                  </div>
                  <p className={`text-xs mt-2 text-center ${isActive ? 'text-white font-medium' : 'text-zinc-500'}`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? 'bg-green-600' : 'bg-white/10'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {currentStep === 1 && (
          <CustomerRequirementsStep workflow={workflow} setWorkflow={setWorkflow} />
        )}
        {currentStep === 2 && <FeasibilityStudyStep workflow={workflow} setWorkflow={setWorkflow} />}
        {currentStep === 3 && <WBSPlanningStep workflow={workflow} setWorkflow={setWorkflow} />}
        {currentStep === 4 && <RiskRegisterStep workflow={workflow} setWorkflow={setWorkflow} />}
        {currentStep === 5 && <BOMCreationStep workflow={workflow} setWorkflow={setWorkflow} />}
        {currentStep === 6 && <ReviewSubmitStep workflow={workflow} />}
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <button
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
          className="px-6 py-3 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl transition-all"
        >
          Previous
        </button>
        <button
          onClick={() => setCurrentStep(Math.min(6, currentStep + 1))}
          disabled={currentStep === 6}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl transition-all"
        >
          {currentStep === 6 ? 'Submit for Review' : 'Next'}
        </button>
      </div>
    </div>
  );
}

// ========================================
// STEP 1: CUSTOMER REQUIREMENTS
// ========================================
function CustomerRequirementsStep({
  workflow,
  setWorkflow
}: {
  workflow: ProjectWorkflow;
  setWorkflow: React.Dispatch<React.SetStateAction<ProjectWorkflow>>;
}) {
  const handleChange = (field: keyof CustomerRequirement, value: string | number) => {
    setWorkflow(prev => ({
      ...prev,
      customerRequirement: { ...prev.customerRequirement, [field]: value }
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-white/5 border border-white/10 rounded-2xl p-8"
    >
      <h2 className="text-2xl font-bold text-white mb-6">Step 1: Customer Requirements</h2>
      <p className="text-zinc-400 mb-8">
        Enter the customer&apos;s project requirements received from Sales/Business team
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="text-sm text-zinc-400 font-medium mb-2 block">Customer Name *</label>
          <input
            type="text"
            value={workflow.customerRequirement.customerName}
            onChange={(e) => handleChange('customerName', e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500 outline-none"
            placeholder="Enter customer name"
          />
        </div>

        <div>
          <label className="text-sm text-zinc-400 font-medium mb-2 block">Project Name *</label>
          <input
            type="text"
            value={workflow.customerRequirement.projectName}
            onChange={(e) => handleChange('projectName', e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500 outline-none"
            placeholder="Enter project name"
          />
        </div>

        <div>
          <label className="text-sm text-zinc-400 font-medium mb-2 block">Project Number</label>
          <input
            type="text"
            value={workflow.customerRequirement.projectNumber}
            onChange={(e) => handleChange('projectNumber', e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500 outline-none"
            placeholder="PRJ-XXX"
          />
        </div>

        <div>
          <label className="text-sm text-zinc-400 font-medium mb-2 block">Quantity</label>
          <input
            type="number"
            value={workflow.customerRequirement.quantity || ''}
            onChange={(e) => handleChange('quantity', parseInt(e.target.value) || 0)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500 outline-none"
            placeholder="Number of units"
          />
        </div>

        <div>
          <label className="text-sm text-zinc-400 font-medium mb-2 block">Start Date *</label>
          <input
            type="date"
            value={workflow.customerRequirement.startDate}
            onChange={(e) => handleChange('startDate', e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="text-sm text-zinc-400 font-medium mb-2 block">Delivery Date *</label>
          <input
            type="date"
            value={workflow.customerRequirement.endDate}
            onChange={(e) => handleChange('endDate', e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="text-sm text-zinc-400 font-medium mb-2 block">Pattern Material</label>
          <select
            value={workflow.customerRequirement.patternMaterial}
            onChange={(e) => handleChange('patternMaterial', e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500 outline-none"
          >
            <option value="">-- Select --</option>
            <option value="PU Block">PU Block (High Density)</option>
            <option value="PS Foam">PS Foam with Tooling Paste</option>
            <option value="MDF">MDF (Standard)</option>
            <option value="Aluminum">Aluminum</option>
          </select>
        </div>

        <div>
          <label className="text-sm text-zinc-400 font-medium mb-2 block">Deliverables</label>
          <select
            value={workflow.customerRequirement.deliverables}
            onChange={(e) => handleChange('deliverables', e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500 outline-none"
          >
            <option value="">-- Select --</option>
            <option value="Master Pattern">Master Pattern</option>
            <option value="Direct Mould">Direct Mould</option>
            <option value="Both">Both</option>
            <option value="Finished Product">Finished Product</option>
          </select>
        </div>

        <div>
          <label className="text-sm text-zinc-400 font-medium mb-2 block">Manufacturing Process</label>
          <select
            value={workflow.customerRequirement.process}
            onChange={(e) => handleChange('process', e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500 outline-none"
          >
            <option value="">-- Select --</option>
            <option value="Hand Layup">Hand Layup</option>
            <option value="Vacuum Infusion">Vacuum Infusion</option>
            <option value="RTM">RTM (Resin Transfer Molding)</option>
            <option value="Compression Molding">Compression Molding</option>
          </select>
        </div>

        <div>
          <label className="text-sm text-zinc-400 font-medium mb-2 block">Target Cost (if provided)</label>
          <input
            type="number"
            value={workflow.customerRequirement.targetCost || ''}
            onChange={(e) => handleChange('targetCost', parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500 outline-none"
            placeholder="₹ 0"
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-sm text-zinc-400 font-medium mb-2 block">Description / Requirements</label>
          <textarea
            value={workflow.customerRequirement.description}
            onChange={(e) => handleChange('description', e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500 outline-none"
            rows={4}
            placeholder="Technical specifications, special requirements, drawings reference, etc."
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-sm text-zinc-400 font-medium mb-2 block">Payment Terms</label>
          <input
            type="text"
            value={workflow.customerRequirement.paymentTerms || ''}
            onChange={(e) => handleChange('paymentTerms', e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500 outline-none"
            placeholder="e.g., 30% advance, 40% on progress, 30% on delivery"
          />
        </div>
      </div>

      <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <p className="text-blue-400 text-sm">
          <strong>Note:</strong> This information is received from Sales/Business team after customer order confirmation.
        </p>
      </div>
    </motion.div>
  );
}

// ========================================
// STEP 2: FEASIBILITY STUDY
// ========================================
function FeasibilityCheckbox({
  label,
  field,
  notesField,
  workflow,
  updateFeasibility
}: {
  label: string;
  field: keyof FeasibilityCheck;
  notesField: keyof FeasibilityCheck;
  workflow: ProjectWorkflow;
  updateFeasibility: (field: keyof FeasibilityCheck, value: boolean | string | number) => void;
}) {
  return (
    <div className="bg-white/5 rounded-xl p-4">
      <p className="text-white font-medium mb-3">{label}</p>
      <div className="flex gap-3 mb-3">
        <button
          onClick={() => updateFeasibility(field, true)}
          className={`flex-1 py-2 rounded-lg transition-all ${
            workflow.feasibilityReport[field] === true
              ? 'bg-green-600 text-white'
              : 'bg-white/5 text-zinc-400 hover:bg-white/10'
          }`}
        >
          ✓ Yes
        </button>
        <button
          onClick={() => updateFeasibility(field, false)}
          className={`flex-1 py-2 rounded-lg transition-all ${
            workflow.feasibilityReport[field] === false
              ? 'bg-red-600 text-white'
              : 'bg-white/5 text-zinc-400 hover:bg-white/10'
          }`}
        >
          ✗ No
        </button>
      </div>
      <textarea
        value={workflow.feasibilityReport[notesField] as string}
        onChange={(e) => updateFeasibility(notesField, e.target.value)}
        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
        rows={2}
        placeholder="Details / Notes..."
      />
    </div>
  );
}

function FeasibilityStudyStep({
  workflow,
  setWorkflow
}: {
  workflow: ProjectWorkflow;
  setWorkflow: React.Dispatch<React.SetStateAction<ProjectWorkflow>>;
}) {
  const updateFeasibility = (field: keyof FeasibilityCheck, value: boolean | string | number) => {
    setWorkflow(prev => ({
      ...prev,
      feasibilityReport: { ...prev.feasibilityReport, [field]: value }
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-white/5 border border-white/10 rounded-2xl p-8"
    >
      <h2 className="text-2xl font-bold text-white mb-6">Step 2: Feasibility Study</h2>
      <p className="text-zinc-400 mb-8">
        Check if the project is feasible with current resources (PM + Design + Production)
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <FeasibilityCheckbox
          label="✓ Required Machines Available?"
          field="machinesAvailable"
          notesField="machinesNotes"
          workflow={workflow}
          updateFeasibility={updateFeasibility}
        />

        <FeasibilityCheckbox
          label="✓ Tooling/Mold Available?"
          field="toolingAvailable"
          notesField="toolingNotes"
          workflow={workflow}
          updateFeasibility={updateFeasibility}
        />

        <FeasibilityCheckbox
          label="✓ Skilled Manpower Available?"
          field="manpowerAvailable"
          notesField="manpowerNotes"
          workflow={workflow}
          updateFeasibility={updateFeasibility}
        />

        <FeasibilityCheckbox
          label="✓ Required Materials Available?"
          field="materialsAvailable"
          notesField="materialsNotes"
          workflow={workflow}
          updateFeasibility={updateFeasibility}
        />

        <div className="md:col-span-2">
          <FeasibilityCheckbox
            label="✓ Is Timeline Realistic?"
            field="timelineRealistic"
            notesField="timelineNotes"
            workflow={workflow}
            updateFeasibility={updateFeasibility}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="text-sm text-zinc-400 font-medium mb-2 block">Rough Cost Estimate (₹)</label>
          <input
            type="number"
            value={workflow.feasibilityReport.roughCostEstimate}
            onChange={(e) => updateFeasibility('roughCostEstimate', parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500 outline-none"
            placeholder="Initial cost estimate"
          />
        </div>

        <div>
          <label className="text-sm text-zinc-400 font-medium mb-2 block">Overall Feasible?</label>
          <div className="flex gap-3">
            <button
              onClick={() => updateFeasibility('overallFeasible', true)}
              className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                workflow.feasibilityReport.overallFeasible === true
                  ? 'bg-green-600 text-white'
                  : 'bg-white/5 text-zinc-400 hover:bg-white/10'
              }`}
            >
              ✅ Feasible
            </button>
            <button
              onClick={() => updateFeasibility('overallFeasible', false)}
              className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                workflow.feasibilityReport.overallFeasible === false
                  ? 'bg-red-600 text-white'
                  : 'bg-white/5 text-zinc-400 hover:bg-white/10'
              }`}
            >
              ❌ Not Feasible
            </button>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="text-sm text-zinc-400 font-medium mb-2 block">Risks Identified</label>
          <textarea
            value={workflow.feasibilityReport.risksIdentified}
            onChange={(e) => updateFeasibility('risksIdentified', e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500 outline-none"
            rows={3}
            placeholder="List potential risks: delays, material shortage, technical challenges, etc."
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-sm text-zinc-400 font-medium mb-2 block">Recommendations</label>
          <textarea
            value={workflow.feasibilityReport.recommendations}
            onChange={(e) => updateFeasibility('recommendations', e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500 outline-none"
            rows={3}
            placeholder="Your recommendations for proceeding with this project"
          />
        </div>
      </div>

      {workflow.feasibilityReport.overallFeasible === false && (
        <div className="mt-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 font-medium">
            ⚠️ Project marked as NOT FEASIBLE. Consider stopping here or renegotiating with customer.
          </p>
        </div>
      )}
    </motion.div>
  );
}

// ========================================
// STEP 3 & 4 & 5: Placeholder for now
// ========================================
function WBSPlanningStep({
  workflow,
  setWorkflow
}: {
  workflow: ProjectWorkflow;
  setWorkflow: React.Dispatch<React.SetStateAction<ProjectWorkflow>>;
}) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = { workflow, setWorkflow };
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-white/5 border border-white/10 rounded-2xl p-8"
    >
      <h2 className="text-2xl font-bold text-white mb-4">Step 3: WBS Planning</h2>
      <p className="text-zinc-400">Work Breakdown Structure builder - Coming next...</p>
    </motion.div>
  );
}

function RiskRegisterStep({
  workflow,
  setWorkflow
}: {
  workflow: ProjectWorkflow;
  setWorkflow: React.Dispatch<React.SetStateAction<ProjectWorkflow>>;
}) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = { workflow, setWorkflow };
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-white/5 border border-white/10 rounded-2xl p-8"
    >
      <h2 className="text-2xl font-bold text-white mb-4">Step 4: Risk Register</h2>
      <p className="text-zinc-400">Risk identification and mitigation - Coming next...</p>
    </motion.div>
  );
}

function BOMCreationStep({
  workflow,
  setWorkflow
}: {
  workflow: ProjectWorkflow;
  setWorkflow: React.Dispatch<React.SetStateAction<ProjectWorkflow>>;
}) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = { workflow, setWorkflow };
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-white/5 border border-white/10 rounded-2xl p-8"
    >
      <h2 className="text-2xl font-bold text-white mb-4">Step 5: BOM Creation</h2>
      <p className="text-zinc-400">Bill of Materials builder - Coming next...</p>
    </motion.div>
  );
}

function ReviewSubmitStep({ workflow }: { workflow: ProjectWorkflow }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = workflow;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-white/5 border border-white/10 rounded-2xl p-8"
    >
      <h2 className="text-2xl font-bold text-white mb-4">Step 6: Review & Submit</h2>
      <p className="text-zinc-400">Final review and submission - Coming next...</p>
    </motion.div>
  );
}
