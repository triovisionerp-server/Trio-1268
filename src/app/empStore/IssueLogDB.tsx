import { format } from 'date-fns';
import { FileText, Package, ArrowUpDown, Filter } from 'lucide-react';
import { useState, useMemo } from 'react';
import { DBIssueRecord, DBMaterial } from '@/hooks/useInventoryDataSupabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface IssueLogDBProps {
  records: DBIssueRecord[];
  materials: DBMaterial[];
}

type SortField = 'date' | 'material' | 'team' | 'project' | 'quantity';
type SortDirection = 'asc' | 'desc';

export function IssueLogDB({ records, materials }: IssueLogDBProps) {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const uniqueStatuses = ['issued', 'in_progress', 'completed', 'returned'];

  const getMaterial = (materialId: string) => {
    return materials.find(m => m.id === materialId);
  };

  const uniqueTeams = useMemo(() => {
    const teams = new Set(records.map(r => r.team));
    return Array.from(teams).sort();
  }, [records]);

  const uniqueProjects = useMemo(() => {
    const projects = new Set(records.map(r => r.project));
    return Array.from(projects).sort();
  }, [records]);

  const filteredAndSortedRecords = useMemo(() => {
    let filtered = records;

    if (teamFilter !== 'all') {
      filtered = filtered.filter(r => r.team === teamFilter);
    }

    if (projectFilter !== 'all') {
      filtered = filtered.filter(r => r.project === projectFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    return filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'material':
          const aMat = getMaterial(a.material_id);
          const bMat = getMaterial(b.material_id);
          aValue = aMat?.name || '';
          bValue = bMat?.name || '';
          break;
        case 'team':
          aValue = a.team;
          bValue = b.team;
          break;
        case 'project':
          aValue = a.project;
          bValue = b.project;
          break;
        case 'quantity':
          aValue = a.quantity;
          bValue = b.quantity;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [records, sortField, sortDirection, teamFilter, projectFilter, statusFilter, materials]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  if (records.length === 0) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <Package className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Issue Records Yet</h3>
        <p className="text-muted-foreground">Issue materials to see records here.</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl overflow-hidden animate-slide-up">
      {/* Filters */}
      <div className="p-4 border-b border-border/50 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {uniqueTeams.map(team => (
              <SelectItem key={team} value={team}>{team}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {uniqueProjects.map(project => (
              <SelectItem key={project} value={project}>{project}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {uniqueStatuses.map(status => (
              <SelectItem key={status} value={status}>
                {status.replace('_', ' ').toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto text-sm text-muted-foreground">
          {filteredAndSortedRecords.length} of {records.length} records
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            <TableHead className="text-muted-foreground font-semibold">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('date')}
                className="h-auto p-0 font-semibold hover:bg-transparent"
              >
                Date & Time
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead className="text-muted-foreground font-semibold">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('material')}
                className="h-auto p-0 font-semibold hover:bg-transparent"
              >
                Material
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead className="text-muted-foreground font-semibold">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('team')}
                className="h-auto p-0 font-semibold hover:bg-transparent"
              >
                Team
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead className="text-muted-foreground font-semibold">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('project')}
                className="h-auto p-0 font-semibold hover:bg-transparent"
              >
                Project
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead className="text-muted-foreground font-semibold text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('quantity')}
                className="h-auto p-0 font-semibold hover:bg-transparent"
              >
                Quantity
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead className="text-muted-foreground font-semibold">Status</TableHead>
            <TableHead className="text-muted-foreground font-semibold">Entered By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredAndSortedRecords.map((record) => {
            const material = getMaterial(record.material_id);
            return (
              <TableRow
                key={record.id}
                className="border-border/30 transition-colors hover:bg-accent/30"
              >
                <TableCell className="text-muted-foreground">
                  {format(new Date(record.date), 'dd MMM yyyy, HH:mm')}
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-primary">
                      {material?.code || 'N/A'}
                    </span>
                    <span>{material?.name || 'Unknown'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                    {record.team}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{record.project}</Badge>
                </TableCell>
                <TableCell className="text-right font-semibold text-warning">
                  -{record.quantity.toLocaleString()}{' '}
                  <span className="text-xs text-muted-foreground">{material?.unit}</span>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={`${
                      record.status === 'completed' ? 'bg-green-100 text-green-800 border-green-300' :
                      record.status === 'in_progress' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                      record.status === 'returned' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                      'bg-gray-100 text-gray-800 border-gray-300'
                    }`}
                  >
                    {(record.status || 'issued').replace('_', ' ').toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {record.entered_by}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}