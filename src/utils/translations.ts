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
    subtitle: 'Sistem de Management Consiliere - Biserica Lumina',
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

  // Delete/Deactivate Warnings
  deleteWarnings: {
    deleteCase: 'Șterge Caz',
    deleteCaseConfirm: 'Ești sigur că vrei să ștergi cazul "{title}"? Această acțiune nu poate fi anulată.',
    deleteCounselor: 'Șterge Consilier',
    deleteCounselorConfirm: 'Ești sigur că vrei să ștergi consilierul "{name}"? Această acțiune nu poate fi anulată.',
    deleteCounselorWarning: 'Acest consilier are {count} cazuri alocate. Poți dori să realocezi aceste cazuri înainte de ștergere.',
    deleteAppointment: 'Șterge Programare',
    deleteAppointmentConfirm: 'Ești sigur că vrei să ștergi programarea "{title}"? Această acțiune nu poate fi anulată.',
    thisActionCannotBeUndone: 'Această acțiune nu poate fi anulată'
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
    years: 'ani',
    sex: 'Sex',
    sexMasculin: 'Masculin',
    sexFeminin: 'Feminin',
    sexMasculinAdult: 'Bărbat',
    sexFemininAdult: 'Femeie',
    sexMasculinMinor: 'Băiat',
    sexFemininMinor: 'Fată',
    civilStatus: 'Stare Civilă',
    civilStatusTitle: 'Stare Civilă',
    phoneNumber: 'Număr Telefon',
    description: 'Descriere',
    problemDescription: 'Descriere Problemă',
    status: 'Status',
    issueTypes: 'Tipuri de Problema',
    issueTypesTitle: 'Tipuri de Problemă',
    assignedCounselor: 'Consilier Alocat',
    assignedCounselorTitle: 'Consilier Alocat',
    created: 'Creat',
    createdLabel: 'Creat',
    updated: 'Actualizat',
    viewAllNotes: 'Vezi Toate Notele',
    noDescriptionProvided: 'Nu există descriere',
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
    linkUserAccount: 'Leagă la Cont Utilizator *',
    manageReports: 'Vezi Rapoartele',
    openReports: 'Deschide Rapoarte'
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
    specialtiesTitle: 'Specializări',
    workload: 'Sarcină',
    workloadLevel: {
      low: 'Scăzut',
      moderate: 'Moderat',
      high: 'Ridicat'
    },
    activeCases: 'Cazuri Active',
    activeCasesTitle: 'Cazuri Active',
    waitingCases: 'Cazuri în Așteptare',
    caseSummary: 'Rezumat Cazuri',
    recentCases: 'Cazuri Recente',
    seeHistory: 'Vezi Istoric',
    caseHistory: 'Istoric Cazuri',
    totalCases: 'Cazuri Totale',
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
      createUser: 'Creează Utilizator',
      createNewUser: 'Creează Utilizator Nou',
      fullName: 'Nume Complet',
      email: 'Email',
      role: 'Rol',
      status: 'Status',
      actions: 'Acțiuni',
      name: 'Nume',
      created: 'Creat',
      generatedPassword: 'Parolă Generată',
      passwordHelperText: 'Parola este generată automat pe baza numelui complet',
      copyCredentials: 'Copiază Credențiale',
      updateUser: 'Actualizează Utilizator',
      adminsCannotModifyLeaders: 'Administratorii nu pot modifica conturile liderilor',
      deleteUserTitle: 'Șterge Utilizator',
      deleteUserConfirm: 'Ești sigur că vrei să ștergi permanent acest utilizator? Această acțiune nu poate fi anulată.',
      deleteUserSelfConfirm: 'Ești sigur că vrei să te ștergi permanent? Această acțiune nu poate fi anulată și vei fi deconectat imediat!',
      deactivateUser: 'Dezactivează Utilizator',
      deactivateUserConfirm: 'Ești sigur că vrei să dezactivezi acest utilizator? Nu va putea să se conecteze până când va fi reactivat.',
      cannotDeactivateSelf: 'Nu te poți dezactiva singur',
      adminsCannotDeactivateLeaders: 'Administratorii nu pot dezactiva lideri',
      createUserSuccess: 'Utilizator creat cu succes',
      createUserError: 'Eroare la crearea utilizatorului',
      updateUserSuccess: 'Utilizator actualizat cu succes',
      updateUserError: 'Eroare la actualizarea utilizatorului',
      deleteUserSuccess: 'Utilizator șters cu succes',
      deleteUserError: 'Eroare la ștergerea utilizatorului',
      deactivateUserSuccess: 'Utilizator dezactivat cu succes',
      deactivateUserError: 'Eroare la dezactivarea utilizatorului',
      reactivateUserSuccess: 'Utilizator reactivat cu succes',
      reactivateUserError: 'Eroare la reactivarea utilizatorului'
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
    relational: 'Relațional',
    marriage: 'Căsătorie',
    emotional: 'Emoțional',
    spiritual: 'Spiritual',
    financial: 'Financiar',
    other: 'Altul'
  },

  // Civil Status
  civilStatus: {
    unmarried: 'Necăsătorit/ă',
    single: 'Necăsătorit/ă',
    married: 'Căsătorit/ă',
    divorced: 'Divorțat/ă',
    engaged: 'Logodit/ă',
    widowed: 'Văduv/ă',
    // Gender-specific translations
    masculin: {
      unmarried: 'Necăsătorit',
      married: 'Căsătorit',
      divorced: 'Divorțat',
      engaged: 'Logodit',
      widowed: 'Văduv'
    },
    feminin: {
      unmarried: 'Necăsătorită',
      married: 'Căsătorită',
      divorced: 'Divorțată',
      engaged: 'Logodită',
      widowed: 'Văduvă'
    }
  },

  // Roles
  roles: {
    counselor: 'Consilier',
    admin: 'Administrator',
    leader: 'Lider',
    leaderDescription: {
      createUsers: 'Creează utilizatori noi cu orice rol (lider, admin, consilier)',
      editManageUsers: 'Editează și gestionează toți utilizatorii',
      deactivateReactivateUsers: 'Dezactivează/reactivează orice utilizator',
      deleteUsers: 'Șterge permanent orice utilizator',
      manageCounselorsCases: 'Gestionează consilieri și cazuri',
      fullSystemAccess: 'Acces complet la sistem',
      cannotEditDeleteOwn: 'Nu poți edita sau șterge propriul cont'
    },
    adminDescription: {
      viewAllUsers: 'Vizualizează toți utilizatorii',
      editUsersExceptLeaders: 'Editează utilizatori (cu excepția liderilor)',
      deactivateReactivateExceptLeaders: 'Dezactivează/reactivează utilizatori (cu excepția liderilor)',
      manageCasesCounselors: 'Gestionează cazuri și consilieri',
      accessAdminTools: 'Acces la unelte admin',
      limitedCannotCreateUsers: 'Limitare: Nu poate crea utilizatori sau modifica conturile liderilor'
    },
    counselorDescription: {
      viewOwnCasesOnly: 'Vizualizează doar cazurile alocate',
      addMeetingNotes: 'Adaugă note de ședință pentru cazurile alocate',
      manageOwnAppointments: 'Gestionează propriile programări',
      updateOwnProfile: 'Actualizează propriul profil',
      limitedCannotCreateCases: 'Limitare: Nu poate crea cazuri sau gestiona alți utilizatori'
    }
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
    latestMeetingNote: 'Ultima Notă de Ședință',
    viewAllNotes: 'Vezi Toate Notele',
    allMeetingNotes: 'Toate Notele de Ședință',
    noMeetingNotesYet: 'Nu există note de ședință încă',
    noMeetingNotesAdded: 'Nu există note de ședință adăugate pentru acest caz încă.',
    addNoteSuccess: 'Notă de ședință adăugată cu succes',
    showMore: 'Afișează mai mult',
    showLess: 'Afișează mai puțin',
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

