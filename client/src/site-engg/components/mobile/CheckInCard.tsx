import { useState } from 'react';
import { MapPin, CheckCircle, Loader, AlertCircle, ExternalLink, LogOut, Navigation } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { checkInService } from '../../services/checkInService';
import type { CheckIn } from '../../types';

interface CheckInCardProps {
  checkIn: CheckIn | null;
  onCheckInComplete: (checkIn: CheckIn) => void;
  onCheckOutComplete?: () => void;
}

export default function CheckInCard({ checkIn, onCheckInComplete, onCheckOutComplete }: CheckInCardProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckIn() {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      let latitude = 0;
      let longitude = 0;
      let locationName = 'Location unavailable';
      let gotLocation = false;

      if ('geolocation' in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true, timeout: 10000, maximumAge: 120000
            });
          }).catch(async (err) => {
            if (err.code === 3 || err.code === 2) {
              return new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                  enableHighAccuracy: false, timeout: 8000, maximumAge: 300000
                });
              });
            }
            throw err;
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
          gotLocation = true;
        } catch (geoErr: any) {
          if (geoErr.code === 1) throw geoErr;
        }
      }

      if (!gotLocation) {
        try {
          const ipRes = await fetch('https://ipapi.co/json/');
          if (ipRes.ok) {
            const ipData = await ipRes.json();
            latitude = parseFloat(ipData.latitude) || 0;
            longitude = parseFloat(ipData.longitude) || 0;
            locationName = [ipData.city, ipData.region, ipData.country_name].filter(Boolean).join(', ');
            gotLocation = true;
          }
        } catch { /* skip */ }
      }

      if (!gotLocation) {
        try {
          const ipRes2 = await fetch('https://freeipapi.com/api/json');
          if (ipRes2.ok) {
            const ipData2 = await ipRes2.json();
            latitude = parseFloat(ipData2.latitude) || 0;
            longitude = parseFloat(ipData2.longitude) || 0;
            locationName = [ipData2.cityName, ipData2.regionName, ipData2.countryName].filter(Boolean).join(', ');
            gotLocation = true;
          }
        } catch { /* skip */ }
      }

      if (!gotLocation) throw new Error('Could not determine location.');

      if (locationName === 'Location unavailable') {
        locationName = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            locationName = geoData.display_name || locationName;
          }
        } catch { /* keep coords */ }
      }

      const result = await checkInService.createCheckIn(
        (user as any).engineerId || user.id, latitude, longitude, locationName
      );
      onCheckInComplete(result);
    } catch (err: any) {
      setError(err.code === 1 ? 'Location access denied. Enable location in settings.' : (err.message || 'Failed to check in'));
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckOut() {
    if (!checkIn) return;
    setCheckingOut(true);
    setError(null);
    try {
      await checkInService.checkOut(checkIn.id);
      onCheckOutComplete?.();
    } catch (err: any) {
      setError(err.message || 'Check-out failed');
    } finally {
      setCheckingOut(false);
    }
  }

  if (checkIn) {
    const isComplete = !!checkIn.checkOutTime;
    return (
      <div className={`relative overflow-hidden rounded-3xl border shadow-lg ${isComplete ? 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-100' : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200/60'}`}>
        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-16 -mt-16 ${isComplete ? 'bg-slate-200/50' : 'bg-emerald-200/50'}`} />
        <div className="relative p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className={`p-3 rounded-2xl shadow-lg ${isComplete ? 'bg-slate-500 shadow-black/20' : 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-200'}`}>
              <CheckCircle className="w-6 h-6 text-slate-800" />
            </div>
            <div className="flex-1">
              <h3 className={`font-bold text-lg ${isComplete ? 'text-slate-700' : 'text-emerald-900'}`}>
                {isComplete ? 'Session Complete' : 'On Duty'}
              </h3>
              <p className={`text-sm font-semibold mt-0.5 ${isComplete ? 'text-slate-500' : 'text-emerald-400/80/80'}`}>
                In: {new Date(checkIn.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                {checkIn.checkOutTime && ` — Out: ${new Date(checkIn.checkOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
              </p>
            </div>
            {!isComplete && (
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Live</span>
              </div>
            )}
          </div>

          {checkIn.locationName && (
            <div className={`p-3.5 rounded-2xl border mb-4 ${isComplete ? 'bg-white border-slate-100' : 'bg-white/60 backdrop-blur-sm border-emerald-500/10'}`}>
              <div className="flex items-start gap-2.5">
                <MapPin className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isComplete ? 'text-slate-500' : 'text-emerald-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Location</p>
                  <p className="text-xs text-slate-600 leading-relaxed truncate">{checkIn.locationName}</p>
                  {checkIn.latitude && checkIn.longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${checkIn.latitude},${checkIn.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-400 mt-2 hover:text-blue-800 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" /> Open Maps
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Check Out Button */}
          {!isComplete && (
            <button
              onClick={handleCheckOut}
              disabled={checkingOut}
              className="w-full py-4 bg-gradient-to-r from-rose-600 to-red-600 text-slate-800 rounded-2xl font-bold hover:shadow-xl hover:shadow-red-300/30 transition-all flex items-center justify-center gap-3 active:scale-[0.97] disabled:opacity-50"
            >
              {checkingOut ? (
                <><Loader className="w-5 h-5 animate-spin" /> Checking Out...</>
              ) : (
                <><LogOut className="w-5 h-5" /> Check Out</>
              )}
            </button>
          )}
          {error && (
            <div className="flex items-start gap-2 mt-3 p-3 bg-red-500/[0.06] rounded-xl border border-red-100">
              <AlertCircle className="w-4 h-4 text-red-400/80 mt-0.5 shrink-0" />
              <p className="text-xs font-medium text-red-700">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-white rounded-3xl border border-slate-100">
      <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/[0.08]/40 rounded-full blur-3xl -mr-20 -mt-20" />
      <div className="relative p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-200">
            <MapPin className="w-6 h-6 text-slate-800" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Daily Attendance</h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">GPS-verified check-in</p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 mb-5 p-4 bg-red-500/[0.06] rounded-2xl border border-red-100">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        )}

        <button
          onClick={handleCheckIn}
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-slate-800 font-bold py-4.5 rounded-2xl hover:shadow-xl hover:shadow-blue-300/30 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
        >
          {loading ? (
            <><Loader className="w-5 h-5 animate-spin" /> Verifying Location...</>
          ) : (
            <><Navigation className="w-5 h-5 group-hover:rotate-45 transition-transform" /> Check In Now</>
          )}
        </button>
        <p className="text-[10px] font-bold text-slate-500 mt-4 text-center uppercase tracking-widest">
          GPS Authentication Required
        </p>
      </div>
    </div>
  );
}
