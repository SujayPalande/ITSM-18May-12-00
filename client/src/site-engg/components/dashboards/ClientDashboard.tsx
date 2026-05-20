             {leave ? (
                                <>
                                  <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 text-xs font-semibold">On Leave</span>
                                  {backup && <p className="text-slate-400 text-xs mt-1.5">Backup: {backup.name}</p>}
                                </>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 text-xs font-semibold">Active</span>
                              )}
                            </div>
                          </motion.div>
                        );
                      }) : (
                        <div className="col-span-2 py-16 rounded-xl border border-dashed border-slate-200 bg-white text-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center"><Users className="w-5 h-5 text-amber-400" /></div>
                            <p className="text-slate-500 text-sm font-medium">No engineers assigned yet</p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </div>
                </div>
              )}

              {/* ── ATTENDANCE ── */}
              {tab === 'enterprise' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-slate-700 text-sm font-semibold">Daily Attendance</p>
                    <span className="text-slate-400 text-xs bg-slate-100 px-3 py-1 rounded-full">{checkIns.length} check-ins</span>
                  </div>
                  <div className="space-y-3">
                    {checkIns.length > 0 ? checkIns.map((ci, idx) => {
                      const eng = getEng(ci.engineerId);
                      return (
                        <motion.div key={ci.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                          whileHover={{ y: -2 }}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200 hover:border-amber-200 hover:shadow-sm transition-all">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${ci.checkOutTime ? 'bg-slate-100 border-slate-200' : 'bg-emerald-600 border-emerald-200'}`}>
                              {ci.checkOutTime ? <Clock className="w-4 h-4 text-slate-400" /> : <span className="text-white font-bold text-sm">{eng?.name?.charAt(0) || '?'}</span>}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{eng?.name || 'Unknown'}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">IN: {new Date(ci.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                {ci.checkOutTime ? (
                                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">OUT: {new Date(ci.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                ) : (
                                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />On Site
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {ci.latitude && ci.longitude && (
                            <motion.a href={`https://www.google.com/maps?q=${ci.latitude},${ci.longitude}`} target="_blank" rel="noopener noreferrer"
                              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                              className="flex items-center gap-2 text-amber-700 text-xs font-semibold bg-amber-50 hover:bg-amber-100 px-4 py-2 rounded-lg transition-colors shrink-0 border border-amber-200 group">
                              <MapPin className="w-3.5 h-3.5" />View Map<ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </motion.a>
                          )}
                        </motion.div>
                      );
                    }) : (
                      <div className="py-16 rounded-xl border border-dashed border-slate-200 bg-white text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center"><Clock className="w-5 h-5 text-blue-400" /></div>
                          <p className="text-slate-500 text-sm font-medium">No check-ins for this date</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── REPORTS ── */}
              {tab === 'reports' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-slate-700 text-sm font-semibold">Work Reports</p>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={() => exportToCSV(reports.map(r => { const eng = getEng(r.engineerId); return { Engineer: eng?.name || '', Date: r.date, WorkDone: r.workDone, Issues: r.issues || 'None' }; }), `reports-${client?.name || 'client'}-${selectedDate}`)}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all">
                      <Download className="w-3.5 h-3.5" />Export CSV
                    </motion.button>
                  </div>
                  <div className="space-y-3">
                    {reports.length > 0 ? reports.map((r, idx) => {
                      const eng  = getEng(r.engineerId);
                      const site = r.siteId ? getSite(r.siteId) : null;
                      return (
                        <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                          whileHover={{ y: -2 }}
                          className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-amber-200 hover:shadow-sm transition-all">
                          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50">
                            <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-sm shrink-0">{eng?.name?.charAt(0)}</div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-800 text-sm">{eng?.name || 'Staff'}</p>
                              {site && <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">{site.name}</span>}
                            </div>
                            <span className="text-slate-400 text-xs shrink-0">{new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="px-5 py-4 space-y-2.5">
                            <div>
                              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Work Done</p>
                              <p className="text-slate-600 text-sm leading-relaxed">{r.workDone}</p>
                            </div>
                            {r.issues && (
                              <div className="flex gap-2 bg-red-50 rounded-lg p-3 border border-red-100">
                                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-red-600 text-sm">{r.issues}</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    }) : (
                      <div className="py-16 rounded-xl border border-dashed border-slate-200 bg-white text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center"><FileText className="w-5 h-5 text-violet-400" /></div>
                          <p className="text-slate-500 text-sm font-medium">No reports for this date</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {tab === 'muster' && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 min-h-[500px]">
                  <MusterRoll clientId={client?.id} />
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
