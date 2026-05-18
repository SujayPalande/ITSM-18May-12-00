import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Briefcase, Calendar, Link as LinkIcon, X } from 'lucide-react';
import { profileService, UserProfile } from '../services/profileService';

interface ProfileViewerProps {
  engineers: UserProfile[];
  onClose?: () => void;
}

export default function ProfileViewer({ engineers, onClose }: ProfileViewerProps) {
  const [selectedEngineer, setSelectedEngineer] = useState<UserProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (engineers.length > 0 && !selectedEngineer) {
      setSelectedEngineer(engineers[0]);
    }
  }, [engineers]);

  const filteredEngineers = engineers.filter(eng =>
    eng.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eng.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (eng.designation && eng.designation.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!selectedEngineer) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">No engineers found</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Engineer Profiles</h2>
            <p className="text-sm text-gray-600">View engineer information</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        <div className="flex">
          <div className="w-80 border-r border-gray-200 p-4 max-h-[600px] overflow-y-auto">
            <input
              type="text"
              placeholder="Search engineers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 text-sm"
            />
            <div className="space-y-2">
              {filteredEngineers.map(engineer => (
                <button
                  key={engineer.id}
                  onClick={() => setSelectedEngineer(engineer)}
                  className={`w-full text-left p-3 rounded-lg transition ${
                    selectedEngineer.id === engineer.id
                      ? 'bg-blue-50 border-2 border-blue-500'
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {engineer.profile_photo_url ? (
                      <img
                        src={engineer.profile_photo_url}
                        alt={engineer.full_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{engineer.full_name}</p>
                      <p className="text-xs text-gray-600 truncate">{engineer.designation || 'Engineer'}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 p-6 max-h-[600px] overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  {selectedEngineer.profile_photo_url ? (
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200">
                      <img
                        src={selectedEngineer.profile_photo_url}
                        alt={selectedEngineer.full_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900">{selectedEngineer.full_name}</h3>
                  <p className="text-lg text-gray-600">{selectedEngineer.designation || 'Engineer'}</p>
                  <div className="mt-3 space-y-1">
                    <p className="text-sm text-gray-600"><Mail className="w-4 h-4 inline mr-2" />{selectedEngineer.email}</p>
                    <p className="text-sm text-gray-600 capitalize"><strong>Role:</strong> {selectedEngineer.role}</p>
                  </div>
                </div>
              </div>

              {(selectedEngineer.mobile_number || selectedEngineer.phone || selectedEngineer.alternate_number) && (
                <div>
                  <h4 className="text-[15px] font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    Contact Details
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    {selectedEngineer.mobile_number && (
                      <p className="text-sm text-gray-700"><strong>Mobile:</strong> {selectedEngineer.mobile_number}</p>
                    )}
                    {selectedEngineer.phone && (
                      <p className="text-sm text-gray-700"><strong>Work Phone:</strong> {selectedEngineer.phone}</p>
                    )}
                    {selectedEngineer.alternate_number && (
                      <p className="text-sm text-gray-700"><strong>Alternate:</strong> {selectedEngineer.alternate_number}</p>
                    )}
                    {selectedEngineer.personal_email && (
                      <p className="text-sm text-gray-700"><strong>Personal Email:</strong> {selectedEngineer.personal_email}</p>
                    )}
                  </div>
                </div>
              )}

              {(selectedEngineer.address_line1 || selectedEngineer.city) && (
                <div>
                  <h4 className="text-[15px] font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Address
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700">
                      {selectedEngineer.address_line1 && <>{selectedEngineer.address_line1}<br /></>}
                      {selectedEngineer.address_line2 && <>{selectedEngineer.address_line2}<br /></>}
                      {selectedEngineer.city && selectedEngineer.city}
                      {selectedEngineer.state && `, ${selectedEngineer.state}`}
                      {selectedEngineer.pincode && ` - ${selectedEngineer.pincode}`}
                      {selectedEngineer.country && <><br />{selectedEngineer.country}</>}
                    </p>
                  </div>
                </div>
              )}

              {(selectedEngineer.date_of_birth || selectedEngineer.gender) && (
                <div>
                  <h4 className="text-[15px] font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Personal Details
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    {selectedEngineer.date_of_birth && (
                      <p className="text-sm text-gray-700">
                        <strong>Date of Birth:</strong> {new Date(selectedEngineer.date_of_birth).toLocaleDateString()}
                      </p>
                    )}
                    {selectedEngineer.gender && (
                      <p className="text-sm text-gray-700"><strong>Gender:</strong> {selectedEngineer.gender}</p>
                    )}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-[15px] font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Professional Details
                </h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {selectedEngineer.years_of_experience !== null && (
                    <p className="text-sm text-gray-700">
                      <strong>Experience:</strong> {selectedEngineer.years_of_experience} years
                    </p>
                  )}
                  {selectedEngineer.skills && (
                    <div>
                      <p className="text-sm text-gray-700 font-semibold mb-1">Skills & Expertise:</p>
                      <p className="text-sm text-gray-600">{selectedEngineer.skills}</p>
                    </div>
                  )}
                </div>
              </div>

              {(selectedEngineer.linkedin_url || selectedEngineer.portfolio_url) && (
                <div>
                  <h4 className="text-[15px] font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <LinkIcon className="w-5 h-5" />
                    Links
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    {selectedEngineer.linkedin_url && (
                      <p className="text-sm">
                        <strong>LinkedIn:</strong>{' '}
                        <a
                          href={selectedEngineer.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {selectedEngineer.linkedin_url}
                        </a>
                      </p>
                    )}
                    {selectedEngineer.portfolio_url && (
                      <p className="text-sm">
                        <strong>Portfolio:</strong>{' '}
                        <a
                          href={selectedEngineer.portfolio_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {selectedEngineer.portfolio_url}
                        </a>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
