// Romanian translations for the application

export const t = {
  // Common
  common: {
    loading: 'Se încarcă...',
    error: 'Eroare',
    success: 'Succes',
    save: 'Salvează',
    cancel: 'Anulează',
    delete: 'Șterge',
    edit: 'Editează',
    add: 'Adaugă',
    search: 'Caută',
    filter: 'Filtrează',
    close: 'Închide',
    submit: 'Trimite',
    yes: 'Da',
    no: 'Nu',
    back: 'Înapoi',
    next: 'Următor',
    previous: 'Anterior',
    view: 'Vezi',
    viewAll: 'Vezi tot',
    details: 'Detalii',
    actions: 'Acțiuni',
    created: 'Creat',
    updated: 'Actualizat'
  },

  // Navigation
  navigation: {
    dashboard: 'Panou de Control',
    cases: 'Cazuri',
    calendar: 'Calendar',
    counselors: 'Consilieri',
    activity: 'Activitate',
    adminTools: 'Unelte Admin',
    myProfile: 'Profilul Meu',
    logout: 'Deconectare',
    login: 'Conectare',
    signIn: 'Autentificare',
    profile: 'Profil'
  },

  // Login
  login: {
    title: 'Consiliere360',
    subtitle: 'Sistem de Management Consiliere Biserică',
    emailLabel: 'Adresă Email',
    passwordLabel: 'Parolă',
    signInButton: 'Autentificare',
    credentialsError: 'Conectare eșuată. Verifică credențialele.',
    fillFieldsError: 'Completează toate câmpurile',
    contactAdmin: 'Contactează administratorul pentru credențiale'
  },

  // Dashboard
  dashboard: {
    title: 'Panou de Control',
    welcome: 'Bun venit',
    yourPerformance: 'Status cazuri',
    totalCases: 'Cazuri Totale',
    activeCases: 'Active',
    pendingCases: 'În Așteptare',
    completedCases: 'Finalizate',
    upcomingAppointments: 'Programări Următoare',
    recentActivity: 'Activitate Recentă',
    today: 'Astăzi',
    yesterday: 'Ieri',
    daysAgo: 'zile în urmă',
    viewActivityTimeline: 'Vezi Activitatea',
    newCaseAssigned: 'Caz Nou Alocat',
    newCaseAssignedMessage: 'Un caz nou ți-a fost alocat. Te rugăm să revizuiești detaliile cazului și să acționezi conform necesității.',
    seeCase: 'Vezi Cazul',
    noActivities: 'Nu există activități recente',
    noAppointments: 'Nu există programări viitoare',
    upcoming: 'Următoare',
    viewFullProfile: 'Vezi Profil Complet',
    quickActions: 'Acțiuni Rapide',
    viewAllCases: 'Vezi Toate Cazurile',
    scheduleAppointment: 'Programează Întâlnirea',
    updateProfile: 'Actualizează Profil',
    goToCalendar: 'Mergi la Calendar'
  },

  // Cases
  cases: {
    title: 'Cazuri',
    createCase: 'Creează Caz',
    editCase: 'Editează Caz',
    deleteCase: 'Șterge Caz',
    caseDetails: 'Detalii Caz',
    caseTitle: 'Titlu Caz',
    counseledName: 'Nume Persoană Consiliată',
    age: 'Vârstă',
    civilStatus: 'Stare Civilă',
    phoneNumber: 'Număr Telefon',
    description: 'Descriere',
    status: 'Status',
    issueTypes: 'Tipuri de Problema',
    assignedCounselor: 'Consilier Alocat',
    created: 'Creat',
    updated: 'Actualizat',
    viewAllNotes: 'Vezi Toate Notele',
    updateSuccess: 'Caz actualizat cu succes',
    updateError: 'Eroare la actualizarea cazului',
    filters: {
      all: 'Cazuri',
      active: 'Active',
      pending: 'În Așteptare',
      completed: 'Finalizate',
      waiting: 'În Așteptare',
      unfinished: 'Nefinalizate',
      searchPlaceholder: 'Căutați cazuri'
    },
    noCases: 'Nu există cazuri',
    noCasesMessage: 'Nu există cazuri disponibile momentan.',
    viewFullDescription: 'Vezi Descrierea Completă'
  },

  // Admin Tools
  adminTools: {
    title: 'Unelte Admin',
    userManagement: 'Gestionare Utilizatori',
    counselorsManagement: 'Gestionare Consilieri',
    allCasesManagement: 'Gestionare Toate Cazurile',
    addUser: 'Adaugă Utilizator',
    addCounselor: 'Creează Profil',
    addCase: 'Adaugă Caz',
    searchCounselors: 'Caută consilieri...',
    searchCases: 'Caută cazuri...',
    allCounselors: 'Toți Consilierii',
    allStatuses: 'Toate',
    noCounselorsFound: 'Nu există consilieri.',
    noCasesFound: 'Nu există cazuri.',
    noMatchFound: 'Nu se potrivește nimic cu criteriile de căutare.',
    workload: 'Sarcină de Lucru',
    specialty: 'Specialitate',
    cases: 'Cazuri',
    linkUserAccount: 'Leagă la Cont Utilizator *'
  },

  // Appointments
  appointments: {
    title: 'Programări',
    scheduleAppointment: 'Programează Întâlnirea',
    editAppointment: 'Editează Programare',
    deleteAppointment: 'Șterge Programare',
    schedule: 'Programează',
    date: 'Data',
    startTime: 'Ora Start',
    endTime: 'Ora Final',
    duration: 'Durată',
    room: 'Sala',
    client: 'Client',
    counselor: 'Consilier',
    description: 'Descriere',
    status: 'Status',
    calendarView: 'Vizualizare Calendar',
    listView: 'Vizualizare Listă',
    searchPlaceholder: 'Căutați programări',
    filters: {
      all: 'Programări',
      upcoming: 'Următoare',
      past: 'Trecute',
      today: 'Astăzi',
      week: 'Săptămâna Aceasta',
      month: 'Luna Aceasta',
      allCounselors: 'Toți Consilierii'
    },
    noAppointments: 'Nu există programări',
    noAppointmentsMessage: 'Nu există programări disponibile momentan.'
  },

  // Counselors
  counselors: {
    title: 'Consilieri',
    addCounselor: 'Creează Profil',
    editCounselor: 'Editează Consilier',
    deleteCounselor: 'Șterge Consilier',
    fullName: 'Nume Complet',
    email: 'Email',
    phoneNumber: 'Număr Telefon',
    specialties: 'Specializări',
    workload: 'Sarcină',
    workloadLevel: {
      low: 'Scăzut',
      moderate: 'Moderat',
      high: 'Ridicat'
    },
    activeCases: 'Cazuri Active',
    filters: {
      all: 'Toți',
      low: 'Sarcină Scăzută',
      moderate: 'Sarcină Moderată',
      high: 'Sarcină Ridicată'
    },
    noCounselors: 'Nu există consilieri',
    noCounselorsMessage: 'Nu există consilieri disponibili momentan.'
  },

  // Activity Timeline
  activity: {
    title: 'Cronologie Activitate',
    filters: {
      all: 'Toate',
      caseCreated: 'Caz Creat',
      caseStatusChanged: 'Status Caz Schimbat',
      meetingNotesAdded: 'Note Ședință Adăugate',
      appointmentCreated: 'Programare Creată',
      counselorAdded: 'Consilier Adăugat',
      caseAssigned: 'Caz Alocat'
    },
    byCounselor: 'După Consilier',
    byPriority: 'După Prioritate',
    noActivities: 'Nu există activități',
    noActivitiesMessage: 'Nu există activități disponibile momentan.'
  },

  // Profile
  profile: {
    title: 'Profilul Meu',
    personalInfo: 'Informații Personale',
    counselorInfo: 'Informații Consilier',
    fullName: 'Nume Complet',
    email: 'Email',
    phoneNumber: 'Număr Telefon',
    role: 'Rol',
    specialties: 'Specializări',
    performance: 'Performanță',
    summary: 'Rezumat',
    caseSummary: 'Rezumat Cazuri',
    scheduleSummary: 'Rezumat Programări',
    editProfile: 'Editează Profil',
    noSpecialties: 'Nu există specializări adăugate. Click "Editează Profil" pentru a adăuga domeniile tale de expertiză.',
    addSpecialty: 'Adaugă specialitate nouă',
    commonSpecialties: 'Specializări comune (click pentru a adăuga)',
    updateSuccess: 'Profil actualizat cu succes!',
    updateError: 'Eroare la actualizarea profilului',
    loadError: 'Eroare la încărcarea datelor profilului'
  },

  // Admin Tools
  admin: {
    title: 'Unelte Admin',
    subtitle: 'Gestionează utilizatori, consilieri și rolurile lor în sistemul de consiliere.',
    tabs: {
      userManagement: 'Gestionare Utilizatori',
      counselorsManagement: 'Gestionare Consilieri',
      allCases: 'Toate Cazurile'
    },
    users: {
      title: 'Utilizatori',
      addUser: 'Adaugă Utilizator',
      editUser: 'Editează Utilizator',
      deleteUser: 'Șterge Utilizator',
      fullName: 'Nume Complet',
      email: 'Email',
      role: 'Rol',
      status: 'Status',
      actions: 'Acțiuni',
      createUserSuccess: 'Utilizator creat cu succes',
      createUserError: 'Eroare la crearea utilizatorului',
      updateUserSuccess: 'Utilizator actualizat cu succes',
      updateUserError: 'Eroare la actualizarea utilizatorului',
      deleteUserSuccess: 'Utilizator șters cu succes',
      deleteUserError: 'Eroare la ștergerea utilizatorului'
    },
    cases: {
      searchPlaceholder: 'Caută cazuri după nume, status, tip...',
      filters: {
        status: 'Status',
        issueType: 'Tip Problemă',
        allStatuses: 'Toate Statusurile',
        allIssueTypes: 'Toate Tipurile'
      }
    }
  },

  // Statuses
  status: {
    all: 'Toate Cazurile',
    active: 'Active',
    pending: 'În Așteptare',
    completed: 'Finalizate',
    waiting: 'În Așteptare',
    unfinished: 'Nefinalizate',
    cancelled: 'Anulate'
  },

  // Issue Types
  issueTypes: {
    personal: 'Personal',
    family: 'Familie',
    marriage: 'Căsătorie',
    emotional: 'Emoțional',
    spiritual: 'Spiritual',
    financial: 'Financiar',
    other: 'Altul'
  },

  // Civil Status
  civilStatus: {
    single: 'Necăsătorit/ă',
    married: 'Căsătorit/ă',
    divorced: 'Divorțat/ă',
    widowed: 'Văduv/ă'
  },

  // Roles
  roles: {
    counselor: 'Consilier',
    admin: 'Administrator',
    leader: 'Lider'
  },

  // Meeting Notes
  meetingNotes: {
    title: 'Note Ședință',
    addNote: 'Adaugă Notă',
    editNote: 'Editează Notă',
    deleteNote: 'Șterge Notă',
    date: 'Data',
    counselor: 'Consilier',
    content: 'Conținut',
    noNotes: 'Nu există note',
    noNotesMessage: 'Nu există note de ședință încă. Adaugă prima notă pentru a urmări sesiunile de consiliere.',
    latestNote: 'Ultima Notă de Ședință',
    addNoteSuccess: 'Notă de ședință adăugată cu succes',
    addNoteError: 'Eroare la adăugarea notei de ședință',
    deleteNoteSuccess: 'Notă de ședință ștearsă cu succes',
    deleteNoteError: 'Eroare la ștergerea notei de ședință',
    updateSuccess: 'Notă de ședință actualizată cu succes'
  },

  // Validation Errors
  validation: {
    required: 'Acest câmp este obligatoriu',
    emailInvalid: 'Adresa de email este invalidă',
    passwordTooShort: 'Parola este prea scurtă',
    phoneInvalid: 'Numărul de telefon este invalid'
  },

  // Time
  time: {
    today: 'Astăzi',
    yesterday: 'Ieri',
    tomorrow: 'Mâine',
    now: 'Acum',
    justNow: 'Acum',
    minutesAgo: 'minute în urmă',
    hoursAgo: 'ore în urmă',
    daysAgo: 'zile în urmă',
    weeksAgo: 'săptămâni în urmă',
    monthsAgo: 'luni în urmă'
  }
};

