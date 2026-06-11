import React from 'react';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { t } from '../../utils/translations';

const AdminRoleCards: React.FC = () => (
  <div className="grid gap-4 md:grid-cols-3">
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheckIcon className="h-5 w-5 text-red-500" />
        <h3 className="font-semibold text-slate-900">{t.roles.leader}</h3>
      </div>
      <ul className="space-y-1 text-sm text-slate-600">
        <li>• {t.roles.leaderDescription.createUsers}</li>
        <li>• {t.roles.leaderDescription.editManageUsers}</li>
        <li>• {t.roles.leaderDescription.deactivateReactivateUsers}</li>
        <li>• {t.roles.leaderDescription.deleteUsers}</li>
        <li>• {t.roles.leaderDescription.manageCounselorsCases}</li>
        <li>• {t.roles.leaderDescription.fullSystemAccess}</li>
      </ul>
    </article>

    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheckIcon className="h-5 w-5 text-amber-500" />
        <h3 className="font-semibold text-slate-900">{t.roles.admin}</h3>
      </div>
      <ul className="space-y-1 text-sm text-slate-600">
        <li>• {t.roles.adminDescription.viewAllUsers}</li>
        <li>• {t.roles.adminDescription.editUsersExceptLeaders}</li>
        <li>• {t.roles.adminDescription.deactivateReactivateExceptLeaders}</li>
        <li>• {t.roles.adminDescription.manageCasesCounselors}</li>
        <li>• {t.roles.adminDescription.accessAdminTools}</li>
      </ul>
      <p className="mt-3 text-xs text-slate-500">
        ⚠️ {t.roles.adminDescription.limitedCannotCreateUsers}
      </p>
    </article>

    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheckIcon className="h-5 w-5 text-brand-600" />
        <h3 className="font-semibold text-slate-900">{t.roles.counselor}</h3>
      </div>
      <ul className="space-y-1 text-sm text-slate-600">
        <li>• {t.roles.counselorDescription.viewOwnCasesOnly}</li>
        <li>• {t.roles.counselorDescription.addMeetingNotes}</li>
        <li>• {t.roles.counselorDescription.manageOwnAppointments}</li>
        <li>• {t.roles.counselorDescription.updateOwnProfile}</li>
      </ul>
      <p className="mt-3 text-xs text-slate-500">
        ⚠️ {t.roles.counselorDescription.limitedCannotCreateCases}
      </p>
    </article>
  </div>
);

export default AdminRoleCards;
