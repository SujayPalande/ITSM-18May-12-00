import { useState, useEffect } from 'react';
import { Building2, MapPin, FileText, Download, Filter, Calendar, Loader, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { exportToCSV } from '../../lib/export';

interface ClientWiseEngineer {
  engineerId: string;
  engineerName: string;
  designation: string;
  clientId: string;
  clientName: string;
  siteId: string;
  siteName: string;
  todayCheckedIn: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  lastLocation?: string;
  hasReport: boolean;
  reportWorkDone?: string;
  reportIssues?: string;
}

export default function MobileClientWiseView() {
  const [clientWiseData, setClientWiseData] = useState<ClientWiseEngineer[]>([]);
  const [filteredData, setFilteredData] = useState<ClientWiseEngineer[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [engineers, setEngineers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedEngineer, setSelectedEngineer] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  useEffect(() => {
    applyFilters();
  }, [selectedClient, selectedEngineer, clientWiseData]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [assignmentsRes, checkInsRes, reportsRes, clientsRes, engineersRes] = await Promise.all([
        apiClient.get('/assignments'),
        apiClient.get(`/check-ins?date=${selectedDate}`),
        apiClient.get(`/reports?date=${selectedDate}`),
        apiClient.get('/clients'),
        apiClient.get('/engineers')
      ]);

      const assignments = assignmentsRes || [];
      const checkIns = checkInsRes || [];
      const reports = reportsRes || [];
      const clientsList = clientsRes || [];
      const engineersList = engineersRes || [];

      setClients(clientsList);
      setEngineers(engineersList);

      const clientWiseEngineers: ClientWiseEngineer[] = assignments
        .filter((assignment: any) => assignment.is_active)
        .map((assignment: any) => {
          const engineer = engineersList.find((e: any) => e.id === assignment.engineer_id);
          const client = clientsList.find((c: any) => c.id === assignment.client_id);
          const checkIn = checkIns.find((ci: any) => ci.engineer_id === assignment.engineer_id);
          const report = reports.find((r: any) =>
            r.engineer_id === assignment.engineer_id &&
            r.client_id === assignment.client_id
          );

          return {
            engineerName: engineer?.name || 'Unknown',
            designation: engineer?.designation || 'Engineer',
            clientId: assignment.clientId,
            clientName: client?.name || 'Unknown Client',
            siteId: assignment.siteId,
            siteName: assignment.siteName || 'N/A',
            todayCheckedIn: !!checkIn,
            checkInTime: checkIn?.checkInTime,
            checkOutTime: checkIn?.checkOutTime,
            lastLocation: checkIn?.locationName || 'No location',
            hasReport: !!report,
            reportWorkDone: report?.workDone,
            reportIssues: report?.issues
          };
        });

      setClientWiseData(clientWiseEngineers);
      setFilteredData(clientWiseEngineers);
    } catch (error) {
      console.error('Error fetching client-wise data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...clientWiseData];

    if (selectedClient !== 'all') {
      filtered = filtered.filter(item => item.clientId === selectedClient);
    }

    if (selectedEngineer !== 'all') {
      filtered = filtered.filter(item => item.engineerId === selectedEngineer);
    }

    setFilteredData(filtered);
  };

  const handleExport = () => {
    const exportData = filteredData.map(item => ({
      'Engineer Name': item.engineerName,
      'Designation': item.designation,
      'Client Name': item.clientName,
      'Site Name': item.siteName,
      'Check-in Status': item.todayCheckedIn ? 'Checked In' : 'Not Checked In',
      'Check-in Time': item.checkInTime ? new Date(item.checkInTime).toLocaleTimeString() : '-',
      'Check-out Time': item.checkOutTime ? new Date(item.checkOutTime).toLocaleTimeString() : '-',
      'Last Location': item.lastLocation,
      'Report Status': item.hasReport ? 'Submitted' : 'Pending',
      'Work Done': item.reportWorkDone || '-',
      'Issues': item.reportIssues || '-'
    }));

    const fileName = `client-wise-engineers-${selectedDate}`;
    exportToCSV(exportData, fileName);
  };

  const groupedByClient = filteredData.reduce((acc, item) => {
    if (!acc[item.clientId]) {
      acc[item.clientId] = {
        clientName: item.clientName,
        engineers: []
      };
    }
    acc[item.clientId].engineers.push(item);
    return acc;
  }, {} as Record<string, { clientName: string; engineers: ClientWiseEngineer[] }>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader className="w-12 h-12 text-emerald-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading client data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold transition-colors active:bg-slate-200"
        >
          <Filter className="w-4 h-4" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
        <button
          onClick={handleExport}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-slate-800 rounded-xl text-sm font-bold shadow-lg shadow-emerald-100 transition-all active:scale-95"
        >
          <Download className="w-4 h-4" />
          Export Data
        </button>
      </div>

      {showFilters && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 border border-slate-100 animate-in fade-in slide-in-from-top-2">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Filter by Client
            </label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-sm font-medium"
            >
              <option value="all">All Active Clients</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Filter by Engineer
            </label>
            <select
              value={selectedEngineer}
              onChange={(e) => setSelectedEngineer(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-sm font-medium"
            >
              <option value="all">All Engineers</option>
              {engineers.map(engineer => (
                <option key={engineer.id} value={engineer.id}>
                  {engineer.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Viewing Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-sm font-medium"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-500/10/50">
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Total Engineers</p>
          <p className="text-2xl font-black text-emerald-900">{filteredData.length}</p>
        </div>
        <div className="bg-indigo-500/[0.06]/50 rounded-2xl p-4 border border-blue-100/50">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Reports Today</p>
          <p className="text-2xl font-black text-blue-900">
            {filteredData.filter(e => e.hasReport).length}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedByClient).length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center border border-slate-100">
            <div className="bg-slate-50 rounded-2xl p-4 inline-block mb-4">
              <Building2 className="w-12 h-12 text-slate-800/15" />
            </div>
            <p className="font-bold text-slate-800 text-lg">No Active Deployments</p>
            <p className="text-sm font-medium text-slate-500 mt-1">There are no engineers assigned to clients at this time.</p>
          </div>
        ) : (
          Object.entries(groupedByClient).map(([clientId, { clientName, engineers: clientEngineers }]) => (
            <div key={clientId} className="bg-white rounded-3xl overflow-hidden border border-slate-100 transition-all active:scale-[0.99]">
              <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl">
                      <Building2 className="w-6 h-6 text-slate-800" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 text-xl tracking-tight">{clientName}</h3>
                      <p className="text-emerald-100/80 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                        {clientEngineers.length} active {clientEngineers.length === 1 ? 'deployment' : 'deployments'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-white/[0.03] bg-slate-50/30">
                {clientEngineers.map((engineer, idx) => (
                  <div key={idx} className="p-5">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <p className="font-bold text-slate-800 text-base leading-tight">{engineer.engineerName}</p>
                        <p className="text-xs font-bold text-emerald-400 mt-1 uppercase tracking-wider">{engineer.designation}</p>
                        <div className="flex items-center gap-1.5 mt-2 text-slate-500">
                          <MapPin className="w-3.5 h-3.5" />
                          <p className="text-xs font-medium">{engineer.siteName}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 items-end">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          engineer.todayCheckedIn ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {engineer.todayCheckedIn ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {engineer.todayCheckedIn ? 'Present' : 'Absent'}
                        </div>
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          engineer.hasReport ? 'bg-indigo-500/[0.08] text-blue-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {engineer.hasReport ? <FileText className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {engineer.hasReport ? 'Reported' : 'Pending'}
                        </div>
                      </div>
                    </div>

                    {engineer.todayCheckedIn && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-3 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {engineer.checkInTime && (
                            <div>
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Check In</p>
                              <p className="text-xs font-bold text-slate-600">
                                {new Date(engineer.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          )}
                          {engineer.checkOutTime && (
                            <div className="border-l border-slate-100 pl-4">
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Check Out</p>
                              <p className="text-xs font-bold text-slate-600">
                                {new Date(engineer.checkOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                           <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">GPS Location</p>
                           <p className="text-[10px] font-medium text-slate-500 truncate max-w-[120px]">{engineer.lastLocation}</p>
                        </div>
                      </div>
                    )}

                    {engineer.hasReport && (
                      <button
                        onClick={() => setExpandedReport(
                          expandedReport === engineer.engineerId ? null : engineer.engineerId
                        )}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-50 text-emerald-400/80 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-colors border border-slate-100"
                      >
                        <FileText className="w-4 h-4" />
                        {expandedReport === engineer.engineerId ? 'Collapse Report' : 'Full Report Details'}
                      </button>
                    )}

                    {expandedReport === engineer.engineerId && engineer.hasReport && (
                      <div className="mt-3 p-4 bg-emerald-500/[0.04] rounded-2xl border border-emerald-500/10 animate-in slide-in-from-top-2">
                        <div className="mb-4">
                          <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">
                            Summary of Work:
                          </h4>
                          <p className="text-sm text-slate-600 font-medium leading-relaxed">
                            {engineer.reportWorkDone}
                          </p>
                        </div>
                        {engineer.reportIssues && engineer.reportIssues !== 'None' && (
                          <div className="pt-3 border-t border-red-50">
                            <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Reported Site Issues:
                            </h4>
                            <p className="text-sm text-red-400 font-bold leading-relaxed bg-red-500/[0.06]/50 p-2 rounded-lg">
                              {engineer.reportIssues}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
