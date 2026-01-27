"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft, Users, UserCheck, UserMinus, UserPlus, Search,
  AlertTriangle, Shuffle, Save, X, ChevronDown, ChevronUp,
  Briefcase, Calendar, Phone, Mail
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// ==================== TYPES ====================
interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  photo?: string;
  homeDepartment: string; // Primary assigned department
  currentDepartment: string; // Where they're currently working
  role: string;
  skills: string[];
  status: "active" | "on-leave" | "training";
  joinDate: string;
  experience: string;
}

interface Department {
  id: string;
  name: string;
  supervisor: string;
  color: string;
  icon: string;
}

// ==================== MOCK DATA ====================
const DEPARTMENTS: Department[] = [
  { id: "stock-building", name: "Stock Building", supervisor: "Rajesh Kumar", color: "blue", icon: "📦" },
  { id: "machining", name: "Machining", supervisor: "Amit Sharma", color: "emerald", icon: "⚙️" },
  { id: "pattern-finishing", name: "Pattern Finishing", supervisor: "Suresh Patel", color: "purple", icon: "🎨" },
  { id: "lamination", name: "Lamination", supervisor: "Vikram Singh", color: "orange", icon: "🔧" },
  { id: "mold-finishing", name: "Mold Finishing", supervisor: "Deepak Verma", color: "cyan", icon: "🔩" },
  { id: "welding", name: "Welding", supervisor: "Manoj Tiwari", color: "red", icon: "🔥" },
  { id: "assembly", name: "Assembly", supervisor: "Arun Gupta", color: "green", icon: "🏭" },
  { id: "cmm", name: "CMM", supervisor: "Pradeep Rao", color: "indigo", icon: "📐" },
  { id: "trimline", name: "Trimline", supervisor: "Sanjay Mishra", color: "pink", icon: "✂️" },
  { id: "quality", name: "Quality", supervisor: "Rahul Joshi", color: "yellow", icon: "✅" },
  { id: "maintenance", name: "Maintenance", supervisor: "Kiran Desai", color: "slate", icon: "🛠️" },
];

// All employees across all departments
const ALL_EMPLOYEES: Employee[] = [
  // Stock Building (Home: 8)
  { id: "E001", name: "Ravi Shankar", email: "ravi.s@composite.com", phone: "+91 98765 43210", homeDepartment: "stock-building", currentDepartment: "stock-building", role: "Senior Technician", skills: ["Inventory", "Forklift", "SAP"], status: "active", joinDate: "2020-03-15", experience: "5 years" },
  { id: "E002", name: "Sunil Kumar", email: "sunil.k@composite.com", phone: "+91 98765 43211", homeDepartment: "stock-building", currentDepartment: "stock-building", role: "Store Keeper", skills: ["Inventory", "Documentation"], status: "active", joinDate: "2021-06-20", experience: "3 years" },
  { id: "E003", name: "Mohan Das", email: "mohan.d@composite.com", phone: "+91 98765 43212", homeDepartment: "stock-building", currentDepartment: "machining", role: "Helper", skills: ["Material Handling"], status: "active", joinDate: "2022-01-10", experience: "2 years" },
  { id: "E004", name: "Vijay Reddy", email: "vijay.r@composite.com", phone: "+91 98765 43213", homeDepartment: "stock-building", currentDepartment: "stock-building", role: "Technician", skills: ["Inventory", "Packing"], status: "active", joinDate: "2019-08-05", experience: "6 years" },
  { id: "E005", name: "Anil Prasad", email: "anil.p@composite.com", phone: "+91 98765 43214", homeDepartment: "stock-building", currentDepartment: "assembly", role: "Senior Helper", skills: ["Material Handling", "Loading"], status: "active", joinDate: "2020-11-12", experience: "4 years" },
  
  // Machining (Home: 12)
  { id: "E010", name: "Prakash Yadav", email: "prakash.y@composite.com", phone: "+91 98765 43220", homeDepartment: "machining", currentDepartment: "machining", role: "CNC Operator", skills: ["CNC", "CAD/CAM", "Precision"], status: "active", joinDate: "2018-04-10", experience: "7 years" },
  { id: "E011", name: "Ramesh Nair", email: "ramesh.n@composite.com", phone: "+91 98765 43221", homeDepartment: "machining", currentDepartment: "machining", role: "Senior CNC Operator", skills: ["CNC", "Programming", "Quality Check"], status: "active", joinDate: "2016-02-15", experience: "9 years" },
  { id: "E012", name: "Santosh Pillai", email: "santosh.p@composite.com", phone: "+91 98765 43222", homeDepartment: "machining", currentDepartment: "mold-finishing", role: "Machine Operator", skills: ["Lathe", "Milling"], status: "active", joinDate: "2019-07-20", experience: "5 years" },
  { id: "E013", name: "Ganesh Iyer", email: "ganesh.i@composite.com", phone: "+91 98765 43223", homeDepartment: "machining", currentDepartment: "machining", role: "Technician", skills: ["CNC", "Maintenance"], status: "active", joinDate: "2020-09-01", experience: "4 years" },
  { id: "E014", name: "Mahesh Kulkarni", email: "mahesh.k@composite.com", phone: "+91 98765 43224", homeDepartment: "machining", currentDepartment: "machining", role: "Junior Operator", skills: ["Basic CNC"], status: "training", joinDate: "2023-01-15", experience: "1 year" },
  { id: "E015", name: "Dinesh Patil", email: "dinesh.p@composite.com", phone: "+91 98765 43225", homeDepartment: "machining", currentDepartment: "quality", role: "Quality Liaison", skills: ["Inspection", "CMM"], status: "active", joinDate: "2017-05-10", experience: "8 years" },
  
  // Pattern Finishing (Home: 10)
  { id: "E020", name: "Krishna Murthy", email: "krishna.m@composite.com", phone: "+91 98765 43230", homeDepartment: "pattern-finishing", currentDepartment: "pattern-finishing", role: "Pattern Maker", skills: ["Pattern Design", "Finishing"], status: "active", joinDate: "2017-03-20", experience: "8 years" },
  { id: "E021", name: "Lakshman Rao", email: "lakshman.r@composite.com", phone: "+91 98765 43231", homeDepartment: "pattern-finishing", currentDepartment: "pattern-finishing", role: "Senior Pattern Maker", skills: ["CAD", "Pattern Design", "Mold Making"], status: "active", joinDate: "2015-06-10", experience: "10 years" },
  { id: "E022", name: "Narasimha Reddy", email: "narasimha.r@composite.com", phone: "+91 98765 43232", homeDepartment: "pattern-finishing", currentDepartment: "lamination", role: "Finisher", skills: ["Sanding", "Polishing"], status: "active", joinDate: "2019-11-05", experience: "5 years" },
  { id: "E023", name: "Bhaskar Sharma", email: "bhaskar.s@composite.com", phone: "+91 98765 43233", homeDepartment: "pattern-finishing", currentDepartment: "pattern-finishing", role: "Technician", skills: ["Finishing", "Quality Check"], status: "active", joinDate: "2021-02-15", experience: "3 years" },
  
  // Lamination (Home: 15)
  { id: "E030", name: "Harish Chandra", email: "harish.c@composite.com", phone: "+91 98765 43240", homeDepartment: "lamination", currentDepartment: "lamination", role: "Lamination Lead", skills: ["Composite Layup", "Vacuum Bagging", "Autoclave"], status: "active", joinDate: "2016-08-12", experience: "9 years" },
  { id: "E031", name: "Jagdish Prasad", email: "jagdish.p@composite.com", phone: "+91 98765 43241", homeDepartment: "lamination", currentDepartment: "lamination", role: "Senior Technician", skills: ["Hand Layup", "Resin Systems"], status: "active", joinDate: "2017-04-20", experience: "8 years" },
  { id: "E032", name: "Kishore Kumar", email: "kishore.k@composite.com", phone: "+91 98765 43242", homeDepartment: "lamination", currentDepartment: "lamination", role: "Technician", skills: ["Layup", "Curing"], status: "active", joinDate: "2019-09-10", experience: "5 years" },
  { id: "E033", name: "Lokesh Nath", email: "lokesh.n@composite.com", phone: "+91 98765 43243", homeDepartment: "lamination", currentDepartment: "mold-finishing", role: "Helper", skills: ["Material Prep"], status: "active", joinDate: "2022-03-01", experience: "2 years" },
  { id: "E034", name: "Mukesh Agarwal", email: "mukesh.a@composite.com", phone: "+91 98765 43244", homeDepartment: "lamination", currentDepartment: "lamination", role: "Technician", skills: ["Vacuum Infusion"], status: "active", joinDate: "2020-07-15", experience: "4 years" },
  { id: "E035", name: "Naresh Gupta", email: "naresh.g@composite.com", phone: "+91 98765 43245", homeDepartment: "lamination", currentDepartment: "assembly", role: "Senior Technician", skills: ["Composite Assembly"], status: "active", joinDate: "2018-01-20", experience: "7 years" },
  
  // Mold Finishing (Home: 8)
  { id: "E040", name: "Omkar Singh", email: "omkar.s@composite.com", phone: "+91 98765 43250", homeDepartment: "mold-finishing", currentDepartment: "mold-finishing", role: "Mold Finisher Lead", skills: ["Surface Finishing", "Polishing", "Gel Coat"], status: "active", joinDate: "2016-05-10", experience: "9 years" },
  { id: "E041", name: "Pankaj Verma", email: "pankaj.v@composite.com", phone: "+91 98765 43251", homeDepartment: "mold-finishing", currentDepartment: "mold-finishing", role: "Senior Finisher", skills: ["Mold Repair", "Surface Prep"], status: "active", joinDate: "2018-08-20", experience: "6 years" },
  { id: "E042", name: "Qasim Ali", email: "qasim.a@composite.com", phone: "+91 98765 43252", homeDepartment: "mold-finishing", currentDepartment: "welding", role: "Technician", skills: ["Grinding", "Polishing"], status: "active", joinDate: "2020-02-15", experience: "4 years" },
  
  // Welding (Home: 10)
  { id: "E050", name: "Rajendra Prasad", email: "rajendra.p@composite.com", phone: "+91 98765 43260", homeDepartment: "welding", currentDepartment: "welding", role: "Senior Welder", skills: ["TIG", "MIG", "Aluminum Welding"], status: "active", joinDate: "2015-09-10", experience: "10 years" },
  { id: "E051", name: "Satish Kumar", email: "satish.k@composite.com", phone: "+91 98765 43261", homeDepartment: "welding", currentDepartment: "welding", role: "Welder", skills: ["MIG", "Spot Welding"], status: "active", joinDate: "2018-12-05", experience: "6 years" },
  { id: "E052", name: "Tarun Mehta", email: "tarun.m@composite.com", phone: "+91 98765 43262", homeDepartment: "welding", currentDepartment: "assembly", role: "Technician", skills: ["Welding", "Fabrication"], status: "active", joinDate: "2020-06-20", experience: "4 years" },
  { id: "E053", name: "Umesh Chawla", email: "umesh.c@composite.com", phone: "+91 98765 43263", homeDepartment: "welding", currentDepartment: "welding", role: "Junior Welder", skills: ["Basic Welding"], status: "training", joinDate: "2023-03-10", experience: "1 year" },
  
  // Assembly (Home: 18)
  { id: "E060", name: "Vinod Sharma", email: "vinod.s@composite.com", phone: "+91 98765 43270", homeDepartment: "assembly", currentDepartment: "assembly", role: "Assembly Lead", skills: ["Final Assembly", "Testing", "Documentation"], status: "active", joinDate: "2014-07-15", experience: "11 years" },
  { id: "E061", name: "Waseem Khan", email: "waseem.k@composite.com", phone: "+91 98765 43271", homeDepartment: "assembly", currentDepartment: "assembly", role: "Senior Assembler", skills: ["Mechanical Assembly", "Electrical"], status: "active", joinDate: "2016-11-20", experience: "8 years" },
  { id: "E062", name: "Xavier Fernandes", email: "xavier.f@composite.com", phone: "+91 98765 43272", homeDepartment: "assembly", currentDepartment: "assembly", role: "Technician", skills: ["Assembly", "Fitting"], status: "active", joinDate: "2019-04-10", experience: "5 years" },
  { id: "E063", name: "Yogesh Patel", email: "yogesh.p@composite.com", phone: "+91 98765 43273", homeDepartment: "assembly", currentDepartment: "quality", role: "Quality Checker", skills: ["Inspection", "Testing"], status: "active", joinDate: "2020-08-05", experience: "4 years" },
  { id: "E064", name: "Zaheer Ahmed", email: "zaheer.a@composite.com", phone: "+91 98765 43274", homeDepartment: "assembly", currentDepartment: "assembly", role: "Helper", skills: ["Basic Assembly"], status: "active", joinDate: "2022-05-15", experience: "2 years" },
  
  // CMM (Home: 6)
  { id: "E070", name: "Abhishek Roy", email: "abhishek.r@composite.com", phone: "+91 98765 43280", homeDepartment: "cmm", currentDepartment: "cmm", role: "CMM Programmer", skills: ["CMM Programming", "GD&T", "Metrology"], status: "active", joinDate: "2017-02-10", experience: "8 years" },
  { id: "E071", name: "Bharat Singh", email: "bharat.s@composite.com", phone: "+91 98765 43281", homeDepartment: "cmm", currentDepartment: "cmm", role: "CMM Operator", skills: ["CMM Operation", "Reporting"], status: "active", joinDate: "2019-06-20", experience: "5 years" },
  { id: "E072", name: "Chetan Joshi", email: "chetan.j@composite.com", phone: "+91 98765 43282", homeDepartment: "cmm", currentDepartment: "quality", role: "Quality Analyst", skills: ["Data Analysis", "SPC"], status: "active", joinDate: "2020-10-15", experience: "4 years" },
  
  // Trimline (Home: 8)
  { id: "E080", name: "Devendra Sinha", email: "devendra.s@composite.com", phone: "+91 98765 43290", homeDepartment: "trimline", currentDepartment: "trimline", role: "Trimline Lead", skills: ["CNC Router", "Edge Trimming", "Drilling"], status: "active", joinDate: "2016-04-10", experience: "9 years" },
  { id: "E081", name: "Eknath Patil", email: "eknath.p@composite.com", phone: "+91 98765 43291", homeDepartment: "trimline", currentDepartment: "trimline", role: "Operator", skills: ["Trimming", "Routing"], status: "active", joinDate: "2018-09-20", experience: "6 years" },
  { id: "E082", name: "Farhan Sheikh", email: "farhan.s@composite.com", phone: "+91 98765 43292", homeDepartment: "trimline", currentDepartment: "assembly", role: "Technician", skills: ["Fitting", "Trimming"], status: "active", joinDate: "2021-01-15", experience: "3 years" },
  
  // Quality (Home: 10)
  { id: "E090", name: "Girish Hegde", email: "girish.h@composite.com", phone: "+91 98765 43300", homeDepartment: "quality", currentDepartment: "quality", role: "Quality Manager", skills: ["ISO", "Six Sigma", "Auditing"], status: "active", joinDate: "2013-08-10", experience: "12 years" },
  { id: "E091", name: "Hemant Saxena", email: "hemant.s@composite.com", phone: "+91 98765 43301", homeDepartment: "quality", currentDepartment: "quality", role: "Senior Inspector", skills: ["NDT", "Visual Inspection", "Documentation"], status: "active", joinDate: "2015-11-20", experience: "10 years" },
  { id: "E092", name: "Irfan Malik", email: "irfan.m@composite.com", phone: "+91 98765 43302", homeDepartment: "quality", currentDepartment: "machining", role: "Inspector", skills: ["Dimensional Check", "CMM"], status: "active", joinDate: "2019-03-15", experience: "6 years" },
  { id: "E093", name: "Jayant Kulkarni", email: "jayant.k@composite.com", phone: "+91 98765 43303", homeDepartment: "quality", currentDepartment: "quality", role: "QC Technician", skills: ["Testing", "Reporting"], status: "active", joinDate: "2021-07-10", experience: "3 years" },
  
  // Maintenance (Home: 7)
  { id: "E100", name: "Kailash Nath", email: "kailash.n@composite.com", phone: "+91 98765 43310", homeDepartment: "maintenance", currentDepartment: "maintenance", role: "Maintenance Lead", skills: ["Electrical", "Mechanical", "PLC"], status: "active", joinDate: "2014-05-15", experience: "11 years" },
  { id: "E101", name: "Laxman Deshmukh", email: "laxman.d@composite.com", phone: "+91 98765 43311", homeDepartment: "maintenance", currentDepartment: "maintenance", role: "Electrician", skills: ["Electrical Systems", "Control Panels"], status: "active", joinDate: "2017-08-20", experience: "8 years" },
  { id: "E102", name: "Manish Thakur", email: "manish.t@composite.com", phone: "+91 98765 43312", homeDepartment: "maintenance", currentDepartment: "machining", role: "Mechanic", skills: ["Machine Repair", "Hydraulics"], status: "active", joinDate: "2019-12-10", experience: "5 years" },
  { id: "E103", name: "Nitin Deshpande", email: "nitin.d@composite.com", phone: "+91 98765 43313", homeDepartment: "maintenance", currentDepartment: "maintenance", role: "Technician", skills: ["Preventive Maintenance"], status: "active", joinDate: "2021-04-05", experience: "3 years" },
];

// ==================== COMPONENT ====================
export default function DepartmentDetailPage() {
  const params = useParams();
  const deptId = params.deptId as string;
  
  const [employees, setEmployees] = useState<Employee[]>(ALL_EMPLOYEES);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "here" | "loaned-out" | "loaned-in">("all");
  const [showShuffleModal, setShowShuffleModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [targetDepartment, setTargetDepartment] = useState<string>("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Get current department info
  const department = DEPARTMENTS.find(d => d.id === deptId);

  // Update time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!department) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Department Not Found</h1>
          <Link href="/md/tooling" className="text-blue-400 hover:text-blue-300">
            ← Back to Tooling
          </Link>
        </div>
      </div>
    );
  }

  // ==================== CALCULATIONS ====================
  // Employees whose HOME department is this one
  const homeEmployees = employees.filter(e => e.homeDepartment === deptId);
  
  // Employees currently WORKING in this department
  const workingHere = employees.filter(e => e.currentDepartment === deptId);
  
  // Home employees who are working elsewhere (loaned out)
  const loanedOut = homeEmployees.filter(e => e.currentDepartment !== deptId);
  
  // Employees from other departments working here (loaned in)
  const loanedIn = workingHere.filter(e => e.homeDepartment !== deptId);
  
  // Home employees currently working here
  const homeWorkingHere = homeEmployees.filter(e => e.currentDepartment === deptId);

  // Filter employees based on search and filter
  const getFilteredEmployees = () => {
    let filtered: Employee[] = [];
    
    switch (filterStatus) {
      case "here":
        filtered = workingHere;
        break;
      case "loaned-out":
        filtered = loanedOut;
        break;
      case "loaned-in":
        filtered = loanedIn;
        break;
      default:
        // Show all related employees (home + working here)
        const homeIds = new Set(homeEmployees.map(e => e.id));
        const workingIds = new Set(workingHere.map(e => e.id));
        filtered = employees.filter(e => homeIds.has(e.id) || workingIds.has(e.id));
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.name.toLowerCase().includes(query) ||
        e.id.toLowerCase().includes(query) ||
        e.role.toLowerCase().includes(query) ||
        e.skills.some(s => s.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  };

  // Handle employee shuffle
  const handleShuffle = (employee: Employee) => {
    setSelectedEmployee(employee);
    setTargetDepartment("");
    setShowShuffleModal(true);
  };

  const confirmShuffle = () => {
    if (!selectedEmployee || !targetDepartment) return;
    
    setEmployees(prev => prev.map(e => 
      e.id === selectedEmployee.id 
        ? { ...e, currentDepartment: targetDepartment }
        : e
    ));
    
    setShowShuffleModal(false);
    setSelectedEmployee(null);
    setTargetDepartment("");
  };

  const toggleCardExpand = (id: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getStatusColor = (status: Employee["status"]) => {
    switch (status) {
      case "active": return "bg-emerald-500";
      case "on-leave": return "bg-amber-500";
      case "training": return "bg-blue-500";
    }
  };

  const getDeptName = (id: string) => DEPARTMENTS.find(d => d.id === id)?.name || id;
  const getDeptColor = (id: string) => DEPARTMENTS.find(d => d.id === id)?.color || "zinc";

  const filteredEmployees = getFilteredEmployees();

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800"
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/md/tooling"
                className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{department.icon}</span>
                  <h1 className="text-2xl font-bold">{department.name}</h1>
                </div>
                <p className="text-sm text-zinc-400 mt-1">
                  Supervisor: {department.supervisor}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-zinc-400">
                  {currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <p className="text-lg font-mono text-white">
                  {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="Total Assigned"
            value={homeEmployees.length}
            sub="Home department"
            color="blue"
          />
          <StatCard
            icon={<UserCheck className="w-5 h-5" />}
            label="Working Here"
            value={workingHere.length}
            sub={`${homeWorkingHere.length} home + ${loanedIn.length} borrowed`}
            color="emerald"
          />
          <StatCard
            icon={<UserMinus className="w-5 h-5" />}
            label="Loaned Out"
            value={loanedOut.length}
            sub="Working in other depts"
            color="amber"
          />
          <StatCard
            icon={<UserPlus className="w-5 h-5" />}
            label="Borrowed In"
            value={loanedIn.length}
            sub="From other departments"
            color="purple"
          />
        </motion.div>

        {/* Loaned Out Summary */}
        {loanedOut.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20"
          >
            <h3 className="text-amber-400 font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Employees On Loan to Other Departments
            </h3>
            <div className="flex flex-wrap gap-2">
              {loanedOut.map(emp => (
                <span key={emp.id} className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-sm">
                  {emp.name} → {getDeptName(emp.currentDepartment)}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Borrowed In Summary */}
        {loanedIn.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mb-6 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20"
          >
            <h3 className="text-purple-400 font-semibold mb-2 flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Employees Borrowed from Other Departments
            </h3>
            <div className="flex flex-wrap gap-2">
              {loanedIn.map(emp => (
                <span key={emp.id} className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-sm">
                  {emp.name} ← {getDeptName(emp.homeDepartment)}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Search and Filter Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col md:flex-row gap-4 mb-6"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by name, ID, role, or skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-blue-500 focus:outline-none text-white placeholder-zinc-500"
            />
          </div>
          
          <div className="flex gap-2">
            {[
              { key: "all", label: "All", count: homeEmployees.length + loanedIn.length },
              { key: "here", label: "Working Here", count: workingHere.length },
              { key: "loaned-out", label: "Loaned Out", count: loanedOut.length },
              { key: "loaned-in", label: "Borrowed In", count: loanedIn.length },
            ].map(filter => (
              <button
                key={filter.key}
                onClick={() => setFilterStatus(filter.key as typeof filterStatus)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterStatus === filter.key
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>
        </motion.div>

        {/* Employee Cards */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {filteredEmployees.map((employee, index) => {
              const isHome = employee.homeDepartment === deptId;
              const isHere = employee.currentDepartment === deptId;
              const isExpanded = expandedCards.has(employee.id);
              
              return (
                <motion.div
                  key={employee.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.02 }}
                  className={`rounded-xl border overflow-hidden ${
                    isHome && isHere
                      ? "bg-zinc-900 border-zinc-800"
                      : isHome && !isHere
                      ? "bg-amber-500/5 border-amber-500/20"
                      : "bg-purple-500/5 border-purple-500/20"
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full bg-${getDeptColor(employee.homeDepartment)}-500/20 flex items-center justify-center text-lg font-bold text-${getDeptColor(employee.homeDepartment)}-400`}>
                          {employee.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{employee.name}</h3>
                          <p className="text-sm text-zinc-400">{employee.id} • {employee.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor(employee.status)}`} />
                        <button
                          onClick={() => toggleCardExpand(employee.id)}
                          className="p-1 rounded hover:bg-zinc-700/50 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {isHome && (
                        <span className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs">
                          🏠 Home Dept
                        </span>
                      )}
                      {!isHome && isHere && (
                        <span className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs">
                          📥 From {getDeptName(employee.homeDepartment)}
                        </span>
                      )}
                      {isHome && !isHere && (
                        <span className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs">
                          📤 At {getDeptName(employee.currentDepartment)}
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        employee.status === "active" ? "bg-emerald-500/20 text-emerald-400" :
                        employee.status === "training" ? "bg-blue-500/20 text-blue-400" :
                        "bg-amber-500/20 text-amber-400"
                      }`}>
                        {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
                      </span>
                    </div>

                    {/* Skills */}
                    <div className="flex flex-wrap gap-1 mt-3">
                      {employee.skills.slice(0, isExpanded ? undefined : 3).map(skill => (
                        <span key={skill} className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-xs">
                          {skill}
                        </span>
                      ))}
                      {!isExpanded && employee.skills.length > 3 && (
                        <span className="px-2 py-0.5 text-zinc-500 text-xs">
                          +{employee.skills.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-zinc-800 overflow-hidden"
                      >
                        <div className="p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-zinc-400">
                              <Mail className="w-4 h-4" />
                              <span className="truncate">{employee.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-zinc-400">
                              <Phone className="w-4 h-4" />
                              <span>{employee.phone}</span>
                            </div>
                            <div className="flex items-center gap-2 text-zinc-400">
                              <Calendar className="w-4 h-4" />
                              <span>Joined: {new Date(employee.joinDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                            </div>
                            <div className="flex items-center gap-2 text-zinc-400">
                              <Briefcase className="w-4 h-4" />
                              <span>{employee.experience}</span>
                            </div>
                          </div>

                          {/* Shuffle Button - Only for HR/PM */}
                          <button
                            onClick={() => handleShuffle(employee)}
                            className="w-full mt-2 py-2 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                          >
                            <Shuffle className="w-4 h-4" />
                            Reassign to Another Department
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {filteredEmployees.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No employees found matching your criteria</p>
          </div>
        )}

        {/* Quick Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800"
        >
          <h3 className="text-lg font-semibold mb-4">Quick Navigation</h3>
          <div className="flex flex-wrap gap-3">
            {DEPARTMENTS.filter(d => d.id !== deptId).map(dept => (
              <Link
                key={dept.id}
                href={`/md/tooling/${dept.id}`}
                className={`px-4 py-2 rounded-lg bg-${dept.color}-500/10 text-${dept.color}-400 hover:bg-${dept.color}-500/20 transition-colors text-sm`}
              >
                {dept.icon} {dept.name}
              </Link>
            ))}
          </div>
        </motion.div>
      </main>

      {/* Shuffle Modal */}
      <AnimatePresence>
        {showShuffleModal && selectedEmployee && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowShuffleModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Shuffle className="w-5 h-5 text-blue-400" />
                    Reassign Employee
                  </h2>
                  <button
                    onClick={() => setShowShuffleModal(false)}
                    className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-zinc-800/50 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-lg font-bold text-blue-400">
                      {selectedEmployee.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="font-semibold">{selectedEmployee.name}</h3>
                      <p className="text-sm text-zinc-400">{selectedEmployee.role}</p>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-zinc-400">
                    <p>Home Dept: <span className="text-white">{getDeptName(selectedEmployee.homeDepartment)}</span></p>
                    <p>Currently At: <span className="text-white">{getDeptName(selectedEmployee.currentDepartment)}</span></p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm text-zinc-400">Reassign to Department:</label>
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                    {DEPARTMENTS.map(dept => (
                      <button
                        key={dept.id}
                        onClick={() => setTargetDepartment(dept.id)}
                        disabled={dept.id === selectedEmployee.currentDepartment}
                        className={`p-3 rounded-lg text-left text-sm transition-all ${
                          targetDepartment === dept.id
                            ? "bg-blue-600 text-white"
                            : dept.id === selectedEmployee.currentDepartment
                            ? "bg-zinc-800/30 text-zinc-600 cursor-not-allowed"
                            : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                        }`}
                      >
                        <span className="mr-2">{dept.icon}</span>
                        {dept.name}
                        {dept.id === selectedEmployee.homeDepartment && (
                          <span className="ml-1 text-xs opacity-60">(Home)</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowShuffleModal(false)}
                    className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmShuffle}
                    disabled={!targetDepartment}
                    className="flex-1 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Confirm Reassignment
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==================== SUB-COMPONENTS ====================
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
  color: "blue" | "emerald" | "amber" | "purple";
}

const StatCard = ({ icon, label, value, sub, color }: StatCardProps) => {
  const colorClasses = {
    blue: "from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-400",
    emerald: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 text-emerald-400",
    amber: "from-amber-500/20 to-amber-600/5 border-amber-500/20 text-amber-400",
    purple: "from-purple-500/20 to-purple-600/5 border-purple-500/20 text-purple-400",
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`p-4 rounded-xl bg-gradient-to-br ${colorClasses[color]} border`}
    >
      <div className={`w-10 h-10 rounded-lg bg-${color}-500/20 flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-sm font-medium text-zinc-300">{label}</p>
      <p className="text-xs text-zinc-500 mt-1">{sub}</p>
    </motion.div>
  );
};
